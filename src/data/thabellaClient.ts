/**
 * THabella data client. One source of truth for both targets:
 *   • Web  — calls the same-origin Vercel proxy under `/api` (see `api/*.js`),
 *            which adds CORS + caching in front of THabella.
 *   • Android (Capacitor) — calls THabella directly via the native HTTP bridge,
 *            bypassing browser CORS and preserving the "no backend" promise.
 *
 * All results are cached (localStorage) and fall back to stale data on network
 * failure, so the app opens instantly and works offline.
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { PeriodDto, RoomDto } from './dto';
import type { Room, ScheduledEvent } from '../domain/models';
import { toEvents, toRooms } from './mappers';
import { mondayOf, teachingRoomIdents, weekDates } from '../domain/teachingRooms';
import { readFresh, readStale, write } from './cache';

const THABELLA = 'https://thabella.th-deg.de/thabella/opn';
/** Same-origin on web; empty base yields relative `/api/...`. */
const API_BASE = '';

const ROOMS_TTL_MS = 24 * 60 * 60 * 1000;
const EVENTS_TTL_MS = 5 * 60 * 1000;
const TEACHING_TTL_MS = 24 * 60 * 60 * 1000;

/** THabella date format: "YYYY-MM-DD HH:mm" (local). */
export function toSqlDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}`
  );
}

function dateKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// ── Raw network (platform-specific) ─────────────────────────────

async function rawRooms(): Promise<RoomDto[]> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({
      url: `${THABELLA}/room/findRooms`,
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`rooms HTTP ${res.status}`);
    return res.data as RoomDto[];
  }
  const res = await fetch(`${API_BASE}/api/rooms`);
  if (!res.ok) throw new Error(`rooms HTTP ${res.status}`);
  return (await res.json()) as RoomDto[];
}

async function rawPeriods(sqlDate: string): Promise<PeriodDto[]> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({
      url: `${THABELLA}/period/findByDate/${encodeURIComponent(sqlDate)}`,
      headers: { 'Content-Type': 'application/json' },
      data: { sqlDate },
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`periods HTTP ${res.status}`);
    return res.data as PeriodDto[];
  }
  const res = await fetch(`${API_BASE}/api/periods?date=${encodeURIComponent(sqlDate)}`);
  if (!res.ok) throw new Error(`periods HTTP ${res.status}`);
  return (await res.json()) as PeriodDto[];
}

// ── Cached, mapped accessors ────────────────────────────────────

export async function getRooms(): Promise<Room[]> {
  const key = 'thd_rooms';
  const fresh = readFresh<RoomDto[]>(key, ROOMS_TTL_MS);
  if (fresh) return toRooms(fresh);
  try {
    const dtos = await rawRooms();
    write(key, dtos);
    return toRooms(dtos);
  } catch (err) {
    const stale = readStale<RoomDto[]>(key);
    if (stale) return toRooms(stale);
    throw err;
  }
}

/** All events on the calendar day of `date` (one THabella query). */
export async function getEventsForDate(date: Date): Promise<ScheduledEvent[]> {
  const sql = toSqlDate(date);
  const key = `thd_events_${dateKey(date)}`;
  const fresh = readFresh<PeriodDto[]>(key, EVENTS_TTL_MS);
  if (fresh) return toEvents(fresh);
  try {
    const dtos = await rawPeriods(sql);
    write(key, dtos);
    return toEvents(dtos);
  } catch (err) {
    const stale = readStale<PeriodDto[]>(key);
    if (stale) return toEvents(stale);
    throw err;
  }
}

/**
 * The teaching-room set for the current real-world week (Mon–Fri): every room
 * that hosts ≥1 event. Cached 24h keyed by the week's Monday — this is the
 * display-eligibility filter that hides offices and always-closed spaces.
 */
export async function getTeachingRoomIdents(
  reference: Date = new Date(),
): Promise<Set<string>> {
  const key = `thd_teaching_${dateKey(mondayOf(reference))}`;
  const fresh = readFresh<string[]>(key, TEACHING_TTL_MS);
  if (fresh) return new Set(fresh);
  try {
    const perDay = await Promise.all(weekDates(reference).map(getEventsForDate));
    const idents = teachingRoomIdents(perDay.flat());
    write(key, [...idents]);
    return idents;
  } catch (err) {
    const stale = readStale<string[]>(key);
    if (stale) return new Set(stale);
    throw err;
  }
}
