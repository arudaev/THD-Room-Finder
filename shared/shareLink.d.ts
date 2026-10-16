export type ShareAccent = 'violet' | 'orchid' | 'graphite';

/** One shared snapshot of the semester focus graph (ADR 0003). */
export interface ShareSnapshot {
  dark: boolean;
  accent: ShareAccent;
  lang: 'en' | 'de';
  /** First week start, YYYY-MM-DD. Sunday in new links; Monday in older links. */
  start: string;
  /** Week columns in the grid. */
  weeks: number;
  /** Today as a day index into the grid. */
  today: number;
  /** Focus minutes this semester. */
  minutes: number;
  /** Streak in days. */
  streak: number;
  /** Level 0–4 per day from start through today. */
  levels: number[];
  /** Opt-in. */
  name?: string;
  /** Opt-in, e.g. "AIN 7". */
  batch?: string;
}

export const SHARE_VERSION: number;
export const MAX_PAYLOAD: number;
export const ACCENTS: ShareAccent[];
export function encodeShare(snapshot: ShareSnapshot): string;
export function decodeShare(payload: string): ShareSnapshot | null;
export function hoursText(minutes: number, lang: 'en' | 'de'): string;
