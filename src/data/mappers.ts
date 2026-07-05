/**
 * DTO → domain mappers — faithful TS ports of `RoomMapper.kt` and
 * `PeriodMapper.kt` (the native app's trusted THabella parsing), plus the
 * derived `code` field the v2 list uses as its headline.
 */
import type { PeriodDto, RoomDto } from './dto';
import type { Room, ScheduledEvent } from '../domain/models';

function roomCode(name: string): string {
  return name.split(' - ')[0].trim();
}

function parseBuilding(name: string): string {
  const firstPart = roomCode(name).split(' ')[0];
  const letters = firstPart.match(/^[A-Za-z]+/)?.[0];
  return letters && letters.length > 0 ? letters : firstPart;
}

function parseFloor(name: string): number | null {
  const digits = roomCode(name).replace(/[^0-9]/g, '');
  return digits.length > 0 ? Number.parseInt(digits[0]!, 10) : null;
}

function parseDisplayName(name: string): string {
  const idx = name.indexOf(' - ');
  return idx !== -1 ? name.slice(idx + 3).trim() : name.trim();
}

function parseFacilities(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function nonBlank(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toRoom(dto: RoomDto): Room {
  const name = dto.name ?? '';
  const fullChargeName = dto.inCharge
    ? `${dto.inCharge.firstname ?? ''} ${dto.inCharge.lastname ?? ''}`.trim()
    : '';

  return {
    id: dto.id,
    ident: dto.ident,
    name,
    code: roomCode(name),
    building: parseBuilding(name),
    floor: parseFloor(name),
    displayName: parseDisplayName(name),
    seatsRegular: dto.seatsRegular ?? 0,
    seatsExam: dto.seatsExam ?? 0,
    facilities: parseFacilities(dto.facilities),
    bookable: dto.bookable ?? false,
    inChargeName: fullChargeName.length > 0 ? fullChargeName : null,
    inChargeEmail: nonBlank(dto.inCharge?.email),
    untisLongname: nonBlank(dto.untisLongname),
  };
}

export function toRooms(dtos: RoomDto[]): Room[] {
  return dtos.map(toRoom);
}

/**
 * One PeriodDto references N rooms via its room_ident map, so this expands to
 * one ScheduledEvent per room. Invalid/undated periods are dropped.
 */
export function toEvents(dtos: PeriodDto[]): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  for (const dto of dtos) {
    // THabella returns "yyyy-MM-dd HH:mm" (local); make it ISO-local for Date.
    const iso = (dto.startDateTime ?? '').replace(' ', 'T');
    const start = new Date(iso);
    if (Number.isNaN(start.getTime())) continue;

    const end = new Date(start.getTime() + (dto.duration ?? 0) * 60_000);
    const roomMap = dto.room_ident ?? dto.roomIdent ?? {};

    for (const [ident, roomName] of Object.entries(roomMap)) {
      events.push({
        id: dto.id,
        roomIdent: ident,
        roomName: roomName ?? null,
        startDateTime: start,
        endDateTime: end,
        durationMinutes: dto.duration ?? 0,
        eventType: dto.eventTypeDescription ?? 'Unknown',
      });
    }
  }
  return events;
}
