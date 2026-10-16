import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { IconButton } from '../core/IconButton';
import { IconShare } from './focusIcons';
import { isCampusClosedDay } from '../../domain/openingHours';

/**
 * The Profile hero (D2): a contribution graph of focus minutes. Square cells,
 * seven rows Sun → Sat, one column per week, the current week rightmost, today
 * outlined, days after today left as empty slots. Five levels from the
 * --md-graph-0…4 ramp (it follows the student's graph colour via data-accent).
 * Cell size follows the card width; every layout scrolls through the full year
 * and opens at the current week. The grid itself is hidden from
 * screen readers: the section label carries the stats and a visually hidden
 * table lists every day's minutes. Hover or tap a cell for its day.
 */
export interface FocusDay {
  /** Local date, YYYY-MM-DD. */
  date: string;
  minutes: number;
}

export interface FocusGraphText {
  /** Sun … Sat, short. Mon, Wed and Fri are shown as row labels. */
  days: string[];
  /** Jan … Dec, short. */
  months: string[];
  /** Tooltip for one day, e.g. "Tue 13 Oct · 1 h 25 min" / "Tue 13 Oct · No focus". */
  cellLabel: (date: Date, minutes: number) => string;
  /** "Less" */
  less: string;
  /** "More" */
  more: string;
  /** Closed-day tooltip/table annotation (EN/DE supplied by caller). */
  closed: string;
  closureNote: string;
  older?: string;
  newer?: string;
  /** "Share focus graph" */
  share: string;
  /** Hidden table caption, "Focus minutes per day, newest week first". */
  tableCaption: string;
  /** Row header prefix, "Week of". */
  weekOf: string;
  /** Formats a week's Sunday for the table, e.g. "13 Oct". */
  weekLabel: (sunday: Date) => string;
}

export interface FocusGraphProps {
  days: FocusDay[];
  /** Local date, YYYY-MM-DD. Its week is the rightmost column. */
  today: string;
  /** Columns to render; a year is 53. */
  weeks?: number;
  /** Legacy gallery hint; sizing now follows the card width on every screen. */
  compact?: boolean;
  /** Semester total, or an empty-history message. */
  stats: ReactNode;
  /** Optional secondary line beneath the semester total, e.g. study-day streak. */
  secondaryStats?: ReactNode;
  /** Accessible name of the card; should repeat the stats. */
  label: string;
  text: FocusGraphText;
  /** Omit to hide Share (no history yet). */
  onShare?: () => void;
  style?: CSSProperties;
}

/** One Pomodoro block, the default rhythm's unit of focus (ADR 0004). */
const BLOCK_MINUTES = 25;

/**
 * Daily minutes → ramp level, counted in whole Pomodoro blocks: 0 · 1 ·
 * 2–3 · 4–6 · 7+ (0 · <50 · <100 · <175 · 175+ min). Any focus at all is
 * level 1. Fixed, not relative to the best day, so cards compare.
 */
export function focusLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  const blocks = Math.floor(minutes / BLOCK_MINUTES);
  if (blocks < 2) return 1;
  if (blocks < 4) return 2;
  if (blocks < 7) return 3;
  return 4;
}

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Sunday of the week that contains d. */
export function sundayOf(d: Date): Date {
  return addDays(d, -d.getDay());
}

interface Cell {
  key: string;
  date: Date;
  minutes: number;
  future: boolean;
  today: boolean;
}

const hidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

export function FocusGraph({
  days,
  today,
  weeks = 53,
  compact: _compact = false,
  stats,
  secondaryStats,
  label,
  text,
  onShare,
  style = {},
}: FocusGraphProps) {
  const [tip, setTip] = useState<{ key: string; text: string; row: number; col: number; x: number; y: number } | null>(null);
  const [olderAvailable, setOlderAvailable] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [newerAvailable, setNewerAvailable] = useState(false);
  const updateOverflow = (el: HTMLDivElement | null) => {
    if (el) {
      setOlderAvailable(el.scrollWidth - el.clientWidth + el.scrollLeft > 2);
      setNewerAvailable(el.scrollLeft < -2);
    }
  };

  useEffect(() => {
    const el = scroller.current;
    const grid = el?.firstElementChild as HTMLElement | null;
    if (!el || !grid || typeof ResizeObserver === 'undefined') return;
    let previousWidth = grid.scrollWidth;
    const observer = new ResizeObserver(() => {
      const width = grid.scrollWidth;
      if (previousWidth && width !== previousWidth) {
        el.scrollLeft *= (width - 36) / (previousWidth - 36);
        setTip(null);
      }
      previousWidth = width;
      updateOverflow(el);
    });
    observer.observe(grid);
    observer.observe(el);
    updateOverflow(el);
    return () => observer.disconnect();
  }, []);

  const navigateWeeks = (direction: number) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.75,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const minutesByDay = new Map<string, number>();
  for (const d of days) minutesByDay.set(d.date, (minutesByDay.get(d.date) ?? 0) + d.minutes);

  const todayDate = parseDay(today);
  const firstSunday = addDays(sundayOf(todayDate), -(weeks - 1) * 7);
  const columns: { sunday: Date; month: string; cells: Cell[] }[] = [];
  for (let w = 0; w < weeks; w++) {
    const sunday = addDays(firstSunday, w * 7);
    const prev = addDays(sunday, -7);
    let month = sunday.getMonth() !== prev.getMonth() ? text.months[sunday.getMonth()] : '';
    if (w === 0) {
      const sameAhead = addDays(sunday, 7).getMonth() === sunday.getMonth() && addDays(sunday, 14).getMonth() === sunday.getMonth();
      month = sameAhead ? text.months[sunday.getMonth()] : '';
    }
    const cells: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(sunday, d);
      const key = dayKey(date);
      cells.push({ key, date, minutes: minutesByDay.get(key) ?? 0, future: date > todayDate, today: key === today });
    }
    columns.push({ sunday, month, cells });
  }

  const items: ReactNode[] = [<div key="corner" style={{ position: 'sticky', left: 0, zIndex: 1, minWidth: 32, background: 'var(--md-surface)' }} />];
  text.days.forEach((d, i) =>
    items.push(
      <div
        key={`day${i}`}
        style={{ position: 'sticky', left: 0, zIndex: 1, alignSelf: 'stretch', minWidth: 32, background: 'var(--md-surface)' }}
      >
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
            lineHeight: 1,
            color: 'var(--md-on-surface-variant)',
            whiteSpace: 'nowrap',
          }}
        >
          {i % 2 === 1 && i < 6 ? d : ''}
        </span>
      </div>,
    ),
  );
  columns.forEach((col, c) => {
    items.push(
      <div
        key={`m${c}`}
        style={{ height: 16, fontSize: 12, lineHeight: '14px', color: 'var(--md-on-surface-variant)', whiteSpace: 'nowrap' }}
      >
        {col.month}
      </div>,
    );
    col.cells.forEach((cell, r) => {
      if (cell.future) {
        items.push(<div key={cell.key} style={{ width: '100%', aspectRatio: '1', alignSelf: 'start' }} />);
        return;
      }
      const closed = isCampusClosedDay(cell.date);
      const cellText = `${text.cellLabel(cell.date, cell.minutes)}${closed ? ` · ${text.closed}` : ''}`;
      const show = (event: { currentTarget: HTMLDivElement }) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setTip({ key: cell.key, text: cellText, row: r, col: c,
          x: Math.max(16, Math.min(window.innerWidth - 296, bounds.left + bounds.width / 2 - 140)),
          y: r < 3 ? bounds.bottom + 6 : bounds.top - 6 });
      };
      items.push(
        <div
          key={cell.key}
          data-date={cell.key}
          data-closed={closed || undefined}
          title={cellText}
          onMouseEnter={show}
          onMouseLeave={() => setTip(null)}
          onClick={(event) => (tip?.key === cell.key ? setTip(null) : show(event))}
          style={{
            width: '100%',
            aspectRatio: '1',
            alignSelf: 'start',
            borderRadius: 3,
            background: closed ? 'color-mix(in srgb, var(--md-graph-closed) 72%, var(--md-surface))' : `var(--md-graph-${focusLevel(cell.minutes)})`,
            outline: cell.today ? '1.5px solid var(--md-on-surface)' : 'none',
            outlineOffset: 1,
          }}
        />,
      );
    });
  });

  const tipBelow = tip ? tip.row < 3 : true;
  const legendCell: CSSProperties = { width: 'clamp(11px, 2cqw, 16px)', height: 'clamp(11px, 2cqw, 16px)', borderRadius: 2, display: 'inline-block' };

  return (
    <section
      className="thd-focus-card"
      aria-label={label}
      style={{
        background: 'var(--md-surface)',
        borderRadius: 'var(--radius-l)',
        boxShadow: 'var(--md-shadow-1)',
        padding: 'clamp(18px, 3vw, 32px)',
        containerType: 'inline-size',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(22px, 4cqw, 32px)',
        minWidth: 0,
        position: 'relative',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
        <p
          style={{
            margin: 0,
            flex: 1,
            minWidth: 0,
            fontSize: secondaryStats ? 'clamp(24px, 4.4cqw, 34px)' : 16,
            fontWeight: secondaryStats ? 500 : 400,
            lineHeight: 1.4,
            color: secondaryStats ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
            textWrap: 'pretty',
          }}
        >
          {stats}
          {secondaryStats && <span style={{ display: 'block', marginTop: 4, fontSize: 'clamp(14px, 2.5cqw, 18px)', fontWeight: 400, color: 'var(--md-on-surface-variant)' }}>{secondaryStats}</span>}
        </p>
        {onShare && (
          <IconButton label={text.share} onClick={onShare}>
            <IconShare size={20} strokeWidth={1.9} />
          </IconButton>
        )}
      </div>
      <div style={{ position: 'relative', minWidth: 0 }}>
      <div
        className="thd-focus-graph-scroll"
        ref={scroller}
        onScroll={(event) => { updateOverflow(event.currentTarget); setTip(null); }}
        tabIndex={0}
        role="region"
        aria-label={text.tableCaption}
        style={{
          direction: 'rtl',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          padding: '3px 3px 6px 0',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            direction: 'ltr',
            position: 'relative',
            display: 'grid',
            gridAutoFlow: 'column',
            gridTemplateRows: 'auto repeat(7, auto)',
            gridTemplateColumns: `32px repeat(${weeks}, clamp(14px, 3.3cqw, 26px))`,
            gap: 'clamp(3px, 0.6cqw, 5px)',
            width: 'max-content',
          }}
        >
          {items}
          {tip && (
            <div
              style={{
                position: 'fixed',
                zIndex: 2,
                pointerEvents: 'none',
                width: 'max-content',
                maxWidth: 'min(280px, 100%)',
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                padding: '5px 8px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--md-on-surface)',
                color: 'var(--md-surface)',
                font: '500 12px var(--font-sans)',
                boxShadow: 'var(--md-shadow-1)',
                left: tip.x,
                top: tip.y,
                transform: tipBelow ? undefined : 'translateY(-100%)',
              }}
            >
              {tip.text}
            </div>
          )}
        </div>
      </div>
      {olderAvailable && <div aria-hidden="true" style={{ position: 'absolute', left: 32, top: 0, bottom: 0, width: 14, pointerEvents: 'none', background: 'linear-gradient(to right, var(--md-surface), transparent)' }} />}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px 20px',
          fontSize: 12,
          color: 'var(--md-on-surface-variant)',
        }}
      >
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: 0, lineHeight: 1.5 }}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}><rect x="1.5" y="1.5" width="13" height="13" rx="3" /><path d="M6 5v6M10 5v6" /></svg>
          <span>{text.closureNote}</span>
        </p>
        <div role="img" aria-label={`${text.less} → ${text.more}`} title={`${text.less} → ${text.more}`} style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} style={{ ...legendCell, background: `var(--md-graph-${l})` }} />
        ))}
        </div>
      {(olderAvailable || newerAvailable) && <div className="thd-focus-navigation">
        <IconButton label={text.older ?? 'Older weeks'} disabled={!olderAvailable} onClick={() => navigateWeeks(-1)} style={{ opacity: olderAvailable ? 1 : 0.35 }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6" /></svg>
        </IconButton>
        <IconButton label={text.newer ?? 'Newer weeks'} disabled={!newerAvailable} onClick={() => navigateWeeks(1)} style={{ opacity: newerAvailable ? 1 : 0.35 }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m10 6 6 6-6 6" /></svg>
        </IconButton>
      </div>}
      </div>
      <div style={hidden}>
        <table>
          <caption>{text.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{text.weekOf}</th>
              {text.days.map((d) => (
                <th key={d} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...columns].reverse().map((col) => (
              <tr key={dayKey(col.sunday)}>
                <th scope="row">{text.weekLabel(col.sunday)}</th>
                {col.cells.map((cell) => (
                  <td key={cell.key}>{cell.future ? '—' : `${cell.minutes}${isCampusClosedDay(cell.date) ? ` · ${text.closed}` : ''}`}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
