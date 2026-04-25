from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class NormalizedRoomLocation:
    campus_key: str
    campus: str
    site_key: str
    site: str
    building_key: str | None
    building: str | None
    group_key: str
    group_label: str
    room_code: str | None
    room_kind: str
    visibility_class: str
    friendly_label: str
    sort_key: str
    detail_path: str


@dataclass(frozen=True)
class StudentFacingRoomPresentation:
    primary_label: str
    secondary_label: str
    friendly_room_kind: str
    raw_label: str
    location: NormalizedRoomLocation


@dataclass(frozen=True)
class PresentedFreeRoom:
    room: Any
    free_until: datetime | None
    presentation: StudentFacingRoomPresentation
    availability_label: str


@dataclass(frozen=True)
class RoomFilterOption:
    key: str | None
    label: str
    count: int


@dataclass(frozen=True)
class RoomListSection:
    campus_key: str
    campus_label: str
    group_key: str
    group_label: str
    rooms: list[PresentedFreeRoom]


@dataclass(frozen=True)
class RoomListPresentation:
    campus_filters: list[RoomFilterOption]
    group_filters: list[RoomFilterOption]
    sections: list[RoomListSection]
    visible_rooms: list[PresentedFreeRoom]


class RoomPresentationFormatter:
    def __init__(self, taxonomy: dict[str, Any]) -> None:
        self.taxonomy = taxonomy
        self.campuses = {item["key"]: item for item in taxonomy["campuses"]}
        self.sites = {item["key"]: item for item in taxonomy["sites"]}
        self.buildings = [
            {
                "rule": item,
                "patterns": [re.compile(pattern, re.IGNORECASE) for pattern in item["patterns"]],
            }
            for item in taxonomy["buildings"]
        ]
        self.room_code_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in taxonomy["roomCodePatterns"]
        ]
        self.room_kinds = [
            {
                "rule": item,
                "keywords": [self._normalize(keyword) for keyword in item["keywords"]],
            }
            for item in taxonomy["roomKinds"]
        ]
        self.visibility_rules = [
            {
                "rule": item,
                "patterns": [re.compile(pattern, re.IGNORECASE) for pattern in item["patterns"]],
            }
            for item in taxonomy["visibilityRules"]
        ]
        self.exception_rules = [
            {
                "rule": item,
                "pattern": re.compile(item["pattern"], re.IGNORECASE),
            }
            for item in taxonomy["exceptionRules"]
        ]

    @classmethod
    def load_from_repo_root(cls, repo_root: Path | None = None) -> "RoomPresentationFormatter":
        root = repo_root or Path(__file__).resolve().parents[2]
        taxonomy_path = root / "shared" / "thd-room-taxonomy.json"
        return cls(json.loads(taxonomy_path.read_text(encoding="utf-8")))

    def present_room(self, room: Any) -> StudentFacingRoomPresentation:
        raw_label = (getattr(room, "name", "") or getattr(room, "display_name", "") or "Unknown room").strip()
        normalized_label = self._normalize(raw_label)
        room_code = self._extract_room_code(raw_label)
        exception = next(
            (rule for rule in self.exception_rules if rule["pattern"].search(normalized_label)),
            None,
        )
        building = self._match_building(normalized_label, room_code)
        campus = self._resolve_campus(normalized_label, building, exception)
        site = self._resolve_site(normalized_label, building, campus, exception)
        building_label = self._resolve_building_label(building, exception, normalized_label)
        room_kind = self._resolve_room_kind(room, room_code, exception)
        visibility_class = self._resolve_visibility(normalized_label, room_code, room_kind, exception)
        group_label = self._build_group_label(site["label"], building_label)
        group_key = self._build_group_key(site["key"], building["rule"]["key"] if building else None, building_label, site["label"])
        secondary_label = " · ".join(
            self._dedupe(
                [
                    self._room_kind_label(room_kind),
                    group_label,
                    campus["label"],
                ]
            )
        )
        detail_path = " > ".join(
            self._dedupe([campus["label"], site["label"], building_label])
        )
        primary_label = room_code or self._fallback_primary_label(raw_label)
        location = NormalizedRoomLocation(
            campus_key=campus["key"],
            campus=campus["label"],
            site_key=site["key"],
            site=site["label"],
            building_key=building["rule"]["key"] if building else None,
            building=building_label,
            group_key=group_key,
            group_label=group_label,
            room_code=room_code,
            room_kind=room_kind,
            visibility_class=visibility_class,
            friendly_label=secondary_label,
            sort_key=f"{self._section_sort_key(campus, site, group_label)}|{primary_label.lower()}",
            detail_path=detail_path,
        )
        return StudentFacingRoomPresentation(
            primary_label=primary_label,
            secondary_label=secondary_label,
            friendly_room_kind=self._room_kind_label(room_kind),
            raw_label=raw_label,
            location=location,
        )

    def present_free_room(self, free_room: Any) -> PresentedFreeRoom:
        presentation = self.present_room(free_room.room)
        if free_room.free_until is None:
            availability_sort_key = f"00|9999|{presentation.primary_label.lower()}"
        else:
            descending_key = str(9999 - int(free_room.free_until.strftime("%H%M"))).zfill(4)
            availability_sort_key = f"01|{descending_key}|{presentation.primary_label.lower()}"

        updated_location = NormalizedRoomLocation(
            campus_key=presentation.location.campus_key,
            campus=presentation.location.campus,
            site_key=presentation.location.site_key,
            site=presentation.location.site,
            building_key=presentation.location.building_key,
            building=presentation.location.building,
            group_key=presentation.location.group_key,
            group_label=presentation.location.group_label,
            room_code=presentation.location.room_code,
            room_kind=presentation.location.room_kind,
            visibility_class=presentation.location.visibility_class,
            friendly_label=presentation.location.friendly_label,
            sort_key=f"{self._section_sort_key(self.campuses[presentation.location.campus_key], self.sites[presentation.location.site_key], presentation.location.group_label)}|{availability_sort_key}",
            detail_path=presentation.location.detail_path,
        )
        return PresentedFreeRoom(
            room=free_room.room,
            free_until=free_room.free_until,
            presentation=StudentFacingRoomPresentation(
                primary_label=presentation.primary_label,
                secondary_label=presentation.secondary_label,
                friendly_room_kind=presentation.friendly_room_kind,
                raw_label=presentation.raw_label,
                location=updated_location,
            ),
            availability_label=self.availability_label(free_room.free_until),
        )

    def build_room_list_presentation(
        self,
        free_rooms: list[Any],
        selected_campus_key: str,
        selected_group_key: str | None,
        visibility_mode: str,
    ) -> RoomListPresentation:
        visible_by_mode = [
            self.present_free_room(free_room)
            for free_room in free_rooms
            if self._visibility_mode_includes(
                visibility_mode,
                self.present_room(free_room.room).location.visibility_class,
            )
        ]

        campus_filters = [
            RoomFilterOption(
                key=campus["key"],
                label=campus["label"],
                count=sum(
                    1
                    for free_room in visible_by_mode
                    if free_room.presentation.location.campus_key == campus["key"]
                ),
            )
            for campus in sorted(self.taxonomy["campuses"], key=lambda item: item["sortOrder"])
        ]

        rooms_for_campus = [
            free_room
            for free_room in visible_by_mode
            if free_room.presentation.location.campus_key == selected_campus_key
        ]
        grouped = self._group_by(rooms_for_campus, lambda item: item.presentation.location.group_key)
        group_filters = [
            RoomFilterOption(
                key=items[0].presentation.location.group_key,
                label=items[0].presentation.location.group_label,
                count=len(items),
            )
            for items in sorted(
                grouped.values(),
                key=lambda items: self._section_sort_key(
                    self.campuses[items[0].presentation.location.campus_key],
                    self.sites[items[0].presentation.location.site_key],
                    items[0].presentation.location.group_label,
                ),
            )
        ]

        safe_group_key = selected_group_key if any(option.key == selected_group_key for option in group_filters) else None
        visible_rooms = [
            room for room in rooms_for_campus
            if safe_group_key is None or room.presentation.location.group_key == safe_group_key
        ]
        visible_rooms.sort(key=lambda item: item.presentation.location.sort_key)

        sections = [
            RoomListSection(
                campus_key=items[0].presentation.location.campus_key,
                campus_label=items[0].presentation.location.campus,
                group_key=items[0].presentation.location.group_key,
                group_label=items[0].presentation.location.group_label,
                rooms=items,
            )
            for items in sorted(
                self._group_by(visible_rooms, lambda item: item.presentation.location.group_key).values(),
                key=lambda items: self._section_sort_key(
                    self.campuses[items[0].presentation.location.campus_key],
                    self.sites[items[0].presentation.location.site_key],
                    items[0].presentation.location.group_label,
                ),
            )
        ]

        return RoomListPresentation(
            campus_filters=campus_filters,
            group_filters=group_filters,
            sections=sections,
            visible_rooms=visible_rooms,
        )

    def availability_label(self, free_until: datetime | None) -> str:
        if free_until is None:
            return "Free all day"
        return f"Free until {free_until:%H:%M}"

    def meaningful_title(self, event: Any) -> str | None:
        normalized_title = self._normalize(getattr(event, "title", ""))
        normalized_type = self._normalize(getattr(event, "event_type", ""))
        if not normalized_title or normalized_title == "unknown" or normalized_title == normalized_type:
            return None
        return getattr(event, "title", "").strip() or None

    def serialize_presentation(self, presentation: StudentFacingRoomPresentation) -> dict[str, Any]:
        payload = asdict(presentation)
        payload["location"] = asdict(presentation.location)
        return payload

    def serialize_presented_free_room(self, presented_free_room: PresentedFreeRoom) -> dict[str, Any]:
        payload = self.serialize_presentation(presented_free_room.presentation)
        payload.update(
            {
                "freeUntil": presented_free_room.free_until.strftime("%Y-%m-%d %H:%M") if presented_free_room.free_until else None,
                "availabilityLabel": presented_free_room.availability_label,
            }
        )
        return payload

    def _resolve_room_kind(self, room: Any, room_code: str | None, exception: dict[str, Any] | None) -> str:
        if exception and exception["rule"].get("roomKindKey"):
            return exception["rule"]["roomKindKey"]

        searchable = self._normalize(
            " ".join(
                [
                    getattr(room, "name", ""),
                    getattr(room, "display_name", ""),
                    getattr(room, "untis_longname", "") or "",
                    " ".join(getattr(room, "facilities", [])),
                ]
            )
        )
        for room_kind in self.room_kinds:
            if room_kind["rule"]["key"] == "unknown":
                continue
            if any(keyword in searchable for keyword in room_kind["keywords"]):
                return room_kind["rule"]["key"]
        return "classroom" if room_code else "unknown"

    def _resolve_visibility(
        self,
        normalized_label: str,
        room_code: str | None,
        room_kind: str,
        exception: dict[str, Any] | None,
    ) -> str:
        if exception and exception["rule"].get("visibilityClass"):
            return exception["rule"]["visibilityClass"]

        for visibility_rule in self.visibility_rules:
            if any(pattern.search(normalized_label) for pattern in visibility_rule["patterns"]):
                return visibility_rule["rule"]["visibilityClass"]
        return "teaching_room" if room_code or room_kind == "classroom" else "unknown"

    def _resolve_campus(
        self,
        normalized_label: str,
        building: dict[str, Any] | None,
        exception: dict[str, Any] | None,
    ) -> dict[str, Any]:
        if exception and exception["rule"].get("campusKey"):
            return self.campuses[exception["rule"]["campusKey"]]
        if building:
            return self.campuses[building["rule"]["campusKey"]]
        if normalized_label.startswith("ec"):
            return self.campuses["pfarrkirchen_ecri"]
        if "badstrasse" in normalized_label or "badstra" in normalized_label:
            return self.campuses["cham"]
        if any(marker in normalized_label for marker in ("deggs", "degg's", "veilchengasse", "la 25", "la 27", "dms", "gib", "tcw")) or normalized_label.startswith("am "):
            return self.campuses["deggendorf"]
        return self.campuses["other_sites"]

    def _resolve_site(
        self,
        normalized_label: str,
        building: dict[str, Any] | None,
        campus: dict[str, Any],
        exception: dict[str, Any] | None,
    ) -> dict[str, Any]:
        if exception and exception["rule"].get("siteKey"):
            return self.sites[exception["rule"]["siteKey"]]
        if building:
            return self.sites[building["rule"]["siteKey"]]
        if any(marker in normalized_label for marker in ("deggs", "degg's")):
            return self.sites["deggs"]
        if "veilchengasse" in normalized_label:
            return self.sites["veilchengasse"]
        if any(marker in normalized_label for marker in ("la 25", "la 27", "dms", "gib", "tcw")):
            return self.sites["land_au"]
        if normalized_label.startswith("am ") or "am stadtpark" in normalized_label:
            return self.sites["am_stadtpark"]
        if campus["key"] == "pfarrkirchen_ecri":
            return self.sites["pfarrkirchen_campus"]
        if campus["key"] == "cham":
            return self.sites["cham_campus"]
        if campus["key"] == "deggendorf":
            return self.sites["deggendorf_main"]
        return self.sites["other_sites_general"]

    def _match_building(self, normalized_label: str, room_code: str | None) -> dict[str, Any] | None:
        prioritized_campus = None
        if normalized_label.startswith("ec"):
            prioritized_campus = "pfarrkirchen_ecri"
        elif "badstrasse" in normalized_label or "badstra" in normalized_label:
            prioritized_campus = "cham"

        ordered_rules = self.buildings
        if prioritized_campus:
            ordered_rules = [
                *[rule for rule in self.buildings if rule["rule"]["campusKey"] == prioritized_campus],
                *[rule for rule in self.buildings if rule["rule"]["campusKey"] != prioritized_campus],
            ]

        normalized_room_code = self._normalize(room_code) if room_code else None
        for building in ordered_rules:
            if any(pattern.search(normalized_label) for pattern in building["patterns"]):
                return building
            if normalized_room_code and any(pattern.search(normalized_room_code) for pattern in building["patterns"]):
                return building
        return None

    def _resolve_building_label(
        self,
        building: dict[str, Any] | None,
        exception: dict[str, Any] | None,
        normalized_label: str,
    ) -> str | None:
        if exception and exception["rule"].get("buildingLabel"):
            match = exception["pattern"].search(normalized_label)
            if match:
                replacement = exception["rule"]["buildingLabel"]
                for index, value in enumerate(match.groups(), start=1):
                    replacement = replacement.replace(f"${index}", value or "")
                return replacement.upper() or None
        if building:
            return building["rule"]["label"]
        return None

    def _extract_room_code(self, raw_label: str) -> str | None:
        for pattern in self.room_code_patterns:
            match = pattern.search(raw_label)
            if match:
                return re.sub(r"\s+", " ", match.group(0)).strip()
        return None

    def _build_group_label(self, site_label: str, building_label: str | None) -> str:
        if not building_label:
            return site_label
        if site_label == "Main campus" or building_label == site_label:
            return building_label
        return f"{site_label} · {building_label}"

    def _build_group_key(
        self,
        site_key: str,
        building_key: str | None,
        building_label: str | None,
        site_label: str,
    ) -> str:
        if building_key and site_label == "Main campus":
            return building_key
        if building_key:
            return f"{site_key}:{building_key}"
        if building_label:
            return f"{site_key}:{building_label.lower()}"
        return site_key

    def _section_sort_key(self, campus: dict[str, Any], site: dict[str, Any], group_label: str) -> str:
        return f"{campus['sortOrder']:02d}|{site['sortOrder']:02d}|{group_label.lower()}"

    def _room_kind_label(self, room_kind: str) -> str:
        for rule in self.taxonomy["roomKinds"]:
            if rule["key"] == room_kind:
                return rule["label"]
        return "Room"

    def _fallback_primary_label(self, raw_label: str) -> str:
        return raw_label.split(" (", 1)[0].split(" =", 1)[0].strip() or raw_label

    def _normalize(self, value: str | None) -> str:
        raw_value = value or ""
        normalized = unicodedata.normalize("NFD", self._transliterate(raw_value))
        stripped = "".join(character for character in normalized if unicodedata.category(character) != "Mn")
        return stripped.lower().strip()

    def _transliterate(self, value: str) -> str:
        return (
            value
            .replace("\u00c4", "Ae")
            .replace("\u00d6", "Oe")
            .replace("\u00dc", "Ue")
            .replace("\u00e4", "ae")
            .replace("\u00f6", "oe")
            .replace("\u00fc", "ue")
            .replace("\u00df", "ss")
        )

    def _visibility_mode_includes(self, visibility_mode: str, visibility_class: str) -> bool:
        if visibility_mode == "teaching_only":
            return visibility_class == "teaching_room"
        if visibility_mode == "include_secondary":
            return visibility_class in {"teaching_room", "secondary_venue"}
        return True

    def _group_by(self, items: list[Any], key_fn: Any) -> dict[str, list[Any]]:
        grouped: dict[str, list[Any]] = {}
        for item in items:
            key = key_fn(item)
            grouped.setdefault(key, []).append(item)
        return grouped

    def _dedupe(self, items: list[str | None]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for item in items:
            if not item:
                continue
            if item in seen:
                continue
            seen.add(item)
            deduped.append(item)
        return deduped
