/**
 * Room search — a flexible, forgiving lookup over *all* teaching rooms (not just
 * the ones free right now), so a student who knows what they want can jump to it.
 *
 * Matches room code / building / name and THabella's free-text equipment list
 * (`facilities`, e.g. "Beamer, Whiteboard"), with a small EN↔DE synonym
 * dictionary so a natural English query ("projector") hits the German tags
 * THabella actually stores ("Beamer"). Each hit carries its live availability so
 * the list can show free / soon / occupied and when it next frees up.
 *
 * Framework-free (domain layer).
 */
import type { Room, RoomAvailability, ScheduledEvent } from './models';
import { computeRoomAvailability, getRoomSchedule } from './availability';
import { isExcludedVenue, normalizeForMatching } from './priority';

export interface RoomSearchResult {
  room: Room;
  availability: RoomAvailability;
}

export interface SearchRoomsOptions {
  /** Restrict to these idents (the teaching-room set); all rooms when omitted. */
  eligibleIdents?: ReadonlySet<string>;
  /** Campus closing time — caps each room's remaining free window. */
  closesAt?: Date | null;
}

/**
 * EN↔DE equipment / room-type synonym groups. Every term is normalized the same
 * way as the search haystack (umlaut-folded, lower-case) before matching, so
 * write them however reads clearest here.
 */
const SYNONYM_GROUPS: readonly string[][] = [
  ['projector', 'beamer', 'projektor'],
  ['whiteboard', 'board', 'tafel'],
  ['blackboard', 'kreidetafel', 'tafel'],
  ['computer', 'pc', 'rechner', 'plätze'],
  ['lecture hall', 'hörsaal', 'hoersaal', 'hs'],
  ['lab', 'labor'],
  ['seminar', 'seminarraum'],
  ['seats', 'plätze', 'platz', 'sitzplätze'],
];

const NORMALIZED_GROUPS: readonly string[][] = SYNONYM_GROUPS.map((g) =>
  g.map((term) => normalizeForMatching(term)).filter((term) => term.length > 0),
);

/** The searchable text for one room, umlaut-folded and lower-cased. */
function haystackFor(room: Room): string {
  return normalizeForMatching(
    [room.code, room.building, room.displayName, room.name, room.facilities.join(' ')].join(' '),
  );
}

/** Expand a normalized query to include synonyms of any term it references. */
function expandQuery(q: string): string[] {
  const terms = new Set<string>([q]);
  for (const group of NORMALIZED_GROUPS) {
    const hit = group.some(
      (term) => q.includes(term) || (q.length >= 3 && term.includes(q)),
    );
    if (hit) group.forEach((term) => terms.add(term));
  }
  return [...terms];
}

const STATUS_RANK: Record<RoomAvailability['status'], number> = {
  free: 0,
  soon: 1,
  occupied: 2,
};

/**
 * Rooms matching `query` at `now`, with each room's live availability. Sorted
 * free → soon → occupied, then by room code. Excluded venues never match.
 */
export function searchRooms(
  rooms: Room[],
  events: ScheduledEvent[],
  query: string,
  now: Date,
  options: SearchRoomsOptions = {},
): RoomSearchResult[] {
  const q = normalizeForMatching(query).trim();
  if (!q) return [];

  const { eligibleIdents, closesAt } = options;
  const terms = expandQuery(q);

  const results = rooms
    .filter((r) => (eligibleIdents ? eligibleIdents.has(r.ident) : true))
    .filter((r) => !isExcludedVenue(r))
    .filter((r) => {
      const hay = haystackFor(r);
      return terms.some((term) => hay.includes(term));
    })
    .map<RoomSearchResult>((room) => ({
      room,
      availability: computeRoomAvailability(getRoomSchedule(events, room.ident), now, closesAt),
    }));

  results.sort((a, b) => {
    const s = STATUS_RANK[a.availability.status] - STATUS_RANK[b.availability.status];
    if (s !== 0) return s;
    return a.room.code < b.room.code ? -1 : a.room.code > b.room.code ? 1 : 0;
  });

  return results;
}
