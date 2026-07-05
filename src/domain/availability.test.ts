import { describe, it, expect } from 'vitest';
import type { Room, ScheduledEvent } from './models';
import {
  computeFreeRooms,
  computeRoomAvailability,
  freeStatus,
  getRoomSchedule,
} from './availability';

function makeRoom(ident: string, building: string, name: string): Room {
  return {
    id: ident.length,
    ident,
    name,
    code: name.split(' - ')[0],
    building,
    floor: 0,
    displayName: name,
    seatsRegular: 30,
    seatsExam: 0,
    facilities: [],
    bookable: false,
    inChargeName: null,
    inChargeEmail: null,
    untisLongname: null,
  };
}

function event(ident: string, start: string, durationMin: number): ScheduledEvent {
  const startDate = new Date(start);
  return {
    id: 1,
    roomIdent: ident,
    roomName: ident,
    startDateTime: startDate,
    endDateTime: new Date(startDate.getTime() + durationMin * 60_000),
    durationMinutes: durationMin,
    eventType: 'Vorlesung',
  };
}

const now = new Date('2026-07-06T10:00:00');

describe('computeFreeRooms', () => {
  const rooms = [
    makeRoom('a', 'B', 'B204 - Raum'), // fills at 12:10 → 2h10m
    makeRoom('b', 'ITC', 'ITC1.07 - Lab'), // no future events → all day
    makeRoom('c', 'J', 'J213 - Raum'), // fills at 10:25 → soon
    makeRoom('d', 'A', 'A008 - Labor'), // occupied now → excluded
  ];
  const events = [
    event('a', '2026-07-06T12:10:00', 90),
    event('c', '2026-07-06T10:25:00', 90),
    event('d', '2026-07-06T09:00:00', 120),
  ];

  it('excludes occupied rooms and ranks longest-free first', () => {
    const free = computeFreeRooms(rooms, events, now);
    expect(free.map((f) => f.room.ident)).toEqual(['b', 'a', 'c']);
    expect(free.find((f) => f.room.ident === 'b')!.freeUntil).toBeNull();
  });

  it('drops non-study venues (pool, stadium, forecourt) even when free', () => {
    const withPool = [...rooms, makeRoom('pool', 'SP', 'Schwimmbad - Hallenbad')];
    const free = computeFreeRooms(withPool, events, now);
    expect(free.some((f) => f.room.ident === 'pool')).toBe(false);
  });

  it('restricts to eligible (teaching) idents when provided', () => {
    const free = computeFreeRooms(rooms, events, now, {
      eligibleIdents: new Set(['a', 'b']),
    });
    expect(free.map((f) => f.room.ident)).toEqual(['b', 'a']);
  });
});

describe('computeRoomAvailability', () => {
  it('reports occupied with the time it frees up', () => {
    const a = computeRoomAvailability([event('d', '2026-07-06T09:00:00', 120)], now);
    expect(a.status).toBe('occupied');
    expect(a.occupiedUntil).toEqual(new Date('2026-07-06T11:00:00'));
  });

  it('flags a soon-to-close room as "soon"', () => {
    const a = computeRoomAvailability([event('c', '2026-07-06T10:25:00', 90)], now);
    expect(a.status).toBe('soon'); // 25 min ≤ 40 min threshold
    expect(a.freeUntil).toEqual(new Date('2026-07-06T10:25:00'));
  });

  it('is free-all-day when there are no more events', () => {
    expect(computeRoomAvailability([], now).status).toBe('free');
  });
});

describe('freeStatus threshold', () => {
  it('is free above the threshold and soon at/under it', () => {
    expect(freeStatus(new Date('2026-07-06T12:00:00'), now)).toBe('free');
    expect(freeStatus(new Date('2026-07-06T10:30:00'), now)).toBe('soon');
    expect(freeStatus(null, now)).toBe('free');
  });
});

describe('getRoomSchedule', () => {
  it('returns a room’s events in chronological order', () => {
    const evs = [
      event('a', '2026-07-06T14:00:00', 60),
      event('a', '2026-07-06T08:00:00', 60),
      event('b', '2026-07-06T09:00:00', 60),
    ];
    const schedule = getRoomSchedule(evs, 'a');
    expect(schedule.map((e) => e.startDateTime.getHours())).toEqual([8, 14]);
  });
});
