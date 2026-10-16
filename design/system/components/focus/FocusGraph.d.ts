import type { CSSProperties, ReactNode } from 'react';
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
/**
 * Daily minutes → ramp level, counted in whole Pomodoro blocks: 0 · 1 ·
 * 2–3 · 4–6 · 7+ (0 · <50 · <100 · <175 · 175+ min). Any focus at all is
 * level 1. Fixed, not relative to the best day, so cards compare.
 */
export declare function focusLevel(minutes: number): 0 | 1 | 2 | 3 | 4;
export declare function parseDay(iso: string): Date;
export declare function dayKey(d: Date): string;
export declare function addDays(d: Date, n: number): Date;
/** Sunday of the week that contains d. */
export declare function sundayOf(d: Date): Date;
/**
 * @startingPoint section="Focus" subtitle="Contribution graph of daily focus minutes" viewport="900x260"
 */
export declare function FocusGraph(props: FocusGraphProps): JSX.Element;
