import type { CampusHours } from '../../domain/openingHours';
import { formatDayTime, formatTime } from '../../domain/format';
import { useI18n } from '../../i18n';
import type { PlaceMeta } from './placeMeta';

/**
 * Side-panel card for a non-teaching / amenity building (Library, study spaces,
 * Mensa, Glashaus, K café): a short description, amenity lines, external menu
 * links, and — when `hours` is given — a live open/closed line (the Library
 * uses its own schedule, study spaces the general campus hours).
 */
export function PlaceCard({ meta, hours }: { meta: PlaceMeta; hours?: CampusHours }) {
  const { t, locale } = useI18n();
  const showHours = meta.showHours && hours;

  return (
    <div
      style={{
        background: 'var(--md-surface-1)',
        borderRadius: 'var(--radius-l)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ fontSize: 'var(--body-medium-size)', color: 'var(--md-on-surface)' }}>
        {meta.note(t)}
      </div>

      {showHours && (
        <div
          style={{
            fontSize: 'var(--body-medium-size)',
            fontWeight: 'var(--weight-medium)',
            color: hours.open ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
          }}
        >
          {hours.open
            ? hours.todayClose
              ? t(`Open until ${formatTime(hours.todayClose)}`, `Geöffnet bis ${formatTime(hours.todayClose)}`)
              : t('Open', 'Geöffnet')
            : hours.nextOpen
              ? t(
                  `Closed · opens ${formatDayTime(hours.nextOpen, locale)}`,
                  `Geschlossen · öffnet ${formatDayTime(hours.nextOpen, locale)}`,
                )
              : t('Closed', 'Geschlossen')}
        </div>
      )}

      {meta.amenities && meta.amenities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {meta.amenities.map((line, i) => (
            <div key={i} style={{ fontSize: 'var(--body-small-size)', color: 'var(--md-on-surface-variant)' }}>
              {line(t)}
            </div>
          ))}
        </div>
      )}

      {meta.links && meta.links.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {meta.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--md-secondary-container)',
                color: 'var(--md-on-secondary-container)',
                borderRadius: 'var(--radius-xl)',
                padding: '0.35rem 0.85rem',
                fontSize: 'var(--body-small-size)',
                fontWeight: 'var(--weight-medium)',
                textDecoration: 'none',
              }}
            >
              {link.label(t)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
