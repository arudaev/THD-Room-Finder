/**
 * Room priority policy — a faithful TS port of the native app's
 * `RoomPriorityPolicy.kt`. In v2 the primary display filter is "has a lecture
 * this week" (see teachingRooms.ts); `isPriority` now only informs a secondary
 * sort tiebreak so main-campus teaching rooms rank ahead of remote venues.
 */
import type { Room } from './models';

export const MAIN_CAMPUS_BUILDINGS = new Set([
  'A', 'B', 'C', 'D', 'E', 'I', 'ITC', 'J',
]);

const EXCLUDED_MARKERS = [
  'besprechungsraum',
  'vorplatz',
  'turnhalle',
  'stadthalle',
  'fernsehstudio',
  'glashaus',
  'coworking',
  'co-working',
];

/** Lowercase + German umlaut/ß folding, matching `normalizeForMatching`. */
export function normalizeForMatching(str: string | null | undefined): string {
  return (str ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function searchableText(room: Room): string {
  return normalizeForMatching(
    [
      room.name,
      room.displayName,
      room.building,
      room.untisLongname ?? '',
      room.facilities.join(' '),
    ].join(' '),
  );
}

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\W)${escaped}($|\\W)`).test(text);
}

/**
 * Non-study venues that should never appear in a "free study room" list even if
 * THabella schedules an event in them (sports courses, outdoor/forecourt spaces,
 * meeting rooms). Extends the native app's `excludedMarkers` with the sports and
 * outdoor venues surfaced once the display filter moved to "has an event this
 * week". Matched as substrings against the umlaut-folded room text.
 */
const EXCLUDED_VENUE_MARKERS = [
  ...EXCLUDED_MARKERS,
  'stadion',
  'schwimmbad',
  'sportplatz',
  'freiflaeche',
  'freifl',
  'beachvolleyball',
  'tennisplatz',
  'begegnungsst',
];

export function isExcludedVenue(room: Room): boolean {
  const text = normalizeForMatching(
    [room.name, room.displayName, room.untisLongname ?? ''].join(' '),
  );
  return EXCLUDED_VENUE_MARKERS.some((m) => text.includes(m));
}

export function isPriority(room: Room): boolean {
  if (!MAIN_CAMPUS_BUILDINGS.has(room.building)) return false;

  const text = searchableText(room);
  if (EXCLUDED_MARKERS.some((m) => text.includes(m))) return false;

  const isLab = text.includes('labor') || text.includes('lab');
  const isLectureHall =
    room.building === 'I' || containsWord(text, 'hs') || text.includes('hoersaal');
  const prefix = room.name.split(' - ')[0].trim();
  const isClassroomLike =
    prefix.toLowerCase().startsWith(room.building.toLowerCase()) && /\d/.test(prefix);

  return isLab || isLectureHall || isClassroomLike;
}
