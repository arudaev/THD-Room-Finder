/**
 * Presentation formatting — turns availability into the short strings the
 * design-system components expect (RoomCard/StatusCard `duration`, meta lines).
 * Kept framework-free so it's unit-testable and reusable across screens.
 */
import type { FreeRoom, Room, RoomAvailability, RoomStatus } from './models';

const MS_PER_MINUTE = 60_000;

/** Local 24h clock, e.g. "11:30". */
export function formatTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(date.getHours())}:${p(date.getMinutes())}`;
}

/**
 * A whole-minute duration as the departure-board hero: "all day" for open-ended,
 * "2h 10m" / "3h" / "25m" otherwise.
 */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'all day';
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** The RoomCard duration hero for a free room at `now`. */
export function freeRoomDuration(free: FreeRoom, now: Date): string {
  if (free.freeUntil === null) return 'all day';
  return formatDuration((free.freeUntil.getTime() - now.getTime()) / MS_PER_MINUTE);
}

/** RoomCard identity meta line, e.g. "Building A · 45 seats". */
export function roomMeta(room: Room): string {
  const seats = room.seatsRegular > 0 ? `${room.seatsRegular} seats` : null;
  return [`Building ${room.building}`, seats].filter(Boolean).join(' · ');
}

export interface StatusText {
  status: RoomStatus;
  title: string;
  sub?: string;
  duration?: string;
}

/** StatusCard copy for a room-detail banner from its computed availability. */
export function statusBannerText(a: RoomAvailability, now: Date): StatusText {
  if (a.status === 'occupied') {
    return {
      status: 'occupied',
      title: 'Occupied now',
      sub: a.occupiedUntil ? `Free again at ${formatTime(a.occupiedUntil)}` : undefined,
      duration: a.occupiedUntil ? `until ${formatTime(a.occupiedUntil)}` : undefined,
    };
  }
  if (a.freeUntil === null) {
    return { status: 'free', title: 'Free now', sub: 'Free for the rest of the day', duration: 'all day' };
  }
  const minutes = (a.freeUntil.getTime() - now.getTime()) / MS_PER_MINUTE;
  return {
    status: a.status, // free | soon
    title: a.status === 'soon' ? 'Closing soon' : 'Free now',
    sub: `Free until ${formatTime(a.freeUntil)}`,
    duration: formatDuration(minutes),
  };
}
