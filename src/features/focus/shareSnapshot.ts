import { addDays, dayKey, focusLevel, sundayOf, parseDay } from '../../components/focus/FocusGraph';
import type { FocusDay } from '../../components/focus/FocusGraph';
import { semesterWeeks } from '../../components/focus/ShareCard';
import { encodeShare } from '../../../shared/shareLink.js';
import type { ShareAccent } from '../../../shared/shareLink.js';

/** The public app; the Android app's own origin is https://localhost. */
export const PUBLIC_ORIGIN = 'https://thd-room-finder.vercel.app';

export interface ShareLinkInput {
  days: FocusDay[];
  /** YYYY-MM-DD */
  today: string;
  semesterStart: string;
  semesterEnd: string;
  semesterMinutes: number;
  streak: number;
  dark: boolean;
  accent: ShareAccent;
  lang: 'en' | 'de';
  /** Only when the student switched it on. */
  name?: string;
  batch?: string;
}

/** An invite to the app whose preview is the light or dark banner. */
export function inviteLink(dark: boolean, lang: 'en' | 'de', origin: string): string {
  return `${origin}/i/${dark ? 'dark' : 'light'}${lang === 'de' ? '-de' : ''}`;
}

/**
 * The /f/ link for the semester graph (ADR 0003): one level per day from the
 * semester's first Sunday through today, plus the figures. No rooms, no
 * times; name and batch only when passed.
 */
export function shareLink(input: ShareLinkInput, origin: string): string {
  const first = sundayOf(parseDay(input.semesterStart));
  const weeks = semesterWeeks(input.semesterStart, input.semesterEnd);
  const todayDate = parseDay(input.today);
  const elapsed = Math.round((todayDate.getTime() - first.getTime()) / 86400000);
  const today = Math.min(Math.max(0, elapsed), weeks * 7 - 1);

  const minutes = new Map<string, number>();
  for (const d of input.days) minutes.set(d.date, (minutes.get(d.date) ?? 0) + d.minutes);
  const levels: number[] = [];
  for (let i = 0; i <= today; i++) levels.push(focusLevel(minutes.get(dayKey(addDays(first, i))) ?? 0));

  const payload = encodeShare({
    dark: input.dark,
    accent: input.accent,
    lang: input.lang,
    start: dayKey(first),
    weeks,
    today,
    minutes: input.semesterMinutes,
    streak: input.streak,
    levels,
    name: input.name,
    batch: input.batch,
  });
  return `${origin}/f/${payload}`;
}
