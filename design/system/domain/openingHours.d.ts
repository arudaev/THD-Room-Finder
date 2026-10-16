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
/** The active hours table for `date`. */
export declare function periodFor(date: Date): CampusPeriod;
/** Opening state of the general classroom buildings at `now`. */
export declare function getCampusHours(now: Date): CampusHours;
/** Whole-day classroom closure, not whether the doors are open at this hour.
 * No dated holiday/closure calendar is currently available in the repository.
 * Reduced semester-break weekdays remain study days; library hours do not apply.
 */
export declare function isCampusClosedDay(date: Date): boolean;
/** Opening state of the Library (building G) at `now` — its own schedule. */
export declare function getLibraryHours(now: Date): CampusHours;
/** Opening state of the Mensa canteen (building F, 1st floor lunch service) at `now`. */
export declare function getMensaCanteenHours(now: Date): CampusHours;
/** True when `key` is a cafeteria with published STWNO hours. */
export declare function isCafeteria(key: string): boolean;
/** Opening state of a cafeteria (map key GH / F / K) at `now`, or null if `key`
 *  is not a known cafeteria. */
export declare function getCafeteriaHours(now: Date, key: string): CampusHours | null;
/** Opening state of the copy shop (building C, room C 012) at `now`. */
export declare function getCopyShopHours(now: Date): CampusHours;
