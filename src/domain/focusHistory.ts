/**
 * Local focus history (ADR 0002 §3, #38). Finished sessions stay on the device
 * only: date, minutes and an optional room code. These pure functions turn the
 * entries into the focus graph's days, the semester total and the streak, and
 * validate an exported file before it is imported.
 */

import { isCampusClosedDay } from './openingHours';

export interface FocusEntry {
  /** Stable id, so importing the same file twice adds nothing. */
  id: string;
  /** ISO timestamp the session started. */
  startedAt: string;
  /** ISO timestamp it ended. */
  endedAt: string;
  /** Whole minutes focused. */
  minutes: number;
  /** Room code, e.g. "E 212". Never leaves the device. */
  room?: string;
}

export interface DayMinutes {
  /** Local date, YYYY-MM-DD. */
  date: string;
  minutes: number;
}

export interface Semester {
  term: 'winter' | 'summer';
  /** Local date, YYYY-MM-DD. */
  start: string;
  end: string;
}

export const EXPORT_FORMAT = 'thd-room-finder/focus-history';
export const EXPORT_VERSION = 1;

/** Longest session we accept, matching the 3 h server cap. */
const MAX_MINUTES = 180;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function localDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Sessions are counted on the local day they started. */
export function dailyMinutes(entries: FocusEntry[]): DayMinutes[] {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const day = localDay(new Date(e.startedAt));
    byDay.set(day, (byDay.get(day) ?? 0) + e.minutes);
  }
  return [...byDay.entries()]
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Consecutive open campus days with focus. Closed days pause the streak and
 * never add to it, even if they contain saved focus. An unfinished open day
 * doesn't break the streak until it is over. Calendar arithmetic preserves DST.
 */
export function streak(days: DayMinutes[], today: Date): number {
  const active = new Set(days.filter((d) => d.minutes > 0).map((d) => d.date));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const previousOpenDay = () => {
    do cursor.setDate(cursor.getDate() - 1);
    while (isCampusClosedDay(cursor));
  };
  while (isCampusClosedDay(cursor)) cursor.setDate(cursor.getDate() - 1);
  // Only today's open day gets grace, not the last open day before a closure.
  if (localDay(cursor) === localDay(today) && !active.has(localDay(cursor))) previousOpenDay();
  let n = 0;
  while (active.has(localDay(cursor))) {
    n += 1;
    previousOpenDay();
  }
  return n;
}

/**
 * THD terms: winter from 1 October to 14 March, summer from 15 March to
 * 30 September (D4 assumes the winter grid starts on the week of 1 Oct).
 */
export function semesterOf(today: Date): Semester {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const md = m * 100 + d;
  if (md >= 1001) return { term: 'winter', start: `${y}-10-01`, end: `${y + 1}-03-14` };
  if (md < 315) return { term: 'winter', start: `${y - 1}-10-01`, end: `${y}-03-14` };
  return { term: 'summer', start: `${y}-03-15`, end: `${y}-09-30` };
}

export function minutesBetween(days: DayMinutes[], start: string, end: string): number {
  return days.filter((d) => d.date >= start && d.date <= end).reduce((sum, d) => sum + d.minutes, 0);
}

export function minutesOn(days: DayMinutes[], day: string): number {
  return days.find((d) => d.date === day)?.minutes ?? 0;
}

/** Builds an entry for a session that just ended; null if it was under a minute. */
/** `focusMs` is the time actually focused (breaks excluded); without it the
 *  whole span from start to end counts. */
export function entryFor(startedAt: Date, endedAt: Date, room?: string, id?: string, focusMs?: number): FocusEntry | null {
  const span = focusMs ?? endedAt.getTime() - startedAt.getTime();
  const minutes = Math.min(MAX_MINUTES, Math.floor(span / 60000));
  if (minutes < 1) return null;
  return {
    id: id ?? `${startedAt.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    minutes,
    ...(room ? { room } : {}),
  };
}

export function exportHistory(entries: FocusEntry[], now: Date): string {
  return JSON.stringify(
    { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), entries },
    null,
    2,
  );
}

function isEntry(x: unknown): x is FocusEntry {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    e.id.length <= 64 &&
    typeof e.startedAt === 'string' &&
    !Number.isNaN(Date.parse(e.startedAt)) &&
    typeof e.endedAt === 'string' &&
    !Number.isNaN(Date.parse(e.endedAt)) &&
    typeof e.minutes === 'number' &&
    Number.isInteger(e.minutes) &&
    e.minutes >= 1 &&
    e.minutes <= MAX_MINUTES &&
    (e.room === undefined || (typeof e.room === 'string' && e.room.length <= 32))
  );
}

/** Parses an exported file. Throws on anything that isn't one. */
export function parseHistoryFile(text: string): FocusEntry[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('not-json');
  }
  const file = data as { format?: unknown; version?: unknown; entries?: unknown };
  if (!file || file.format !== EXPORT_FORMAT || file.version !== EXPORT_VERSION || !Array.isArray(file.entries)) {
    throw new Error('not-history');
  }
  return file.entries.filter(isEntry).map((e) => ({
    id: e.id,
    startedAt: e.startedAt,
    endedAt: e.endedAt,
    minutes: e.minutes,
    ...(e.room ? { room: e.room } : {}),
  }));
}

/** Adds imported entries that aren't already present (by id). */
export function mergeHistory(current: FocusEntry[], incoming: FocusEntry[]): FocusEntry[] {
  const seen = new Set(current.map((e) => e.id));
  const added = incoming.filter((e) => !seen.has(e.id) && seen.add(e.id));
  return [...current, ...added].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
