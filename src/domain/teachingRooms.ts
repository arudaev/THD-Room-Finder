/**
 * Teaching-room filter — the v2 display-eligibility rule.
 *
 * THabella lists *every* space: classrooms, lecture halls, labs, but also
 * offices and store rooms that are closed at all times. v2 only shows real
 * teaching venues, defined as rooms that host at least one scheduled event in
 * the current Mon–Fri week. The set is derived from the week's schedule, not a
 * static taxonomy guess, so it self-corrects as THabella changes.
 */
import type { ScheduledEvent } from './models';

/** How many days from Monday to treat as the teaching week (Mon–Fri = 5). */
export const TEACHING_WEEK_DAYS = 5;

/** The room idents that host ≥1 event across the given week's events. */
export function teachingRoomIdents(weekEvents: ScheduledEvent[]): Set<string> {
  return new Set(weekEvents.map((e) => e.roomIdent));
}

/** Local midday of the Monday of `reference`'s week (stable across DST). */
export function mondayOf(reference: Date = new Date()): Date {
  const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offsetToMonday);
  return d;
}

/** The `days` weekday dates (at local midday) of `reference`'s week. */
export function weekDates(reference: Date = new Date(), days: number = TEACHING_WEEK_DAYS): Date[] {
  const monday = mondayOf(reference);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
