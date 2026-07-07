/**
 * Room categorisation + filtering — lets a student narrow the free-room list
 * (and, through shared state, the campus map) to the kind of room they need:
 * a lecture hall, a computer lab, a hands-on lab, or a seminar room.
 *
 * THabella's `facilities` field is free-text and inconsistent, so classification
 * is a best-effort match over the room's name, display name, Untis longname and
 * facilities. Reliable for lecture halls (Hörsaal) and labs (Labor); computer
 * labs are detected from PC/Rechner/EDV markers where present.
 *
 * Framework-free (domain layer).
 */
import type { FreeRoom, Room } from './models';
import { normalizeForMatching } from './priority';

/** The coarse room category a student filters by. */
export type RoomKind = 'lecture' | 'computer' | 'lab' | 'seminar';

const LECTURE_RE = /hoersaal|\bhs\b|\bkino\b/;
// PC often appears glued to a count in THabella ("24PC", "28 PCs", "PC-Plätze").
const COMPUTER_RE = /pcs?\b|pc-|rechner|\bedv\b|computer|informatiklabor|\bcip\b|notebook/;
const LAB_RE = /labor|\blab\b|praktikum/;

function roomText(room: Room): string {
  return normalizeForMatching(
    [room.name, room.displayName, room.untisLongname ?? '', room.facilities.join(' ')].join(' '),
  );
}

/**
 * Classify a room into one coarse kind. Precedence: a Hörsaal is a lecture hall
 * even if it has a few PCs; otherwise PC/Rechner markers make it a computer lab;
 * otherwise a Labor/Praktikum is a lab; everything else is a seminar room.
 */
export function roomKind(room: Room): RoomKind {
  const text = roomText(room);
  if (LECTURE_RE.test(text)) return 'lecture';
  if (COMPUTER_RE.test(text)) return 'computer';
  if (LAB_RE.test(text)) return 'lab';
  return 'seminar';
}

// Markers matched against the room NAME only — deliberately NOT the facilities
// list, where "Sendehörsaal" (a broadcast feature fitted to rooms of every size,
// from the 16-seat E203 to the 220-seat B004) would otherwise misclassify them
// as lecture halls via the substring "hörsaal".
const LAB_NAME = /labor|\blab\b|praktikum|rechner|\bedv\b|(^|\W)pcs?(\W|$)/;
const LECTURE_HALL_NAME = /hoersaal|kino|(^|\W)hs(\W|$)/;
/** Rooms this size or larger read as general lecture rooms (open); see below. */
const OPEN_SEAT_THRESHOLD = 40;

/**
 * Whether a room is likely locked when it has no class. THabella reports a room
 * as "free" the moment no event occupies it, but many rooms are physically
 * locked outside their courses, so a student shouldn't cross campus on a maybe.
 * We never hide these — just add a soft "may be locked" caveat. The heuristic
 * mirrors how the rooms actually behave:
 *   • specialised labs (incl. computer/EDV rooms) stay locked at any size;
 *   • named lecture halls (Hörsaal/Kino) and building "I" read as open;
 *   • otherwise small rooms (< 40 seats) may be locked, big rooms read as open —
 *     the "prioritise the 40+ lecture rooms" rule, since seat count is the only
 *     signal separating a 16-seat seminar room from a 220-seat hall.
 */
export function mayBeLocked(room: Room): boolean {
  const name = normalizeForMatching([room.name, room.displayName].join(' '));
  if (LAB_NAME.test(name)) return true;
  if (LECTURE_HALL_NAME.test(name) || room.building === 'I') return false;
  return room.seatsRegular < OPEN_SEAT_THRESHOLD;
}

/** User-adjustable filters, shared by the room list and the campus map. */
export interface RoomFilters {
  /** Only rooms that report a seat count (hides store rooms, foyers, etc.). */
  withSeatsOnly: boolean;
  /** Restrict to one room kind, or 'all'. */
  kind: RoomKind | 'all';
}

/** Defaults: hide seat-less rooms (the answer-first list), all kinds shown. */
export const DEFAULT_ROOM_FILTERS: RoomFilters = { withSeatsOnly: true, kind: 'all' };

export function matchesRoomFilters(room: Room, f: RoomFilters): boolean {
  if (f.withSeatsOnly && room.seatsRegular <= 0) return false;
  if (f.kind !== 'all' && roomKind(room) !== f.kind) return false;
  return true;
}

/**
 * Stable reordering that floats a student's saved rooms ("my usual spot") to the
 * top of an already-ranked list, preserving the relative order within each group.
 */
export function favoritesFirst(
  list: FreeRoom[],
  isFavorite: (ident: string) => boolean,
): FreeRoom[] {
  const fav: FreeRoom[] = [];
  const rest: FreeRoom[] = [];
  for (const f of list) (isFavorite(f.room.ident) ? fav : rest).push(f);
  return fav.length > 0 ? [...fav, ...rest] : list;
}
