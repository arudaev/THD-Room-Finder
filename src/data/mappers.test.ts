import { describe, it, expect } from 'vitest';
import { toRoom, toEvents } from './mappers';
import type { PeriodDto, RoomDto } from './dto';

describe('toRoom', () => {
  it('parses building, floor, code and display name from the THabella name', () => {
    const dto: RoomDto = {
      id: 1,
      ident: 'A008',
      name: 'A008 - Labor Informatik',
      seatsRegular: 45,
      facilities: 'Beamer, Whiteboard',
      inCharge: { firstname: 'Erika', lastname: 'Muster', email: 'erika@thd.de' },
    };
    const room = toRoom(dto);
    expect(room.building).toBe('A');
    expect(room.floor).toBe(0);
    expect(room.code).toBe('A008');
    expect(room.displayName).toBe('Labor Informatik');
    expect(room.seatsRegular).toBe(45);
    expect(room.facilities).toEqual(['Beamer', 'Whiteboard']);
    expect(room.inChargeName).toBe('Erika Muster');
    expect(room.inChargeEmail).toBe('erika@thd.de');
  });

  it('handles multi-token codes like "ITC 2: HS 2" and missing fields', () => {
    const room = toRoom({ id: 2, ident: 'ITC2HS2', name: 'ITC 2: HS 2' });
    expect(room.building).toBe('ITC');
    expect(room.displayName).toBe('ITC 2: HS 2');
    expect(room.seatsRegular).toBe(0);
    expect(room.inChargeName).toBeNull();
  });
});

describe('toEvents', () => {
  it('expands one period into one event per referenced room and drops undated ones', () => {
    const dtos: PeriodDto[] = [
      {
        id: 10,
        startDateTime: '2026-07-06 08:15',
        duration: 90,
        eventTypeDescription: 'Vorlesung',
        room_ident: { A008: 'A008 - Labor', B204: 'B204 - Raum' },
      },
      { id: 11, startDateTime: null, duration: 60, room_ident: { C102: 'C102' } },
    ];
    const events = toEvents(dtos);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.roomIdent).sort()).toEqual(['A008', 'B204']);
    const [a] = events;
    expect(a.startDateTime.getHours()).toBe(8);
    expect(a.endDateTime.getTime() - a.startDateTime.getTime()).toBe(90 * 60_000);
  });
});
