import type { CampusHours } from '../../domain/openingHours';
import { formatDayTime } from '../../domain/format';
import { useI18n } from '../../i18n';

const PERIOD_NOTE: Record<CampusHours['period'], { en: string; de: string }> = {
  regular: {
    en: 'Term hours: Mon–Fri 07:00–20:00. Library: Mon–Thu –20:00, Fri –18:00.',
    de: 'Vorlesungszeit: Mo–Fr 07:00–20:00. Bibliothek: Mo–Do –20:00, Fr –18:00.',
  },
  exam: {
    en: 'Exam hours: buildings Mon–Fri 07:00–20:00; Library daily until 23:45.',
    de: 'Prüfungszeit: Gebäude Mo–Fr 07:00–20:00; Bibliothek täglich bis 23:45.',
  },
  break: {
    en: 'Break hours: Mon–Thu 09:30–16:30, Fri 09:30–13:00.',
    de: 'Vorlesungsfreie Zeit: Mo–Do 09:30–16:30, Fr 09:30–13:00.',
  },
};

/**
 * Answer-first "campus is closed" banner — shown instead of a free-room count
 * whenever the buildings are shut at the query time. Leads with when it reopens.
 */
export function ClosedNotice({ hours, compact = false }: { hours: CampusHours; compact?: boolean }) {
  const { t, locale } = useI18n();
  const note = PERIOD_NOTE[hours.period];
  const opensLabel = hours.nextOpen ? formatDayTime(hours.nextOpen, locale) : null;

  return (
    <div
      style={{
        background: 'var(--md-surface)',
        borderRadius: 'var(--radius-l)',
        boxShadow: 'var(--md-shadow-1)',
        padding: 'var(--space-5) var(--space-4)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <div
        style={{
          fontSize: compact ? 'var(--title-large-size)' : 'var(--display-small-size)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--md-on-surface)',
        }}
      >
        {t('Campus closed', 'Campus geschlossen')}
      </div>
      {opensLabel && (
        <div style={{ fontSize: 'var(--title-medium-size)', color: 'var(--md-primary)' }}>
          {t('Opens', 'Öffnet')} {opensLabel}
        </div>
      )}
      <div style={{ fontSize: 'var(--body-small-size)', color: 'var(--md-on-surface-variant)', marginTop: 'var(--space-2)' }}>
        {t(note.en, note.de)}
      </div>
    </div>
  );
}
