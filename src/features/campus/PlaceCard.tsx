import type { CampusHours } from '../../domain/openingHours';
import { formatDayTime, formatTime } from '../../domain/format';
import { useI18n } from '../../i18n';
import type { PlaceMeta } from './placeMeta';

/**
 * Side-panel card for a non-teaching / amenity building (Library, study spaces,
 * Mensa, Glashaus, K café): a short description, amenity lines (what's here and
 * on which floor), a live open/closed line, then external links. Buildings with
 * a `secondaryVenue` (building F's upstairs Mensa) get a second, labeled hours
 * line driven by `secondaryHours`. STWNO venues (`fullHoursFormat`) show today's
 * whole opening window, not just the closing time — the closing time alone
 * doesn't tell you when a Mensa's lunch service actually starts.
 */
export function PlaceCard({
  meta,
  hours,
  secondaryHours,
}: {
  meta: PlaceMeta;
  hours?: CampusHours;
  secondaryHours?: CampusHours;
}) {
  const { t, locale } = useI18n();
  const showHours = meta.showHours && hours;
  const showSecondaryHours = meta.secondaryVenue && secondaryHours;

  const status = (h: CampusHours) => (h.open ? t('Open', 'Geöffnet') : t('Closed', 'Geschlossen'));

  const abbreviatedText = (h: CampusHours) =>
    h.open
      ? h.todayClose
        ? t(`Open until ${formatTime(h.todayClose)}`, `Geöffnet bis ${formatTime(h.todayClose)}`)
        : t('Open', 'Geöffnet')
      : h.nextOpen
        ? t(
            `Closed · opens ${formatDayTime(h.nextOpen, locale)}`,
            `Geschlossen · öffnet ${formatDayTime(h.nextOpen, locale)}`,
          )
        : t('Closed', 'Geschlossen');

  const fullRangeText = (h: CampusHours) => {
    if (h.todayOpen && h.todayClose) {
      return `${status(h)} · ${formatTime(h.todayOpen)}–${formatTime(h.todayClose)}`;
    }
    return h.nextOpen
      ? `${status(h)} · ${t('opens', 'öffnet')} ${formatDayTime(h.nextOpen, locale)}`
      : status(h);
  };

  const hoursText = (h: CampusHours) => (meta.fullHoursFormat ? fullRangeText(h) : abbreviatedText(h));

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

      {meta.amenities && meta.amenities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {meta.amenities.map((line, i) => (
            <div key={i} style={{ fontSize: 'var(--body-small-size)', color: 'var(--md-on-surface-variant)' }}>
              {line(t)}
            </div>
          ))}
        </div>
      )}

      {showHours && (
        <div
          style={{
            fontSize: 'var(--body-medium-size)',
            fontWeight: 'var(--weight-medium)',
            color: hours.open ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
          }}
        >
          {meta.primaryVenueLabel && <>{meta.primaryVenueLabel(t)}: </>}
          {hoursText(hours)}
        </div>
      )}

      {showSecondaryHours && (
        <div
          style={{
            fontSize: 'var(--body-medium-size)',
            fontWeight: 'var(--weight-medium)',
            color: secondaryHours.open ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
          }}
        >
          {meta.secondaryVenue!.label(t)}: {hoursText(secondaryHours)}
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
