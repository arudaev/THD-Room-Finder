/**
 * Availability computation — TS port of `GetFreeRoomsUseCase.kt` /
 * `GetRoomScheduleUseCase.kt`, extended for the v2 redesign:
 *   • three-state status (free / soon / occupied),
 *   • duration-first ranking (longest-free first),
 *   • the "teaching rooms only" eligibility filter.
 */
import type { FreeRoom, Room, RoomAvailability, RoomStatus, ScheduledEvent } from './models';
import { isExcludedVenue, isPriority } from './priority';

/** A free room whose remaining window is at/under this is "closing soon" (amber). */
export const SOON_THRESHOLD_MINUTES = 40;

const MS_PER_MINUTE = 60_000;

function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_MINUTE;
}

/** Status of a currently-free room given when it next fills (null = all day). */
export function freeStatus(freeUntil: Date | null, now: Date): RoomStatus {
  if (freeUntil === null) return 'free';
  return minutesBetween(now, freeUntil) <= SOON_THRESHOLD_MINUTES ? 'soon' : 'free';
}

/**
 * Full availability of one room at `now`, from that room's events.
 * Used by the room-detail status banner (which must also express "occupied").
 */
export function computeRoomAvailability(
  events: ScheduledEvent[],
  now: Date,
  closesAt?: Date | null,
): RoomAvailability {
  const current = events.find((e) => e.startDateTime <= now && e.endDateTime > now);
  if (current) {
    return { status: 'occupied', freeUntil: null, occupiedUntil: current.endDateTime };
  }
  const future = events
    .filter((e) => e.startDateTime > now)
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
  const nextEvent = future.length > 0 ? future[0].startDateTime : null;
  // A free room is only free until the building closes.
  const freeUntil = capFreeUntil(nextEvent, closesAt);
  return { status: freeStatus(freeUntil, now), freeUntil, occupiedUntil: null };
}

export interface ComputeFreeRoomsOptions {
  /**
   * Restrict results to these room idents (the teaching-room set for the week).
   * When omitted, all non-occupied rooms are considered.
   */
  eligibleIdents?: ReadonlySet<string>;
  /**
   * Campus closing time — caps each room's `freeUntil` so "free all day" becomes
   * "free until close". A room is only useful while the building is open.
   */
  closesAt?: Date | null;
}

/** The earlier of a room's next event and the campus close (either may be null). */
function capFreeUntil(next: Date | null, closesAt?: Date | null): Date | null {
  if (!closesAt) return next;
  if (next === null) return closesAt;
  return next.getTime() < closesAt.getTime() ? next : closesAt;
}

/**
 * Rooms free at `now`, ranked answer-first: longest-free first, then
 * main-campus priority, then building/name. Occupied rooms are excluded, as are
 * rooms outside `eligibleIdents` when provided.
 */
export function computeFreeRooms(
  rooms: Room[],
  events: ScheduledEvent[],
  now: Date,
  options: ComputeFreeRoomsOptions = {},
): FreeRoom[] {
  const { eligibleIdents, closesAt } = options;

  const occupiedIdents = new Set(
    events
      .filter((e) => e.startDateTime <= now && e.endDateTime > now)
      .map((e) => e.roomIdent),
  );

  const futureByRoom = new Map<string, ScheduledEvent[]>();
  for (const e of events) {
    if (e.startDateTime > now) {
      const list = futureByRoom.get(e.roomIdent);
      if (list) list.push(e);
      else futureByRoom.set(e.roomIdent, [e]);
    }
  }

  const free: FreeRoom[] = rooms
    .filter((r) => (eligibleIdents ? eligibleIdents.has(r.ident) : true))
    .filter((r) => !isExcludedVenue(r))
    .filter((r) => !occupiedIdents.has(r.ident))
    .map((room) => {
      const future = futureByRoom.get(room.ident);
      const next = future?.reduce((a, b) => (a.startDateTime < b.startDateTime ? a : b)) ?? null;
      return { room, freeUntil: capFreeUntil(next?.startDateTime ?? null, closesAt) };
    });

  free.sort((a, b) => {
    // 1) Duration-first: free-all-day first, then the later freeUntil (more time left).
    const aAllDay = a.freeUntil === null;
    const bAllDay = b.freeUntil === null;
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
    if (a.freeUntil && b.freeUntil && a.freeUntil.getTime() !== b.freeUntil.getTime()) {
      return b.freeUntil.getTime() - a.freeUntil.getTime();
    }
    // 2) Main-campus teaching rooms rank ahead (secondary tiebreak).
    const pa = isPriority(a.room) ? 1 : 0;
    const pb = isPriority(b.room) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    // 3) Stable, human-friendly ordering.
    if (a.room.building !== b.room.building) {
      return a.room.building < b.room.building ? -1 : 1;
    }
    return a.room.name < b.room.name ? -1 : 1;
  });

  return free;
}

/** All events for a room ident, chronologically — the room's day timeline. */
export function getRoomSchedule(
  events: ScheduledEvent[],
  roomIdent: string,
): ScheduledEvent[] {
  return events
    .filter((e) => e.roomIdent === roomIdent)
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
}
