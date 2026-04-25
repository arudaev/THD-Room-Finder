#!/usr/bin/env python3
"""Export raw and student-facing THabella data for inspection."""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from thd_room_normalization import RoomPresentationFormatter

BASE_URL = "https://thabella.th-deg.de/thabella/opn"
REMOTE_DATE_TIME_FORMAT = "%Y-%m-%d %H:%M"
FILE_STAMP_FORMAT = "%Y%m%d-%H%M"
INPUT_STAMP_FORMAT = "%Y%m%d-%H%M"
SUMMARY_SAMPLE_LIMIT = 25


@dataclass(frozen=True)
class Room:
    id: int
    ident: str
    name: str
    building: str
    floor: int | None
    display_name: str
    seats_regular: int
    seats_exam: int
    facilities: list[str]
    bookable: bool
    in_charge_name: str | None
    in_charge_email: str | None
    untis_longname: str | None


@dataclass(frozen=True)
class ScheduledEvent:
    id: int
    room_ident: str
    room_name: str
    start_date_time: datetime
    end_date_time: datetime
    duration_minutes: int
    event_type: str
    title: str
    title_source: str


@dataclass(frozen=True)
class FreeRoom:
    room: Room
    free_until: datetime | None


def main() -> int:
    args = parse_args()
    query_date_time = resolve_query_date_time(args.date_time, args.input_dir)
    output_dir = resolve_output_dir(args.output_dir, args.input_dir, query_date_time)
    formatter = RoomPresentationFormatter.load_from_repo_root()

    try:
        rooms_raw, periods_raw, source_description = load_source_payloads(
            input_dir=args.input_dir,
            query_date_time=query_date_time,
            timeout_seconds=args.timeout_seconds,
        )
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1

    rooms = sorted((room_from_raw(item) for item in rooms_raw), key=lambda room: room.name.casefold())
    events = build_events(periods_raw)
    free_rooms = build_free_rooms(rooms, events, query_date_time)
    room_by_ident = {room.ident: room for room in rooms}
    events_by_room_ident = group_events_by_room_ident(events)

    presented_rooms = [
        {
            "room": room,
            "presentation": formatter.present_room(room),
        }
        for room in rooms
    ]

    default_room_list = formatter.build_room_list_presentation(
        free_rooms=free_rooms,
        selected_campus_key="deggendorf",
        selected_group_key=None,
        visibility_mode="teaching_only",
    )

    rollups = build_rollups(
        presented_rooms=presented_rooms,
        free_room_idents={free_room.room.ident for free_room in free_rooms},
    )
    room_label_review = build_room_label_review(presented_rooms)
    excluded_rooms = build_excluded_rooms(room_label_review)
    review_needed_rooms = build_review_needed_rooms(room_label_review)

    write_json(output_dir / "raw" / "rooms.json", rooms_raw)
    write_json(output_dir / "raw" / "periods.json", periods_raw)
    write_json(
        output_dir / "normalized" / "rooms.json",
        [
            {
                "room": serialize_room(entry["room"]),
                "presentation": formatter.serialize_presentation(entry["presentation"]),
            }
            for entry in presented_rooms
        ],
    )
    write_json(
        output_dir / "normalized" / "events.json",
        [serialize_event(event, formatter) for event in events],
    )
    write_json(output_dir / "normalized" / "rollups.json", rollups)

    write_json(
        output_dir / "app" / "home.json",
        build_home_view(
            rooms=rooms,
            free_rooms=free_rooms,
            default_room_list=default_room_list,
            query_date_time=query_date_time,
            rollups=rollups,
        ),
    )
    write_json(
        output_dir / "app" / "room-list.json",
        build_room_list_view(
            formatter=formatter,
            free_rooms=free_rooms,
            query_date_time=query_date_time,
            selected_campus_key="deggendorf",
            selected_group_key=None,
            visibility_mode="teaching_only",
        ),
    )
    write_room_detail_exports(
        output_dir=output_dir / "app" / "room-details",
        rooms=rooms,
        events_by_room_ident=events_by_room_ident,
        query_date_time=query_date_time,
        formatter=formatter,
    )

    audit_payload = build_audit_report(
        rooms=rooms,
        periods_raw=periods_raw,
        events=events,
        room_by_ident=room_by_ident,
        free_rooms=free_rooms,
        rollups=rollups,
        room_label_review=room_label_review,
        review_needed_rooms=review_needed_rooms,
        excluded_rooms=excluded_rooms,
        default_room_list=default_room_list,
        query_date_time=query_date_time,
        source_description=source_description,
    )
    write_json(output_dir / "audit" / "data-quality.json", audit_payload)
    write_json(output_dir / "audit" / "room-label-review.json", room_label_review)
    write_json(output_dir / "audit" / "excluded-rooms.json", excluded_rooms)
    write_json(output_dir / "audit" / "unmapped-names.json", review_needed_rooms)
    write_text(
        output_dir / "summary.md",
        build_markdown_summary(
            audit_payload=audit_payload,
            room_label_review=room_label_review,
            review_needed_rooms=review_needed_rooms,
        ),
    )

    print(f"Exported THabella snapshot to {output_dir}")
    print(f"- Source: {source_description}")
    print(f"- Query date/time: {format_remote_date_time(query_date_time)}")
    print(f"- Raw rooms: {len(rooms_raw)}")
    print(f"- Raw periods: {len(periods_raw)}")
    print(f"- Expanded events: {len(events)}")
    print(f"- Free rooms: {len(free_rooms)}")
    print(f"- Default Deggendorf teaching rooms: {len(default_room_list.visible_rooms)}")
    print(f"- Room list view: {output_dir / 'app' / 'room-list.json'}")
    print(f"- Label review: {output_dir / 'audit' / 'room-label-review.json'}")
    print(f"- Unmapped/review rooms: {output_dir / 'audit' / 'unmapped-names.json'}")
    print(f"- Summary: {output_dir / 'summary.md'}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Pull THabella room and schedule data, normalize it with the shared taxonomy, "
            "and export student-facing views plus audit artifacts."
        )
    )
    parser.add_argument(
        "--date-time",
        help=(
            "Query time in THD local format 'YYYY-MM-DD HH:MM'. "
            "Required when replaying a raw snapshot that does not include a timestamp in its path."
        ),
    )
    parser.add_argument(
        "--output-dir",
        help=(
            "Where to write the export. Defaults to the input snapshot root when --input-dir is used, "
            "otherwise build/thabella-snapshot/<query-time-stamp>."
        ),
    )
    parser.add_argument(
        "--input-dir",
        help=(
            "Replay an existing raw snapshot instead of fetching live data. "
            "Accepts either a snapshot root that contains raw/rooms.json and raw/periods.json "
            "or the raw directory itself."
        ),
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=30,
        help="HTTP timeout for each live THabella request.",
    )
    return parser.parse_args()


def resolve_query_date_time(value: str | None, input_dir: str | None) -> datetime:
    if value:
        return datetime.strptime(value, REMOTE_DATE_TIME_FORMAT)
    if input_dir:
        inferred = infer_query_date_time_from_path(Path(input_dir))
        if inferred is not None:
            return inferred
        raise RuntimeError(
            "Could not infer the snapshot timestamp from --input-dir. "
            "Please pass --date-time 'YYYY-MM-DD HH:MM'."
        )
    now = datetime.now().astimezone().replace(second=0, microsecond=0)
    return now.replace(tzinfo=None)


def infer_query_date_time_from_path(path: Path) -> datetime | None:
    candidates = [path.resolve()]
    candidates.extend(path.resolve().parents)
    for candidate in candidates:
        match = re.search(r"(\d{8}-\d{4})", candidate.name)
        if match:
            return datetime.strptime(match.group(1), INPUT_STAMP_FORMAT)
    return None


def resolve_output_dir(output_dir: str | None, input_dir: str | None, query_date_time: datetime) -> Path:
    if output_dir:
        return Path(output_dir).resolve()
    if input_dir:
        input_path = Path(input_dir).resolve()
        raw_dir = resolve_raw_input_dir(input_path)
        return raw_dir.parent
    return Path("build") / "thabella-snapshot" / query_date_time.strftime(FILE_STAMP_FORMAT)


def resolve_raw_input_dir(path: Path) -> Path:
    direct_rooms = path / "rooms.json"
    direct_periods = path / "periods.json"
    if direct_rooms.exists() and direct_periods.exists():
        return path

    nested_rooms = path / "raw" / "rooms.json"
    nested_periods = path / "raw" / "periods.json"
    if nested_rooms.exists() and nested_periods.exists():
        return path / "raw"

    raise RuntimeError(
        f"Could not find rooms.json and periods.json under {path}. "
        "Pass a snapshot root or raw snapshot directory."
    )


def load_source_payloads(
    input_dir: str | None,
    query_date_time: datetime,
    timeout_seconds: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    if input_dir:
        raw_dir = resolve_raw_input_dir(Path(input_dir).resolve())
        try:
            rooms_raw = json.loads((raw_dir / "rooms.json").read_text(encoding="utf-8"))
            periods_raw = json.loads((raw_dir / "periods.json").read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise RuntimeError(f"Could not parse JSON from {raw_dir}: {error}") from error
        return rooms_raw, periods_raw, f"replayed raw snapshot from {raw_dir}"

    rooms_raw = post_json("room/findRooms", {}, timeout_seconds=timeout_seconds)
    periods_raw = post_json(
        f"period/findByDate/{urllib.parse.quote(format_remote_date_time(query_date_time))}",
        {"sqlDate": format_remote_date_time(query_date_time)},
        timeout_seconds=timeout_seconds,
    )
    return rooms_raw, periods_raw, "live THabella API"


def format_remote_date_time(value: datetime) -> str:
    return value.strftime(REMOTE_DATE_TIME_FORMAT)


def post_json(path: str, payload: dict[str, Any], timeout_seconds: int) -> Any:
    request = urllib.request.Request(
        url=f"{BASE_URL}/{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"THabella returned HTTP {error.code} for '{path}': {body}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Could not reach THabella for '{path}': {error.reason}") from error


def room_from_raw(item: dict[str, Any]) -> Room:
    name = str(item.get("name") or "").strip()
    in_charge = item.get("inCharge") or {}

    return Room(
        id=int(item["id"]),
        ident=str(item.get("ident") or "").strip(),
        name=name,
        building=parse_building(name),
        floor=parse_floor(name),
        display_name=parse_display_name(name),
        seats_regular=int(item.get("seatsRegular") or 0),
        seats_exam=int(item.get("seatsExam") or 0),
        facilities=parse_facilities(item.get("facilities")),
        bookable=bool(item.get("bookable") or False),
        in_charge_name=join_non_blank(in_charge.get("firstname"), in_charge.get("lastname")),
        in_charge_email=normalize_optional_string(in_charge.get("email")),
        untis_longname=normalize_optional_string(item.get("untisLongname")),
    )


def build_events(periods_raw: list[dict[str, Any]]) -> list[ScheduledEvent]:
    events: list[ScheduledEvent] = []
    for period in periods_raw:
        start_date_time = parse_period_start(period.get("startDateTime"))
        if start_date_time is None:
            continue

        duration_minutes = int(period.get("duration") or 0)
        end_date_time = start_date_time + timedelta(minutes=duration_minutes)
        event_type = normalize_optional_string(period.get("eventTypeDescription")) or "Unknown"
        title_text = normalize_optional_string(period.get("titleText"))
        title = title_text or event_type
        title_source = "titleText" if title_text else "eventTypeDescription"

        room_ident_map = period.get("room_ident") or {}
        for room_ident, room_name in room_ident_map.items():
            events.append(
                ScheduledEvent(
                    id=int(period["id"]),
                    room_ident=str(room_ident),
                    room_name=str(room_name).strip(),
                    start_date_time=start_date_time,
                    end_date_time=end_date_time,
                    duration_minutes=duration_minutes,
                    event_type=event_type,
                    title=title,
                    title_source=title_source,
                )
            )

    return sorted(events, key=lambda event: (event.start_date_time, event.room_ident, event.id))


def parse_period_start(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(str(value), REMOTE_DATE_TIME_FORMAT)
    except ValueError:
        return None


def build_free_rooms(
    rooms: list[Room],
    events: list[ScheduledEvent],
    query_date_time: datetime,
) -> list[FreeRoom]:
    occupied_room_idents = {
        event.room_ident
        for event in events
        if event.start_date_time <= query_date_time < event.end_date_time
    }

    free_rooms: list[FreeRoom] = []
    for room in rooms:
        if room.ident in occupied_room_idents:
            continue

        next_event = min(
            (
                event
                for event in events
                if event.room_ident == room.ident and event.start_date_time > query_date_time
            ),
            key=lambda event: event.start_date_time,
            default=None,
        )
        free_rooms.append(
            FreeRoom(
                room=room,
                free_until=next_event.start_date_time if next_event else None,
            )
        )

    return sorted(free_rooms, key=lambda free_room: free_room.room.name.casefold())


def group_events_by_room_ident(events: list[ScheduledEvent]) -> dict[str, list[ScheduledEvent]]:
    grouped: dict[str, list[ScheduledEvent]] = defaultdict(list)
    for event in events:
        grouped[event.room_ident].append(event)
    for room_ident in grouped:
        grouped[room_ident].sort(key=lambda event: (event.start_date_time, event.id))
    return dict(grouped)


def build_rollups(
    presented_rooms: list[dict[str, Any]],
    free_room_idents: set[str],
) -> dict[str, Any]:
    rollups = {
        "campuses": build_rollup_entries(
            presented_rooms,
            free_room_idents,
            key_fn=lambda entry: entry["presentation"].location.campus_key,
            label_fn=lambda entry: entry["presentation"].location.campus,
        ),
        "sites": build_rollup_entries(
            presented_rooms,
            free_room_idents,
            key_fn=lambda entry: entry["presentation"].location.site_key,
            label_fn=lambda entry: entry["presentation"].location.site,
        ),
        "groups": build_rollup_entries(
            presented_rooms,
            free_room_idents,
            key_fn=lambda entry: entry["presentation"].location.group_key,
            label_fn=lambda entry: entry["presentation"].location.group_label,
        ),
    }
    rollups["visibilityClasses"] = sorted(
        (
            {
                "key": visibility_class,
                "count": count,
            }
            for visibility_class, count in Counter(
                entry["presentation"].location.visibility_class
                for entry in presented_rooms
            ).items()
        ),
        key=lambda item: item["key"],
    )
    return rollups


def build_rollup_entries(
    presented_rooms: list[dict[str, Any]],
    free_room_idents: set[str],
    key_fn: Any,
    label_fn: Any,
) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in presented_rooms:
        grouped[key_fn(entry)].append(entry)

    payload: list[dict[str, Any]] = []
    for key, items in grouped.items():
        visibility_counts = Counter(
            item["presentation"].location.visibility_class for item in items
        )
        payload.append(
            {
                "key": key,
                "label": label_fn(items[0]),
                "totalRooms": len(items),
                "freeNowRooms": sum(1 for item in items if item["room"].ident in free_room_idents),
                "teachingRooms": visibility_counts.get("teaching_room", 0),
                "secondaryVenues": visibility_counts.get("secondary_venue", 0),
                "excludedByDefault": visibility_counts.get("exclude_default", 0),
                "unknownRooms": visibility_counts.get("unknown", 0),
            }
        )

    return sorted(payload, key=lambda item: (item["label"].casefold(), item["key"]))


def build_room_label_review(presented_rooms: list[dict[str, Any]]) -> list[dict[str, Any]]:
    review_rows: list[dict[str, Any]] = []
    for entry in presented_rooms:
        room = entry["room"]
        presentation = entry["presentation"]
        review_rows.append(
            {
                "ident": room.ident,
                "rawName": room.name,
                "primaryLabel": presentation.primary_label,
                "secondaryLabel": presentation.secondary_label,
                "detailPath": presentation.location.detail_path,
                "campusKey": presentation.location.campus_key,
                "campus": presentation.location.campus,
                "siteKey": presentation.location.site_key,
                "site": presentation.location.site,
                "buildingKey": presentation.location.building_key,
                "building": presentation.location.building,
                "groupKey": presentation.location.group_key,
                "groupLabel": presentation.location.group_label,
                "roomCode": presentation.location.room_code,
                "roomKind": presentation.location.room_kind,
                "visibilityClass": presentation.location.visibility_class,
                "friendlyRoomKind": presentation.friendly_room_kind,
                "showByDefault": presentation.location.visibility_class == "teaching_room",
                "room": serialize_room(room),
            }
        )

    return sorted(
        review_rows,
        key=lambda row: (row["campus"], row["groupLabel"], row["primaryLabel"], row["rawName"]),
    )


def build_excluded_rooms(room_label_review: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in room_label_review:
        if row["showByDefault"]:
            continue
        grouped[row["visibilityClass"]].append(
            {
                "ident": row["ident"],
                "rawName": row["rawName"],
                "primaryLabel": row["primaryLabel"],
                "secondaryLabel": row["secondaryLabel"],
                "detailPath": row["detailPath"],
                "roomKind": row["roomKind"],
            }
        )

    return {
        key: sorted(
            value,
            key=lambda item: (item["detailPath"], item["primaryLabel"], item["rawName"]),
        )
        for key, value in sorted(grouped.items())
    }


def build_review_needed_rooms(room_label_review: list[dict[str, Any]]) -> list[dict[str, Any]]:
    review_needed: list[dict[str, Any]] = []
    for row in room_label_review:
        reasons: list[str] = []
        if row["campusKey"] == "other_sites":
            reasons.append("bucketed_into_other_sites")
        if row["siteKey"] == "other_sites_general":
            reasons.append("site_needs_review")
        if row["visibilityClass"] == "unknown":
            reasons.append("visibility_unknown")
        if row["roomKind"] == "unknown":
            reasons.append("room_kind_unknown")
        if row["roomCode"] is None:
            reasons.append("missing_room_code")

        if reasons:
            review_needed.append(
                {
                    "ident": row["ident"],
                    "rawName": row["rawName"],
                    "primaryLabel": row["primaryLabel"],
                    "secondaryLabel": row["secondaryLabel"],
                    "detailPath": row["detailPath"],
                    "visibilityClass": row["visibilityClass"],
                    "roomKind": row["roomKind"],
                    "reasons": reasons,
                }
            )

    return sorted(review_needed, key=lambda item: (item["detailPath"], item["rawName"]))


def build_home_view(
    rooms: list[Room],
    free_rooms: list[FreeRoom],
    default_room_list: Any,
    query_date_time: datetime,
    rollups: dict[str, Any],
) -> dict[str, Any]:
    visibility_counts = {
        item["key"]: item["count"]
        for item in rollups["visibilityClasses"]
    }
    return {
        "selectedDateTime": format_remote_date_time(query_date_time),
        "isCustomTime": True,
        "selectedCampusKey": "deggendorf",
        "visibilityMode": "teaching_only",
        "summary": {
            "freeRoomCount": len(free_rooms),
            "visibleTeachingRoomCount": len(default_room_list.visible_rooms),
            "totalRoomCount": len(rooms),
            "secondaryVenueCount": visibility_counts.get("secondary_venue", 0),
            "hiddenRoomCount": visibility_counts.get("exclude_default", 0),
            "unknownRoomCount": visibility_counts.get("unknown", 0),
            "currentTime": format_remote_date_time(query_date_time),
        },
    }


def build_room_list_view(
    formatter: RoomPresentationFormatter,
    free_rooms: list[FreeRoom],
    query_date_time: datetime,
    selected_campus_key: str,
    selected_group_key: str | None,
    visibility_mode: str,
) -> dict[str, Any]:
    presentation = formatter.build_room_list_presentation(
        free_rooms=free_rooms,
        selected_campus_key=selected_campus_key,
        selected_group_key=selected_group_key,
        visibility_mode=visibility_mode,
    )

    return {
        "selectedDateTime": format_remote_date_time(query_date_time),
        "isCustomTime": True,
        "selectedCampusKey": selected_campus_key,
        "selectedGroupKey": selected_group_key,
        "visibilityMode": visibility_mode,
        "freeRoomCount": len(free_rooms),
        "visibleRoomCount": len(presentation.visible_rooms),
        "campusFilters": [serialize_filter_option(option) for option in presentation.campus_filters],
        "groupFilters": [serialize_filter_option(option) for option in presentation.group_filters],
        "sections": [
            {
                "campusKey": section.campus_key,
                "campusLabel": section.campus_label,
                "groupKey": section.group_key,
                "groupLabel": section.group_label,
                "rooms": [
                    formatter.serialize_presented_free_room(room)
                    for room in section.rooms
                ],
            }
            for section in presentation.sections
        ],
        "visibleRooms": [
            formatter.serialize_presented_free_room(room)
            for room in presentation.visible_rooms
        ],
    }


def write_room_detail_exports(
    output_dir: Path,
    rooms: list[Room],
    events_by_room_ident: dict[str, list[ScheduledEvent]],
    query_date_time: datetime,
    formatter: RoomPresentationFormatter,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    for room in rooms:
        events = events_by_room_ident.get(room.ident, [])
        current_event = next(
            (
                event
                for event in events
                if event.start_date_time <= query_date_time < event.end_date_time
            ),
            None,
        )
        free_until = None if current_event else next(
            (event.start_date_time for event in events if event.start_date_time > query_date_time),
            None,
        )

        availability_label = (
            occupied_until_label(current_event.end_date_time)
            if current_event
            else formatter.availability_label(free_until)
        )

        write_json(
            output_dir / f"{safe_filename(room.ident)}.json",
            {
                "queryDateTime": format_remote_date_time(query_date_time),
                "room": serialize_room(room),
                "roomPresentation": formatter.serialize_presentation(formatter.present_room(room)),
                "availability": {
                    "isFreeNow": current_event is None,
                    "freeUntil": format_remote_date_time(free_until) if free_until else None,
                    "occupiedUntil": format_remote_date_time(current_event.end_date_time) if current_event else None,
                    "label": availability_label,
                },
                "scheduleDateLabel": query_date_time.strftime("%A, %d %B %Y"),
                "events": [serialize_event(event, formatter) for event in events],
            },
        )


def build_audit_report(
    rooms: list[Room],
    periods_raw: list[dict[str, Any]],
    events: list[ScheduledEvent],
    room_by_ident: dict[str, Room],
    free_rooms: list[FreeRoom],
    rollups: dict[str, Any],
    room_label_review: list[dict[str, Any]],
    review_needed_rooms: list[dict[str, Any]],
    excluded_rooms: dict[str, list[dict[str, Any]]],
    default_room_list: Any,
    query_date_time: datetime,
    source_description: str,
) -> dict[str, Any]:
    rooms_missing_facilities = sorted(room.ident for room in rooms if not room.facilities)
    rooms_missing_contact_name = sorted(room.ident for room in rooms if not room.in_charge_name)
    rooms_missing_contact_email = sorted(room.ident for room in rooms if not room.in_charge_email)
    rooms_missing_regular_seats = sorted(room.ident for room in rooms if room.seats_regular <= 0)
    rooms_missing_exam_seats = sorted(room.ident for room in rooms if room.seats_exam <= 0)
    rooms_missing_untis_longname = sorted(room.ident for room in rooms if not room.untis_longname)

    periods_missing_title_text = [
        period for period in periods_raw if not normalize_optional_string(period.get("titleText"))
    ]
    periods_missing_event_type = [
        period
        for period in periods_raw
        if not normalize_optional_string(period.get("eventTypeDescription"))
    ]
    multi_room_periods = [period for period in periods_raw if len(period.get("room_ident") or {}) > 1]

    unmatched_event_room_idents = sorted(
        {event.room_ident for event in events if event.room_ident not in room_by_ident}
    )
    sample_title_fallbacks = [
        {
            "id": event.id,
            "roomIdent": event.room_ident,
            "roomName": event.room_name,
            "startDateTime": format_remote_date_time(event.start_date_time),
            "eventType": event.event_type,
            "title": event.title,
            "titleSource": event.title_source,
        }
        for event in events
        if event.title_source != "titleText"
    ][:SUMMARY_SAMPLE_LIMIT]

    visibility_counts = {
        item["key"]: item["count"]
        for item in rollups["visibilityClasses"]
    }

    return {
        "source": source_description,
        "queryDateTime": format_remote_date_time(query_date_time),
        "rooms": {
            "total": len(rooms),
            "missingFacilitiesCount": len(rooms_missing_facilities),
            "missingContactNameCount": len(rooms_missing_contact_name),
            "missingContactEmailCount": len(rooms_missing_contact_email),
            "missingRegularSeatsCount": len(rooms_missing_regular_seats),
            "missingExamSeatsCount": len(rooms_missing_exam_seats),
            "missingUntisLongnameCount": len(rooms_missing_untis_longname),
            "roomsMissingFacilities": rooms_missing_facilities,
            "roomsMissingContactName": rooms_missing_contact_name,
            "roomsMissingContactEmail": rooms_missing_contact_email,
            "roomsMissingRegularSeats": rooms_missing_regular_seats,
            "roomsMissingExamSeats": rooms_missing_exam_seats,
            "roomsMissingUntisLongname": rooms_missing_untis_longname,
        },
        "periods": {
            "rawPeriodCount": len(periods_raw),
            "expandedEventCount": len(events),
            "periodsMissingTitleTextCount": len(periods_missing_title_text),
            "periodsMissingEventTypeCount": len(periods_missing_event_type),
            "multiRoomPeriodCount": len(multi_room_periods),
            "eventsUsingFallbackTitleCount": sum(1 for event in events if event.title_source != "titleText"),
            "sampleFallbackEvents": sample_title_fallbacks,
        },
        "eventRoomCoverage": {
            "matchedRoomIdentCount": sum(
                1
                for room_ident in {event.room_ident for event in events}
                if room_ident in room_by_ident
            ),
            "unmatchedRoomIdentCount": len(unmatched_event_room_idents),
            "unmatchedRoomIdents": unmatched_event_room_idents,
        },
        "defaultExperience": {
            "defaultCampusKey": "deggendorf",
            "defaultVisibilityMode": "teaching_only",
            "freeRoomsTotal": len(free_rooms),
            "visibleDefaultRooms": len(default_room_list.visible_rooms),
            "teachingRoomCount": visibility_counts.get("teaching_room", 0),
            "secondaryVenueCount": visibility_counts.get("secondary_venue", 0),
            "excludeDefaultCount": visibility_counts.get("exclude_default", 0),
            "unknownCount": visibility_counts.get("unknown", 0),
        },
        "rollups": rollups,
        "labelReview": {
            "totalRows": len(room_label_review),
            "reviewNeededCount": len(review_needed_rooms),
            "excludedCount": sum(len(items) for items in excluded_rooms.values()),
            "sampleBeforeAfter": room_label_review[:SUMMARY_SAMPLE_LIMIT],
        },
    }


def build_markdown_summary(
    audit_payload: dict[str, Any],
    room_label_review: list[dict[str, Any]],
    review_needed_rooms: list[dict[str, Any]],
) -> str:
    room_metrics = audit_payload["rooms"]
    period_metrics = audit_payload["periods"]
    default_experience = audit_payload["defaultExperience"]
    event_room_coverage = audit_payload["eventRoomCoverage"]
    campus_rollups = audit_payload["rollups"]["campuses"]

    lines = [
        "# THabella Snapshot Audit",
        "",
        f"- Source: `{audit_payload['source']}`",
        f"- Query date/time: `{audit_payload['queryDateTime']}`",
        f"- Total rooms exported: `{room_metrics['total']}`",
        f"- Free rooms at query time: `{default_experience['freeRoomsTotal']}`",
        f"- Default Deggendorf teaching-room results: `{default_experience['visibleDefaultRooms']}`",
        "",
        "## Default Experience",
        "",
        f"- Teaching rooms: `{default_experience['teachingRoomCount']}`",
        f"- Secondary venues: `{default_experience['secondaryVenueCount']}`",
        f"- Hidden by default: `{default_experience['excludeDefaultCount']}`",
        f"- Unknown visibility: `{default_experience['unknownCount']}`",
        "",
        "## Content Gaps",
        "",
        f"- Rooms without facilities: `{room_metrics['missingFacilitiesCount']}`",
        f"- Rooms without contact names: `{room_metrics['missingContactNameCount']}`",
        f"- Rooms without contact emails: `{room_metrics['missingContactEmailCount']}`",
        f"- Rooms without regular seat counts: `{room_metrics['missingRegularSeatsCount']}`",
        f"- Rooms without exam seat counts: `{room_metrics['missingExamSeatsCount']}`",
        f"- Rooms without `untisLongname`: `{room_metrics['missingUntisLongnameCount']}`",
        f"- Periods without `titleText`: `{period_metrics['periodsMissingTitleTextCount']}`",
        f"- Periods without `eventTypeDescription`: `{period_metrics['periodsMissingEventTypeCount']}`",
        f"- Multi-room periods: `{period_metrics['multiRoomPeriodCount']}`",
        f"- Events using fallback titles: `{period_metrics['eventsUsingFallbackTitleCount']}`",
        f"- Event room identifiers not matched to any exported room: `{event_room_coverage['unmatchedRoomIdentCount']}`",
        "",
        "## Campus Rollup",
        "",
        "| Campus | Total | Free now | Teaching | Secondary | Hidden | Unknown |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]

    for campus in campus_rollups:
        lines.append(
            "| "
            f"{escape_markdown_table(campus['label'])} | "
            f"{campus['totalRooms']} | "
            f"{campus['freeNowRooms']} | "
            f"{campus['teachingRooms']} | "
            f"{campus['secondaryVenues']} | "
            f"{campus['excludedByDefault']} | "
            f"{campus['unknownRooms']} |"
        )

    if review_needed_rooms:
        lines.extend(
            [
                "",
                "## Review Needed",
                "",
                "| Raw label | Student label | Path | Reasons |",
                "| --- | --- | --- | --- |",
            ]
        )
        for row in review_needed_rooms[:SUMMARY_SAMPLE_LIMIT]:
            lines.append(
                "| "
                f"{escape_markdown_table(row['rawName'])} | "
                f"{escape_markdown_table(row['primaryLabel'])} | "
                f"{escape_markdown_table(row['detailPath'])} | "
                f"`{escape_markdown_table(', '.join(row['reasons']))}` |"
            )

    lines.extend(
        [
            "",
            "## Before and After",
            "",
            "| Raw label | Student label | Secondary copy | Visibility |",
            "| --- | --- | --- | --- |",
        ]
    )

    for row in room_label_review[:SUMMARY_SAMPLE_LIMIT]:
        lines.append(
            "| "
            f"{escape_markdown_table(row['rawName'])} | "
            f"{escape_markdown_table(row['primaryLabel'])} | "
            f"{escape_markdown_table(row['secondaryLabel'])} | "
            f"`{escape_markdown_table(row['visibilityClass'])}` |"
        )

    return "\n".join(lines) + "\n"


def serialize_room(room: Room) -> dict[str, Any]:
    return {
        "id": room.id,
        "ident": room.ident,
        "name": room.name,
        "building": room.building,
        "floor": room.floor,
        "displayName": room.display_name,
        "seatsRegular": room.seats_regular,
        "seatsExam": room.seats_exam,
        "facilities": room.facilities,
        "bookable": room.bookable,
        "inChargeName": room.in_charge_name,
        "inChargeEmail": room.in_charge_email,
        "untisLongname": room.untis_longname,
    }


def serialize_event(event: ScheduledEvent, formatter: RoomPresentationFormatter) -> dict[str, Any]:
    return {
        "id": event.id,
        "roomIdent": event.room_ident,
        "roomName": event.room_name,
        "startDateTime": format_remote_date_time(event.start_date_time),
        "endDateTime": format_remote_date_time(event.end_date_time),
        "durationMinutes": event.duration_minutes,
        "timeRangeLabel": f"{event.start_date_time:%H:%M} - {event.end_date_time:%H:%M}",
        "eventType": event.event_type,
        "title": event.title,
        "displayTitle": formatter.meaningful_title(event),
        "titleSource": event.title_source,
    }


def serialize_filter_option(option: Any) -> dict[str, Any]:
    return {
        "key": option.key,
        "label": option.label,
        "count": option.count,
    }


def occupied_until_label(occupied_until: datetime | None) -> str:
    if occupied_until is None:
        return "Occupied now"
    return f"Occupied until {occupied_until:%H:%M}"


def parse_building(name: str) -> str:
    room_code = name.split(" - ", 1)[0].strip()
    first_part = room_code.split(" ", 1)[0]
    letters = "".join(character for character in first_part if character.isalpha())
    return letters or first_part


def parse_floor(name: str) -> int | None:
    room_code = name.split(" - ", 1)[0].strip()
    digits = "".join(character for character in room_code if character.isdigit())
    return int(digits[0]) if digits else None


def parse_display_name(name: str) -> str:
    parts = name.split(" - ", 1)
    return parts[1].strip() if len(parts) > 1 else name.strip()


def parse_facilities(raw_facilities: Any) -> list[str]:
    if raw_facilities is None:
        return []
    return [
        part.strip()
        for part in str(raw_facilities).split(",")
        if part.strip()
    ]


def normalize_optional_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def join_non_blank(*parts: Any) -> str | None:
    values = [normalize_optional_string(part) for part in parts]
    compact = [value for value in values if value]
    return " ".join(compact) if compact else None


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=True, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def write_text(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")


def safe_filename(value: str) -> str:
    safe = []
    for character in value:
        if character.isalnum() or character in {"-", "_", "."}:
            safe.append(character)
        else:
            safe.append("_")
    return "".join(safe)


def escape_markdown_table(value: str) -> str:
    return value.replace("|", "/")


if __name__ == "__main__":
    raise SystemExit(main())
