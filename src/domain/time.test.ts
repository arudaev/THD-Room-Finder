import { describe, expect, it } from 'vitest';
import { toCampusWallClock } from './time';

describe('toCampusWallClock', () => {
  it('re-expresses an instant with Deggendorf wall-clock in local fields', () => {
    // 2026-07-07 12:00 UTC → 14:00 in Europe/Berlin (CEST, +02:00).
    const instant = new Date('2026-07-07T12:00:00Z');
    const wall = toCampusWallClock(instant);
    expect(wall.getFullYear()).toBe(2026);
    expect(wall.getMonth()).toBe(6); // July
    expect(wall.getDate()).toBe(7);
    expect(wall.getHours()).toBe(14);
    expect(wall.getMinutes()).toBe(0);
  });

  it('rolls the date forward when Berlin is already on the next day', () => {
    // 2026-01-01 23:30 UTC → 00:30 on Jan 2 in Europe/Berlin (CET, +01:00).
    const wall = toCampusWallClock(new Date('2026-01-01T23:30:00Z'));
    expect(wall.getFullYear()).toBe(2026);
    expect(wall.getMonth()).toBe(0);
    expect(wall.getDate()).toBe(2);
    expect(wall.getHours()).toBe(0);
    expect(wall.getMinutes()).toBe(30);
  });
});
