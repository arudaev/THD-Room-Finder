import { describe, it, expect } from 'vitest';
import { mondayOf, weekDates, teachingRoomIdents } from './teachingRooms';
import type { ScheduledEvent } from './models';

describe('mondayOf', () => {
  it('returns the Monday of the reference week for any weekday', () => {
    // 2026-07-08 is a Wednesday; 2026-07-05 is the Sunday before.
    expect(mondayOf(new Date('2026-07-08T09:00:00')).getDate()).toBe(6);
    expect(mondayOf(new Date('2026-07-05T23:00:00')).getDate()).toBe(29); // prev Mon (June 29)
  });
});

describe('weekDates', () => {
  it('yields five consecutive weekdays starting Monday', () => {
    const days = weekDates(new Date('2026-07-08T09:00:00'));
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.getDate())).toEqual([6, 7, 8, 9, 10]);
  });
});

describe('teachingRoomIdents', () => {
  it('unions every room that hosts an event', () => {
    const evs: ScheduledEvent[] = [
      { id: 1, roomIdent: 'A008', roomName: null, startDateTime: new Date(), endDateTime: new Date(), durationMinutes: 60, eventType: 'x' },
      { id: 2, roomIdent: 'B204', roomName: null, startDateTime: new Date(), endDateTime: new Date(), durationMinutes: 60, eventType: 'x' },
      { id: 3, roomIdent: 'A008', roomName: null, startDateTime: new Date(), endDateTime: new Date(), durationMinutes: 60, eventType: 'x' },
    ];
    const set = teachingRoomIdents(evs);
    expect([...set].sort()).toEqual(['A008', 'B204']);
  });
});
