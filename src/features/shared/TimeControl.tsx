import { useRoomData } from '../rooms/RoomDataContext';
import { useI18n } from '../../i18n';
import { formatTime } from '../../domain/format';
import { Popover, PopoverLabel } from './Popover';
import { IconClock, IconRefresh } from '../../components/icons';

function toDateTimeLocal(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}`
  );
}

/**
 * Compact time-travel control. The trigger is a small pill ("Now", or the chosen
 * date/time); the calendar picker itself stays hidden in a popover until tapped.
 */
export function TimeControl() {
  const { t, locale } = useI18n();
  const { queryTime, isCustomTime, lastUpdated, setQueryTime, resetTime, refresh } = useRoomData();

  const chosen = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(queryTime);

  const label = isCustomTime ? chosen : t('Now', 'Jetzt');

  return (
    <Popover
      ariaLabel={t('Check availability at a time', 'Verfügbarkeit zu einer Zeit prüfen')}
      active={isCustomTime}
      align="start"
      trigger={
        <>
          <IconClock size={16} />
          {label}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <PopoverLabel>{t('Check a time', 'Zeitpunkt prüfen')}</PopoverLabel>
        <input
          type="datetime-local"
          value={toDateTimeLocal(queryTime)}
          onChange={(e) => e.target.value && setQueryTime(new Date(e.target.value))}
          aria-label={t('Date and time', 'Datum und Uhrzeit')}
          style={{
            border: '1px solid var(--md-outline-variant)',
            background: 'var(--md-surface)',
            color: 'var(--md-on-surface)',
            borderRadius: 'var(--radius-s)',
            padding: '0.5rem 0.6rem',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--body-medium-size)',
            width: '100%',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {isCustomTime && (
            <button
              type="button"
              onClick={resetTime}
              style={{
                border: 'none',
                background: 'var(--md-secondary-container)',
                color: 'var(--md-on-secondary-container)',
                borderRadius: 'var(--radius-xl)',
                padding: '0.35rem 0.85rem',
                fontWeight: 'var(--weight-medium)',
                fontSize: 'var(--body-small-size)',
                cursor: 'pointer',
              }}
            >
              {t('Now', 'Jetzt')}
            </button>
          )}
          <button
            type="button"
            onClick={refresh}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--md-on-surface-variant)',
              cursor: 'pointer',
              fontSize: 'var(--body-small-size)',
            }}
          >
            <IconRefresh size={15} />
            {lastUpdated ? formatTime(lastUpdated) : t('Refresh', 'Aktualisieren')}
          </button>
        </div>
      </div>
    </Popover>
  );
}
