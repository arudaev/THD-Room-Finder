import { describe, expect, it } from 'vitest';
import {
  getCafeteriaHours,
  getCampusHours,
  getCopyShopHours,
  getLibraryHours,
  getMensaCanteenHours,
  isCafeteria,
  periodFor,
} from './openingHours';

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

describe('getCafeteriaHours', () => {
  it('recognises the cafeteria map keys', () => {
    expect(isCafeteria('GH')).toBe(true);
    expect(isCafeteria('F')).toBe(true);
    expect(isCafeteria('K')).toBe(true);
    expect(isCafeteria('A')).toBe(false);
    expect(getCafeteriaHours(dt(2026, 5, 13, 10, 0), 'A')).toBeNull();
  });

  it('opens the Glashaus Mon–Fri 07:30–14:00 in term/exam', () => {
    const h = getCafeteriaHours(dt(2026, 5, 13, 10, 0), 'GH')!; // Wed regular
    expect(h.open).toBe(true);
    expect(h.todayOpen).toEqual(dt(2026, 5, 13, 7, 30));
    expect(h.todayClose).toEqual(dt(2026, 5, 13, 14, 0));
    expect(getCafeteriaHours(dt(2026, 5, 13, 14, 30), 'GH')!.open).toBe(false);
  });

  it('shortens the Glashaus to 07:30–12:00 during the break', () => {
    const h = getCafeteriaHours(dt(2026, 8, 12, 11, 0), 'GH')!; // Wed break
    expect(h.period).toBe('break');
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 8, 12, 12, 0));
  });

  it('closes the Mensa cafeteria earlier on Fridays (15:30)', () => {
    expect(getCafeteriaHours(dt(2026, 5, 13, 16, 30), 'F')!.open).toBe(true); // Wed 17:00
    const fri = getCafeteriaHours(dt(2026, 5, 15, 16, 0), 'F')!; // Fri after 15:30
    expect(fri.open).toBe(false);
    expect(getCafeteriaHours(dt(2026, 5, 15, 15, 0), 'F')!.todayClose).toEqual(
      dt(2026, 5, 15, 15, 30),
    );
  });

  it('opens the Kaffeebar 09:30–13:30 in term but is closed over the break', () => {
    const term = getCafeteriaHours(dt(2026, 5, 13, 10, 0), 'K')!; // Wed regular
    expect(term.open).toBe(true);
    expect(term.todayClose).toEqual(dt(2026, 5, 13, 13, 30));
    expect(getCafeteriaHours(dt(2026, 8, 12, 11, 0), 'K')!.open).toBe(false); // Aug break
  });
});

describe('getMensaCanteenHours', () => {
  it('serves lunch 11:00–14:15 in term/exam, distinct from the ground-floor café', () => {
    const h = getMensaCanteenHours(dt(2026, 5, 13, 12, 0)); // Wed regular, mid-lunch
    expect(h.open).toBe(true);
    expect(h.todayOpen).toEqual(dt(2026, 5, 13, 11, 0));
    expect(h.todayClose).toEqual(dt(2026, 5, 13, 14, 15));
  });

  it('is closed before 11:00 and after 14:15, even though the café is still open', () => {
    const before = getMensaCanteenHours(dt(2026, 5, 13, 8, 0)); // café is open 07:30–17:00
    expect(before.open).toBe(false);
    expect(before.nextOpen).toEqual(dt(2026, 5, 13, 11, 0));

    const after = getMensaCanteenHours(dt(2026, 5, 13, 15, 0)); // café still open until 17:00
    expect(after.open).toBe(false);
  });

  it('shortens to 11:00–14:00 during the break', () => {
    const h = getMensaCanteenHours(dt(2026, 8, 12, 13, 30)); // Wed break
    expect(h.period).toBe('break');
    expect(h.open).toBe(true);
    expect(h.todayClose).toEqual(dt(2026, 8, 12, 14, 0));
  });
});

describe('getCopyShopHours', () => {
  it('opens Mon–Thu 09:00–14:00 in term/exam', () => {
    const h = getCopyShopHours(dt(2026, 5, 13, 10, 0)); // Wed regular
    expect(h.open).toBe(true);
    expect(h.todayOpen).toEqual(dt(2026, 5, 13, 9, 0));
    expect(h.todayClose).toEqual(dt(2026, 5, 13, 14, 0));
  });

  it('is closed on Fridays and weekends', () => {
    const fri = getCopyShopHours(dt(2026, 5, 15, 10, 0)); // Fri
    expect(fri.open).toBe(false);
    expect(fri.nextOpen).toEqual(dt(2026, 5, 18, 9, 0)); // next Mon

    const sat = getCopyShopHours(dt(2026, 5, 16, 10, 0)); // Sat
    expect(sat.open).toBe(false);
  });

  it('is closed during the semester break (no published break hours)', () => {
    const h = getCopyShopHours(dt(2026, 8, 12, 11, 0)); // Wed break
    expect(h.period).toBe('break');
    expect(h.open).toBe(false);
  });
});
