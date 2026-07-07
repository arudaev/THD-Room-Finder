/**
 * Campus clock — THD is in Deggendorf, Bavaria, and THabella reports every event
 * in local (Europe/Berlin) wall-clock time. All availability and opening-hours
 * reasoning must therefore run on the Deggendorf wall clock, NOT the device's —
 * otherwise a phone set to another timezone would compute the wrong "now" and
 * show rooms as free when they're occupied (or closed).
 *
 * The rest of the domain reads a Date's *local* fields (getHours/getDate/…) and
 * parses THabella's "yyyy-MM-dd HH:mm" strings the same way. To stay consistent
 * without a date library, we express "now" as a Date whose local fields already
 * hold the Deggendorf wall-clock time. Absolute-instant comparisons (getTime())
 * still line up, because events are parsed into the same shifted frame.
 *
 * Framework-free (domain layer).
 */

/** THD's timezone. */
export const CAMPUS_TIME_ZONE = 'Europe/Berlin';

/**
 * Re-express an instant as a Date whose *local* fields equal the wall-clock time
 * in Deggendorf at that instant. On a device already set to Europe/Berlin this
 * is a no-op in effect; elsewhere it shifts the fields so downstream local-field
 * math reflects Deggendorf, not the device.
 */
export function toCampusWallClock(instant: Date): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const f = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const hour = f('hour') % 24; // some engines emit '24' for midnight
  return new Date(f('year'), f('month') - 1, f('day'), hour, f('minute'), f('second'));
}

/** The current moment as Deggendorf wall-clock time (see module docs). */
export function campusNow(): Date {
  return toCampusWallClock(new Date());
}
