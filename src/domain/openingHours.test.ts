import { describe, expect, it } from 'vitest';
import { getCampusHours, getLibraryHours, periodFor } from './openingHours';

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
  it('opens general buildings at 07:00 on a regular weekday', () => {
    const h = getCampusHours(dt(2026, 5, 13, 7, 15)); // Wed, just after open
    expect(h.open).toBe(true);
    expect(h.todayOpen).toEqual(dt(2026, 5, 13, 7, 0));
    expect(h.todayClose).toEqual(dt(2026, 5, 13, 20, 0));
  });

  it('stays open on a regular Friday evening until 20:00', () => {
    const h = getCampusHours(dt(2026, 5, 15, 19, 0)); // Fri
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 5, 15, 20, 0));
  });

  it('is closed on a regular Saturday and points to Monday 07:00', () => {
    const h = getCampusHours(dt(2026, 5, 16, 12, 0)); // Sat
    expect(h.open).toBe(false);
    expect(h.nextOpen).toEqual(dt(2026, 5, 18, 7, 0)); // Mon
  });

  it('reports next opening later the same day when before opening time', () => {
    const h = getCampusHours(dt(2026, 5, 13, 6, 0)); // Wed pre-open
    expect(h.open).toBe(false);
    expect(h.nextOpen).toEqual(dt(2026, 5, 13, 7, 0));
  });

  it('keeps normal weekday hours during the exam window (Library stays late)', () => {
    const h = getCampusHours(dt(2026, 7, 1, 19, 0)); // Wed in exam window
    expect(h.period).toBe('exam');
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 7, 1, 20, 0));
  });

  it('is closed on an exam-period Saturday (only the Library opens weekends)', () => {
    const h = getCampusHours(dt(2026, 7, 4, 19, 0)); // Sat in exam window
    expect(h.period).toBe('exam');
    expect(h.open).toBe(false);
  });

  it('uses reduced hours during the semester break', () => {
    const h = getCampusHours(dt(2026, 8, 12, 15, 0)); // Wed in Aug break
    expect(h.period).toBe('break');
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 8, 12, 16, 30));
  });
});

describe('getLibraryHours', () => {
  it('opens at 08:30 on a regular weekday, not 07:00', () => {
    const early = getLibraryHours(dt(2026, 5, 13, 7, 30)); // Wed before library open
    expect(early.open).toBe(false);
    expect(early.nextOpen).toEqual(dt(2026, 5, 13, 8, 30));
    const later = getLibraryHours(dt(2026, 5, 13, 9, 0));
    expect(later.open).toBe(true);
    expect(later.todayClose).toEqual(dt(2026, 5, 13, 20, 0));
  });

  it('closes at 18:00 on a regular Friday', () => {
    const h = getLibraryHours(dt(2026, 5, 15, 19, 0)); // Fri after library close
    expect(h.open).toBe(false);
    expect(getLibraryHours(dt(2026, 5, 15, 17, 0)).todayClose).toEqual(dt(2026, 5, 15, 18, 0));
  });

  it('is open on an exam-period Saturday evening until 23:45', () => {
    const h = getLibraryHours(dt(2026, 7, 4, 19, 37)); // Sat in exam window
    expect(h.period).toBe('exam');
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 7, 4, 23, 45));
  });
});
