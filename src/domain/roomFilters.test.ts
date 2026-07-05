import { describe, expect, it } from 'vitest';
import { favoritesFirst, matchesRoomFilters, roomKind } from './roomFilters';
import type { FreeRoom, Room } from './models';

function room(partial: Partial<Room> & Pick<Room, 'ident' | 'name'>): Room {
  return {
    id: 0,
    code: partial.name.split(' - ')[0],
    building: 'A',
    floor: 0,
    displayName: partial.name,
    seatsRegular: 30,
    seatsExam: 0,
    facilities: [],
    bookable: true,
    inChargeName: null,
    inChargeEmail: null,
    untisLongname: null,
    ...partial,
  };
}

describe('roomKind', () => {
  it('classifies lecture halls from "Hörsaal"', () => {
    expect(roomKind(room({ ident: '1', name: 'B 0.13 Hörsaal 1' }))).toBe('lecture');
  });

  it('classifies computer labs from PC/Rechner markers', () => {
    expect(roomKind(room({ ident: '2', name: 'C010', facilities: ['24PC'] }))).toBe('computer');
    expect(roomKind(room({ ident: '3', name: 'K209 - Rechnerraum' }))).toBe('computer');
  });

  it('classifies hands-on labs from "Labor"', () => {
    expect(roomKind(room({ ident: '4', name: 'A008 - Labor' }))).toBe('lab');
    expect(roomKind(room({ ident: '5', name: 'D212 - Physiklabor' }))).toBe('lab');
  });

  it('treats a Hörsaal with a few PCs as a lecture hall (precedence)', () => {
    expect(roomKind(room({ ident: '6', name: 'B004 Kinohörsaal', facilities: ['12 PC-Plätze'] }))).toBe(
      'lecture',
    );
  });

  it('falls back to seminar for a plain classroom', () => {
    expect(roomKind(room({ ident: '7', name: 'A110' }))).toBe('seminar');
  });
});

describe('matchesRoomFilters', () => {
  it('hides seat-less rooms when withSeatsOnly is on', () => {
    const noSeats = room({ ident: '1', name: 'A008', seatsRegular: 0 });
    expect(matchesRoomFilters(noSeats, { withSeatsOnly: true, kind: 'all' })).toBe(false);
    expect(matchesRoomFilters(noSeats, { withSeatsOnly: false, kind: 'all' })).toBe(true);
  });

  it('restricts to a chosen kind', () => {
    const hall = room({ ident: '2', name: 'B 0.13 Hörsaal 1' });
    expect(matchesRoomFilters(hall, { withSeatsOnly: false, kind: 'lecture' })).toBe(true);
    expect(matchesRoomFilters(hall, { withSeatsOnly: false, kind: 'lab' })).toBe(false);
  });
});

describe('favoritesFirst', () => {
  const free = (ident: string): FreeRoom => ({ room: room({ ident, name: ident }), freeUntil: null });

  it('floats saved rooms to the top, keeping relative order', () => {
    const list = [free('a'), free('b'), free('c')];
    const out = favoritesFirst(list, (id) => id === 'c');
    expect(out.map((f) => f.room.ident)).toEqual(['c', 'a', 'b']);
  });

  it('returns the same list untouched when nothing is saved', () => {
    const list = [free('a'), free('b')];
    expect(favoritesFirst(list, () => false)).toBe(list);
  });
});
