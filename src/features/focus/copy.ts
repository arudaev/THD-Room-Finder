import type { FocusGraphText } from '../../components';
import type { Locale } from '../../components/core/LanguageToggle';
import type { Translate } from '../../i18n';

/**
 * Shared EN/DE copy for the focus layer (D1–D4 handbacks). Components take
 * their text as props; screens build it here so the wording stays in one
 * place.
 */

export function monthNames(locale: Locale): string[] {
  return locale === 'de'
    ? ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

/** Sun … Sat. */
export function dayNames(locale: Locale): string[] {
  return locale === 'de'
    ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

/** 85 → "1 h 25 min" / "1 Std. 25 Min."; whole hours drop the minutes. */
export function formatMinutes(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (locale === 'de') {
    if (!h) return `${m} Min.`;
    return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
  }
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "Tue 13 Oct" / "Di 13. Okt". */
export function shortDate(d: Date, locale: Locale): string {
  const day = dayNames(locale)[d.getDay()];
  return `${day} ${d.getDate()}${locale === 'de' ? '.' : ''} ${monthNames(locale)[d.getMonth()]}`;
}

export function graphText(t: Translate, locale: Locale): FocusGraphText {
  const months = monthNames(locale);
  return {
    days: dayNames(locale),
    months,
    cellLabel: (d, m) =>
      `${shortDate(d, locale)} · ${m ? formatMinutes(m, locale) : t('No focus', 'Kein Fokus')}`,
    less: t('Less', 'Weniger'),
    more: t('More', 'Mehr'),
    closed: t('Campus closed', 'Campus geschlossen'),
    closureNote: t('Weekends pause your streak', 'Serie pausiert am Wochenende'),
    older: t('Older weeks', '�ltere Wochen'),
    newer: t('Newer weeks', 'Neuere Wochen'),
    share: t('Share focus graph', 'Fokus-Verlauf teilen'),
    tableCaption: t('Focus minutes per day, newest week first', 'Fokus-Minuten pro Tag, neueste Woche zuerst'),
    weekOf: t('Week of', 'Woche ab'),
    weekLabel: (d) => `${d.getDate()}${locale === 'de' ? '.' : ''} ${months[d.getMonth()]}`,
  };
}

/** Whole hours from an hour up ("21 h" / "21 Std."), minutes below. */
export function formatHours(minutes: number, locale: Locale): string {
  if (minutes < 60) return formatMinutes(minutes, locale);
  const h = Math.round(minutes / 60);
  return locale === 'de' ? `${h} Std.` : `${h} h`;
}

/** "21 h this semester · 12-day streak" (D2), or the new-user line. */
export function statsLine(t: Translate, locale: Locale, semesterMinutes: number, streakDays: number): string {
  if (semesterMinutes <= 0 && streakDays <= 0) {
    return t('No focus yet. Start a session in any free room.', 'Noch kein Fokus. Starte eine Session in einem freien Raum.');
  }
  const h = formatHours(semesterMinutes, locale);
  return t(`${h} this semester · ${streakDays}-day streak`, `${h} in diesem Semester · ${streakDays} Tage in Folge`);
}
