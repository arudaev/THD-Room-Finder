import type { CSSProperties } from 'react';
import type { FocusDay } from './FocusGraph';
/**
 * The focus graph as an image (D4): drawn with Canvas 2D, so the same picture
 * serves the share sheet preview, Save Image and the link preview. Square
 * 1080 × 1080 is the card; wide 1200 × 630 is the og:image candidate until the
 * preview-shape test settles it (ADR 0003). The grid is the current semester:
 * first week on the left, days still to come as outlined slots, today outlined
 * in on-surface. Colours are read from the tokens at draw time for the given
 * theme and graph colour, so the canvas carries no hex of its own. Flat: no
 * gradients, shadows or photos; about 90 KB.
 */
export type ShareCardFormat = 'square' | 'wide';
export interface ShareCardFigure {
    /** "21" */
    num: string;
    /** "h", "Std.", "min" or empty. */
    unit: string;
    /** "this semester", "day streak". */
    label: string;
}
export interface ShareCardOptions {
    format?: ShareCardFormat;
    days: FocusDay[];
    /** Local date, YYYY-MM-DD. */
    today: string;
    /** First day of the semester, YYYY-MM-DD; its week is the first column. */
    semesterStart: string;
    /** Last day of the semester, YYYY-MM-DD. */
    semesterEnd: string;
    /** Exactly two: hours this semester, then the streak. */
    figures: ShareCardFigure[];
    /** Opt-in line above the figures, "Lena · AIN 7". */
    who?: string;
    /** Jan … Dec, short, in the card's language. */
    months: string[];
    theme: 'light' | 'dark';
    /** Graph colour; violet when omitted. */
    accent?: 'violet' | 'orchid' | 'graphite';
    /** App icon drawn in the footer. */
    iconSrc?: string;
    /** Footer text on the right. */
    url?: string;
}
/** Number of week columns from the semester's first Sunday through its end. */
export declare function semesterWeeks(semesterStart: string, semesterEnd: string): number;
/** Draws the card and resolves to a PNG blob. */
export declare function renderShareCard(o: ShareCardOptions): Promise<Blob>;
export interface ShareCardProps extends ShareCardOptions {
    /** Describes the card, e.g. "Focus graph image: 21 hours this semester, …". */
    alt: string;
    style?: CSSProperties;
}
/** The card as an <img>, redrawn whenever an option changes (share sheet preview). */
/**
 * @startingPoint section="Focus" subtitle="Semester share card drawn on canvas (1080 × 1080)" viewport="420x440"
 */
export declare function ShareCard(props: ShareCardProps): JSX.Element;
