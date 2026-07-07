import { describe, expect, it } from 'vitest';
import {
  buildingAvailability,
  CAMPUS_KEY_TO_BUILDINGS,
  campusKeyForRoom,
  isOnCampusMap,
} from './campusAvailability';
import type { FreeRoom, Room } from './models';

function room(partial: Partial<Room> & Pick<Room, 'ident' | 'building'>): Room {
  return {
    id: 0,
    name: `${partial.building} room`,
    code: partial.ident,
    floor: 0,
    displayName: '',
    seatsRegular: 10,
    seatsExam: 0,
    facilities: [],
    bookable: true,
    inChargeName: null,
    inChargeEmail: null,
    untisLongname: null,
    ...partial,
  };
}

const free = (r: Room): FreeRoom => ({ room: r, freeUntil: null });

describe('buildingAvailability', () => {
  it('counts free-of-total per campus building key', () => {
    const a1 = room({ ident: 'a1', building: 'A' });
    const a2 = room({ ident: 'a2', building: 'A' });
    const b1 = room({ ident: 'b1', building: 'B' });
    const rooms = [a1, a2, b1];

    const avail = buildingAvailability(rooms, [free(a1)]);

    expect(avail.A).toEqual({ free: 1, total: 2 });
    expect(avail.B).toEqual({ free: 0, total: 1 });
  });

  it('folds the parsed "ITC" building onto the ITC² map key', () => {
    const itc = room({ ident: 'itc1', building: 'ITC' });
    const avail = buildingAvailability([itc], [free(itc)]);

    expect(avail.ITC2).toEqual({ free: 1, total: 1 });
  });

  it('separates ITC²+ from ITC² despite their shared parsed building code', () => {
    const itc2 = room({ ident: 'itc2', building: 'ITC', name: 'ITC 2: sem(1)' });
    const itc2Plus = room({ ident: 'itc2p', building: 'ITC', name: 'ITC 2+ 0.27' });

    const avail = buildingAvailability([itc2, itc2Plus], [free(itc2Plus)]);

    expect(campusKeyForRoom(itc2)).toBe('ITC2');
    expect(campusKeyForRoom(itc2Plus)).toBe('ITC2P');
    expect(avail.ITC2).toEqual({ free: 0, total: 1 });
    expect(avail.ITC2P).toEqual({ free: 1, total: 1 });
  });

  it('returns neutral live counts for every footprint without matching rooms', () => {
    const a1 = room({ ident: 'a1', building: 'A' });
    const avail = buildingAvailability([a1], []);

    expect(Object.keys(avail).sort()).toEqual(Object.keys(CAMPUS_KEY_TO_BUILDINGS).sort());
    expect(avail.A).toEqual({ free: 0, total: 1 });
    expect(avail.G).toEqual({ free: 0, total: 0 });
    expect(avail.HS).toEqual({ free: 0, total: 0 });
  });

  it('reports every live building as closed when no rooms are free', () => {
    const j = room({ ident: 'j1', building: 'J', name: 'J103' });
    const itc2Plus = room({ ident: 'itc2p', building: 'ITC', name: 'ITC 2+ 0.27' });

    const avail = buildingAvailability([j, itc2Plus], []);

    expect(avail.J).toEqual({ free: 0, total: 1 });
    expect(avail.ITC2P).toEqual({ free: 0, total: 1 });
  });

  it('respects the teaching-eligibility set when counting totals', () => {
    const a1 = room({ ident: 'a1', building: 'A' });
    const office = room({ ident: 'a2', building: 'A' });
    const eligible = new Set(['a1']);

    const avail = buildingAvailability([a1, office], [free(a1)], eligible);

    expect(avail.A).toEqual({ free: 1, total: 1 });
  });

  it('excludes non-study venues (e.g. Turnhalle) from totals', () => {
    const gym = room({ ident: 'g1', building: 'A', name: 'A - Turnhalle' });
    const lab = room({ ident: 'a1', building: 'A', name: 'A008 - Labor' });

    const avail = buildingAvailability([gym, lab], [free(lab)]);

    expect(avail.A).toEqual({ free: 1, total: 1 });
  });
});

describe('isOnCampusMap', () => {
  it('accepts a mapped Deggendorf room', () => {
    expect(isOnCampusMap(room({ ident: 'a1', building: 'A', name: 'A 0.13 Hörsaal' }))).toBe(true);
  });

  it('rejects a remote Cham/Badstraße room that reuses a Deggendorf letter', () => {
    const cham = room({ ident: 'c1', building: 'A', name: 'A 0.13 Hörsaal Zollner (Badstraße)' });
    expect(campusKeyForRoom(cham)).toBe('A'); // collides with the core A footprint…
    expect(isOnCampusMap(cham)).toBe(false); // …but the marker keeps it off the map
  });

  it('rejects a Pfarrkirchen/ECRI room', () => {
    expect(isOnCampusMap(room({ ident: 'p1', building: 'B', name: 'B1 (Pfarrkirchen)' }))).toBe(false);
  });

  it('rejects rooms whose building has no footprint', () => {
    expect(isOnCampusMap(room({ ident: 'x1', building: 'DMS', name: 'DMS 1.01' }))).toBe(false);
  });
});
