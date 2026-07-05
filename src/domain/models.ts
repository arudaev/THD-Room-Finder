/**
 * Domain models — platform-free. These mirror the trusted native app's domain
 * layer (`de.thd.roomfinder.domain.model`) that "fixed all the issues" with
 * THabella, ported to TypeScript for the unified v2 app.
 */

/** A physical room/venue known to THabella. */
export interface Room {
  id: number;
  /** Stable identifier used to match schedule events (THabella `ident`). */
  ident: string;
  /** Raw THabella name, e.g. "A008 - Labor Informatik". */
  name: string;
  /** Room code — the part before " - ", e.g. "A008", "ITC 2: HS 2". */
  code: string;
  /** Building letter code parsed from the name, e.g. "A", "ITC". */
  building: string;
  /** Floor number (first digit after the building code), or null. */
  floor: number | null;
  /** Human display name — the part after " - ", or the full name. */
  displayName: string;
  seatsRegular: number;
  seatsExam: number;
  facilities: string[];
  bookable: boolean;
  inChargeName: string | null;
  inChargeEmail: string | null;
  untisLongname: string | null;
}

/** A scheduled event occupying one room for a time window. */
export interface ScheduledEvent {
  id: number;
  roomIdent: string;
  roomName: string | null;
  startDateTime: Date;
  endDateTime: Date;
  durationMinutes: number;
  eventType: string;
}

/**
 * Three-state availability — the v2 redesign's core signal.
 * free = teal, soon = amber (free but closing soon), occupied = red.
 */
export type RoomStatus = 'free' | 'soon' | 'occupied';

/** A room that is free at the query time, with when it next fills (if ever today). */
export interface FreeRoom {
  room: Room;
  /** When the room next becomes occupied; null = free for the rest of the day. */
  freeUntil: Date | null;
}

/** Full availability of a single room at a moment — used by the detail banner. */
export interface RoomAvailability {
  status: RoomStatus;
  /** Set when currently free: when it next becomes occupied (null = all day). */
  freeUntil: Date | null;
  /** Set when currently occupied: when it next becomes free. */
  occupiedUntil: Date | null;
}
