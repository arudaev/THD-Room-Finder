import { describe, expect, it } from 'vitest';
import type { Room, ScheduledEvent } from './models';
import { searchRooms } from './roomSearch';

function makeRoom(over: Partial<Room> & { ident: string }): Room {
  return {
    id: 1,
    name: 'B004 - Seminarraum',
    code: 'B004',
    building: 'B',
    floor: 0,
    displayName: 'Seminarraum',
    seatsRegular: 30,
    seatsExam: 0,
    facilities: [],
    bookable: false,
    inChargeName: null,
    inChargeEmail: null,
    untisLongname: null,
    ...over,
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

const now = new Date('2026-07-06T10:00:00'); // Monday 10:00

describe('searchRooms', () => {
  it('finds a room by code even while it is occupied, and reports when it frees', () => {
    const room = makeRoom({ ident: 'b004', name: 'B004 - Seminarraum', code: 'B004', building: 'B' });
    const events = [event('b004', '2026-07-06T09:00:00', 120)]; // busy 09:00–11:00

    const [hit] = searchRooms([room], events, 'B004', now);
    expect(hit.room.ident).toBe('b004');
    expect(hit.availability.status).toBe('occupied');
    expect(hit.availability.occupiedUntil).toEqual(new Date('2026-07-06T11:00:00'));
  });

  it('matches equipment across languages: "projector" finds a room tagged Beamer', () => {
    const withBeamer = makeRoom({ ident: 'a1', code: 'A101', facilities: ['Beamer', 'Whiteboard'] });
    const without = makeRoom({ ident: 'a2', code: 'A102', facilities: [] });

    const hits = searchRooms([withBeamer, without], [], 'projector', now);
    expect(hits.map((h) => h.room.ident)).toEqual(['a1']);
  });

  it('is case- and umlaut-insensitive', () => {
    const room = makeRoom({ ident: 'h1', code: 'HS1', name: 'HS1 - Hörsaal', displayName: 'Hörsaal' });
    expect(searchRooms([room], [], 'hoersaal', now)).toHaveLength(1);
    expect(searchRooms([room], [], 'HÖRSAAL', now)).toHaveLength(1);
  });

  it('never returns excluded venues', () => {
    const gym = makeRoom({ ident: 'g1', name: 'A - Turnhalle', code: 'A', displayName: 'Turnhalle' });
    expect(searchRooms([gym], [], 'turnhalle', now)).toHaveLength(0);
  });

  it('respects the eligible-idents (teaching-room) filter', () => {
    const room = makeRoom({ ident: 'b004', code: 'B004' });
    expect(searchRooms([room], [], 'B004', now, { eligibleIdents: new Set() })).toHaveLength(0);
    expect(searchRooms([room], [], 'B004', now, { eligibleIdents: new Set(['b004']) })).toHaveLength(1);
  });

  it('ranks free rooms ahead of occupied ones', () => {
    const free = makeRoom({ ident: 'f1', code: 'B010', building: 'B' });
    const busy = makeRoom({ ident: 'f2', code: 'B011', building: 'B' });
    const events = [event('f2', '2026-07-06T09:00:00', 120)];

    const hits = searchRooms([busy, free], events, 'B01', now);
    expect(hits.map((h) => h.room.code)).toEqual(['B010', 'B011']);
    expect(hits[0].availability.status).toBe('free');
  });

  it('returns nothing for an empty query', () => {
    expect(searchRooms([makeRoom({ ident: 'x' })], [], '   ', now)).toHaveLength(0);
  });
});
