// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cardTree } from '../api/card.js';
import { isCampusClosedDay } from '../src/domain/openingHours';

function elements(node) {
  return [node, ...(node.props?.children ?? []).flatMap((child) =>
    child && typeof child === 'object' ? elements(child) : [])];
}

describe('focus link-preview closures', () => {
  it.each([false, true])('matches the classroom calendar and keeps future slots (dark=%s)', (dark) => {
    // Start on a Wednesday to ensure dates, rather than grid rows, determine closure.
    const start = '2026-10-07';
    const tree = cardTree({ start, weeks: 2, today: 10, levels: Array(11).fill(4),
      dark, accent: 'orchid', lang: 'en', minutes: 275, streak: 5 }, 'https://example.test');
    const cells = elements(tree).filter((node) => node.props?.style?.marginBottom !== undefined);
    expect(cells).toHaveLength(14);
    for (let i = 0; i < cells.length; i++) {
      const date = new Date(2026, 9, 7 + i);
      const style = cells[i].props.style;
      if (i > 10) expect(style.background).toBe('transparent');
      else if (isCampusClosedDay(date)) expect(style.background).toBe(dark ? '#44464F' : '#C4C6D0');
      else expect(style.background).toBe(dark ? '#F3BCE6' : '#7E1F6E');
    }
    // Today is Saturday: still outlined as today, with a closed-day fill.
    expect(cells[10].props.style.border).toContain('3px solid');
  });
});

