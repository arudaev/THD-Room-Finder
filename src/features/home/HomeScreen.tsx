import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip, RoomCard } from '../../components';
import { IconClock, IconRefresh } from '../../components/icons';
import { useRoomData } from '../rooms/RoomDataContext';
import { useI18n } from '../../i18n';
import { freeRoomDuration, formatTime, roomMeta } from '../../domain/format';
import { freeStatus } from '../../domain/availability';
import { BrandHeader } from '../shared/BrandHeader';
import { ClosedNotice } from '../shared/ClosedNotice';
import { Page, SectionLabel, Spinner, EmptyState, ErrorState } from '../shared/ui';

function toDateTimeLocal(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}`
  );
}

export function HomeScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    freeRooms,
    queryTime,
    isCustomTime,
    campusHours,
    loading,
    error,
    lastUpdated,
    setQueryTime,
    resetTime,
    refresh,
  } = useRoomData();

  const [building, setBuilding] = useState<string | null>(null);

  const buildings = useMemo(() => {
    const set = new Set(freeRooms.map((f) => f.room.building));
    return [...set].sort();
  }, [freeRooms]);

  const shown = useMemo(
    () => (building ? freeRooms.filter((f) => f.room.building === building) : freeRooms),
    [freeRooms, building],
  );

  return (
    <>
    <BrandHeader />
    <Page>
      {/* Hero count → flows straight into the list, or the closed banner. */}
      {campusHours.open ? (
        <div>
          <div
            style={{
              fontSize: 'clamp(4rem, 22vw, var(--display-large-size))',
              lineHeight: 1,
              fontWeight: 'var(--weight-light)',
              color: 'var(--md-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {loading && freeRooms.length === 0 ? '—' : shown.length}
          </div>
          <div style={{ fontSize: 'var(--title-medium-size)', color: 'var(--md-on-surface-variant)' }}>
            {building
              ? t(`rooms free in ${building}`, `Räume frei in ${building}`)
              : t('rooms free right now', 'Räume jetzt frei')}
          </div>
        </div>
      ) : (
        <ClosedNotice hours={campusHours} compact />
      )}

      {/* Time-travel lookup. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'var(--md-surface)',
            border: '1px solid var(--md-outline-variant)',
            borderRadius: 'var(--radius-s)',
            padding: '0.4rem 0.6rem',
            color: 'var(--md-on-surface-variant)',
          }}
        >
          <IconClock size={18} />
          <input
            type="datetime-local"
            value={toDateTimeLocal(queryTime)}
            onChange={(e) => e.target.value && setQueryTime(new Date(e.target.value))}
            aria-label={t('Check availability at a time', 'Verfügbarkeit zu einer Zeit prüfen')}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--md-on-surface)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--body-medium-size)',
            }}
          />
        </label>
        {isCustomTime && (
          <button
            type="button"
            onClick={resetTime}
            style={{
              border: 'none',
              background: 'var(--md-secondary-container)',
              color: 'var(--md-on-secondary-container)',
              borderRadius: 'var(--radius-xl)',
              padding: '0.4rem 0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('Now', 'Jetzt')}
          </button>
        )}
        <button
          type="button"
          onClick={refresh}
          aria-label={t('Refresh', 'Aktualisieren')}
          title={t('Refresh', 'Aktualisieren')}
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
          <IconRefresh size={16} />
          {lastUpdated ? formatTime(lastUpdated) : '—'}
        </button>
      </div>

      {/* Building filter — the primary narrowing axis. */}
      {buildings.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 4 }}>
          <Chip active={building === null} onClick={() => setBuilding(null)}>
            {t('All', 'Alle')}
          </Chip>
          {buildings.map((b) => (
            <Chip key={b} active={building === b} onClick={() => setBuilding(b)}>
              {b}
            </Chip>
          ))}
        </div>
      )}

      {/* The answer: duration-ranked free rooms (hidden while the campus is closed). */}
      {campusHours.open &&
        (error && freeRooms.length === 0 ? (
        <ErrorState message={error} onRetry={refresh} retryLabel={t('Try again', 'Erneut versuchen')} />
      ) : loading && freeRooms.length === 0 ? (
        <Spinner label={t('Checking THabella…', 'THabella wird abgefragt…')} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={t('No free rooms', 'Keine freien Räume')}
          hint={t('Try another time or building.', 'Andere Zeit oder Gebäude versuchen.')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <SectionLabel>{t('Longest free first', 'Längste zuerst frei')}</SectionLabel>
          {shown.map((f) => {
            const ident = f.room.ident;
            return (
              <RoomCard
                key={ident}
                name={f.room.code}
                meta={roomMeta(f.room)}
                status={freeStatus(f.freeUntil, queryTime)}
                duration={freeRoomDuration(f, queryTime)}
                href={`/room/${encodeURIComponent(ident)}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/room/${encodeURIComponent(ident)}`);
                }}
              />
            );
          })}
        </div>
      ))}
    </Page>
    </>
  );
}
