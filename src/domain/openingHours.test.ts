import { describe, expect, it } from 'vitest';
import { getCampusHours, periodFor } from './openingHours';

// Local Date constructor (year, monthIndex, day, hours, minutes).
const dt = (y: number, m: number, d: number, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm);

describe('periodFor', () => {
  it('classifies the 2026 exam-prep window', () => {
    expect(periodFor(dt(2026, 6, 22))).toBe('exam');
    expect(periodFor(dt(2026, 7, 5))).toBe('exam');
    expect(periodFor(dt(2026, 7, 31))).toBe('exam');
  });

  it('classifies the semester breaks', () => {
    expect(periodFor(dt(2026, 2, 20))).toBe('break');
    expect(periodFor(dt(2026, 3, 14))).toBe('break');
    expect(periodFor(dt(2026, 8, 15))).toBe('break');
    expect(periodFor(dt(2026, 9, 30))).toBe('break');
  });

  it('falls back to regular semester hours otherwise', () => {
    expect(periodFor(dt(2026, 5, 12))).toBe('regular');
    expect(periodFor(dt(2026, 11, 3))).toBe('regular');
  });
});

describe('getCampusHours', () => {
  it('is open on a regular Wednesday afternoon and closes at 20:00', () => {
    const h = getCampusHours(dt(2026, 5, 13, 14, 0)); // Wed
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 5, 13, 20, 0));
  });

  it('is closed on a regular Saturday and points to Monday 08:30', () => {
    const h = getCampusHours(dt(2026, 5, 16, 12, 0)); // Sat
    expect(h.open).toBe(false);
    expect(h.nextOpen).toEqual(dt(2026, 5, 18, 8, 30)); // Mon
  });

  it('is open on an exam-period Saturday evening until 23:45', () => {
    const h = getCampusHours(dt(2026, 7, 4, 19, 37)); // Sat in exam window
    expect(h.period).toBe('exam');
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 7, 4, 23, 45));
  });

  it('reports next opening later the same day when before opening time', () => {
    const h = getCampusHours(dt(2026, 5, 13, 7, 0)); // Wed pre-open
    expect(h.open).toBe(false);
    expect(h.nextOpen).toEqual(dt(2026, 5, 13, 8, 30));
  });

  it('uses reduced hours during the semester break', () => {
    const h = getCampusHours(dt(2026, 8, 12, 15, 0)); // Wed in Aug break
    expect(h.period).toBe('break');
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 8, 12, 16, 30));
  });
});
