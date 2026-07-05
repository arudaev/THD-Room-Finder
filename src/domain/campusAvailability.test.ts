import { describe, expect, it } from 'vitest';
import { buildingAvailability } from './campusAvailability';
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

  it('omits keys with no matching live rooms so the map falls back to static counts', () => {
    const a1 = room({ ident: 'a1', building: 'A' });
    const avail = buildingAvailability([a1], []);

    expect(avail).not.toHaveProperty('G');
    expect(avail).not.toHaveProperty('HS');
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
