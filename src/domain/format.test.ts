import { describe, it, expect } from 'vitest';
import { formatDuration, formatTime, statusBannerText } from './format';

describe('formatDuration', () => {
  it('formats hours and minutes, dropping zero parts', () => {
    expect(formatDuration(130)).toBe('2h 10m');
    expect(formatDuration(180)).toBe('3h');
    expect(formatDuration(25)).toBe('25m');
    expect(formatDuration(null)).toBe('all day');
    expect(formatDuration(-5)).toBe('0m');
  });
});

describe('formatTime', () => {
  it('renders a zero-padded 24h clock', () => {
    expect(formatTime(new Date('2026-07-06T09:05:00'))).toBe('09:05');
    expect(formatTime(new Date('2026-07-06T14:30:00'))).toBe('14:30');
  });
});

describe('statusBannerText', () => {
  const now = new Date('2026-07-06T10:00:00');
  it('describes an occupied room', () => {
    const t = statusBannerText(
      { status: 'occupied', freeUntil: null, occupiedUntil: new Date('2026-07-06T11:30:00') },
      now,
    );
    expect(t.title).toBe('Occupied now');
    expect(t.duration).toBe('until 11:30');
  });
  it('describes a free-all-day room', () => {
    const t = statusBannerText({ status: 'free', freeUntil: null, occupiedUntil: null }, now);
    expect(t.duration).toBe('all day');
  });
  it('describes a closing-soon room', () => {
    const t = statusBannerText(
      { status: 'soon', freeUntil: new Date('2026-07-06T10:25:00'), occupiedUntil: null },
      now,
    );
    expect(t.title).toBe('Closing soon');
    expect(t.duration).toBe('25m');
  });
});
