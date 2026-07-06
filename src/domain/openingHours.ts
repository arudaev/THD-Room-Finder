/**
 * THD Deggendorf opening hours — the physical building hours that gate whether a
 * "free" room is actually reachable. THabella only knows about scheduled classes,
 * not the front door, so a room with no events still isn't usable at 03:00. This
 * caps free-room durations at closing time and drives the "Campus closed" state.
 *
 * Two schedules share one resolver:
 *   • `getCampusHours`  — the general classroom buildings (07:00–20:00 weekdays).
 *   • `getLibraryHours` — the Joachim C. Römer Bibliothek (building G), which
 *     keeps its own, later hours and stays open on exam-period weekends. The
 *     Library hosts no THabella teaching, so it is surfaced separately as a
 *     study space rather than via free-room availability.
 *
 * Framework-free (domain layer). Source: THD published library/building hours.
 */

/** Which hours table applies on a given date. */
export type CampusPeriod = 'regular' | 'exam' | 'break';

/** Open/close as minutes from local midnight; `null` = closed that day. */
type DayHours = { open: number; close: number } | null;

/** A full period → weekday-table schedule for one venue. */
type Schedule = Record<CampusPeriod, DayHours[]>;

export interface CampusHours {
  /** Active hours table at the reference time. */
  period: CampusPeriod;
  /** Whether the venue is open at the reference time. */
  open: boolean;
  /** Today's opening moment (even if the reference time is before/after it). */
  todayOpen: Date | null;
  /** Today's closing moment. */
  todayClose: Date | null;
  /** When the venue next opens, if currently closed (else null). */
  nextOpen: Date | null;
}

const H = (h: number, m = 0): number => h * 60 + m;

// Weekday index: 0=Sun … 6=Sat.

// ── General classroom buildings ──────────────────────────────────────────────
// Regular term: Mon–Fri 07:00–20:00, weekends closed.
const CAMPUS_REGULAR: DayHours[] = [
  null, // Sun
  { open: H(7), close: H(20) }, // Mon
  { open: H(7), close: H(20) }, // Tue
  { open: H(7), close: H(20) }, // Wed
  { open: H(7), close: H(20) }, // Thu
  { open: H(7), close: H(20) }, // Fri
  null, // Sat
];

// Exam-prep window (22.06 – 31.07.2026): general buildings keep normal weekday
// hours; only the Library stays open late and on weekends (see LIBRARY_EXAM).
const CAMPUS_EXAM: DayHours[] = CAMPUS_REGULAR;

// Semester break (15.02 – 14.03 and 01.08 – 30.09): reduced weekday hours,
// weekends closed.
const CAMPUS_BREAK: DayHours[] = [
  null, // Sun
  { open: H(9, 30), close: H(16, 30) }, // Mon
  { open: H(9, 30), close: H(16, 30) }, // Tue
  { open: H(9, 30), close: H(16, 30) }, // Wed
  { open: H(9, 30), close: H(16, 30) }, // Thu
  { open: H(9, 30), close: H(13) }, // Fri
  null, // Sat
];

const CAMPUS: Schedule = { regular: CAMPUS_REGULAR, exam: CAMPUS_EXAM, break: CAMPUS_BREAK };

// ── Library (Joachim C. Römer Bibliothek, building G) ─────────────────────────
// Regular term: Mon–Thu 08:30–20:00, Fri 08:30–18:00, weekends closed.
const LIBRARY_REGULAR: DayHours[] = [
  null, // Sun
  { open: H(8, 30), close: H(20) }, // Mon
  { open: H(8, 30), close: H(20) }, // Tue
  { open: H(8, 30), close: H(20) }, // Wed
  { open: H(8, 30), close: H(20) }, // Thu
  { open: H(8, 30), close: H(18) }, // Fri
  null, // Sat
];

// Exam-prep: extended, and open on weekends — Mon–Fri 08:30, Sat/Sun 08:00, all
// closing 23:45.
const LIBRARY_EXAM: DayHours[] = [
  { open: H(8), close: H(23, 45) }, // Sun
  { open: H(8, 30), close: H(23, 45) }, // Mon
  { open: H(8, 30), close: H(23, 45) }, // Tue
  { open: H(8, 30), close: H(23, 45) }, // Wed
  { open: H(8, 30), close: H(23, 45) }, // Thu
  { open: H(8, 30), close: H(23, 45) }, // Fri
  { open: H(8), close: H(23, 45) }, // Sat
];

// Semester break: Mon–Thu 09:30–16:30, Fri 09:30–13:00, weekends closed.
const LIBRARY_BREAK: DayHours[] = CAMPUS_BREAK;

const LIBRARY: Schedule = { regular: LIBRARY_REGULAR, exam: LIBRARY_EXAM, break: LIBRARY_BREAK };

/** The active hours table for `date`. */
export function periodFor(date: Date): CampusPeriod {
  const y = date.getFullYear();
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  // Exam-prep window is a specific 2026 date range.
  if (y === 2026 && md >= 622 && md <= 731) return 'exam';
  // Semester breaks recur yearly.
  if ((md >= 215 && md <= 314) || (md >= 801 && md <= 930)) return 'break';
  return 'regular';
}

/** This schedule's hours for `date`, honouring the period that day falls in. */
function dayHoursFor(schedule: Schedule, date: Date): DayHours {
  return schedule[periodFor(date)][date.getDay()];
}

/** A Date at `minutes` past midnight on the same calendar day as `ref`. */
function at(ref: Date, minutes: number): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  d.setMinutes(minutes);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Resolve a venue's opening state at `now` from its schedule: whether it's open,
 * today's window, and — when closed — the next opening moment (scanning up to a
 * week ahead, re-evaluating the period for each future day).
 */
function resolveHours(now: Date, schedule: Schedule): CampusHours {
  const period = periodFor(now);
  const today = dayHoursFor(schedule, now);
  const todayOpen = today ? at(now, today.open) : null;
  const todayClose = today ? at(now, today.close) : null;
  const open = !!(todayOpen && todayClose && now >= todayOpen && now < todayClose);

  let nextOpen: Date | null = null;
  if (!open) {
    if (todayOpen && now < todayOpen) {
      nextOpen = todayOpen;
    } else {
      for (let i = 1; i <= 7; i++) {
        const d = addDays(now, i);
        const h = dayHoursFor(schedule, d);
        if (h) {
          nextOpen = at(d, h.open);
          break;
        }
      }
    }
  }

  return { period, open, todayOpen, todayClose, nextOpen };
}

/** Opening state of the general classroom buildings at `now`. */
export function getCampusHours(now: Date): CampusHours {
  return resolveHours(now, CAMPUS);
}

/** Opening state of the Library (building G) at `now` — its own schedule. */
export function getLibraryHours(now: Date): CampusHours {
  return resolveHours(now, LIBRARY);
}
