import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomCard } from '../../components';
import { useRoomData } from '../rooms/RoomDataContext';
import { useRoomFilters } from '../rooms/RoomFilterContext';
import { useFavorites } from '../favorites/favorites';
import { useI18n } from '../../i18n';
import { freeRoomDuration, roomMeta } from '../../domain/format';
import { freeStatus } from '../../domain/availability';
import { favoritesFirst, matchesRoomFilters } from '../../domain/roomFilters';
import { BrandHeader } from '../shared/BrandHeader';
import { ClosedNotice } from '../shared/ClosedNotice';
import { TimeControl } from '../shared/TimeControl';
import { FilterMenu } from '../shared/FilterMenu';
import { Page, Spinner, EmptyState, ErrorState } from '../shared/ui';

export function HomeScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { freeRooms, queryTime, campusHours, loading, error, refresh } = useRoomData();

  const { filters } = useRoomFilters();
  const { isFavorite } = useFavorites();
  const [building, setBuilding] = useState<string | null>(null);

  const buildings = useMemo(() => {
    const set = new Set(freeRooms.map((f) => f.room.building));
    return [...set].sort();
  }, [freeRooms]);

  const shown = useMemo(() => {
    const inBuilding = building ? freeRooms.filter((f) => f.room.building === building) : freeRooms;
    const filtered = inBuilding.filter((f) => matchesRoomFilters(f.room, filters));
    return favoritesFirst(filtered, isFavorite);
  }, [freeRooms, building, filters, isFavorite]);

  return (
    <>
      <BrandHeader />
      <Page>
        {campusHours.open ? (
          <>
            {/* Answer-first hero → straight into the list. */}
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

            {/* One slim toolbar: compact time + filters, out of the way. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <TimeControl />
              <div style={{ marginLeft: 'auto' }}>
                <FilterMenu buildings={buildings} building={building} onBuilding={setBuilding} />
              </div>
            </div>

            {/* The answer: duration-ranked free rooms. */}
            {error && freeRooms.length === 0 ? (
              <ErrorState message={error} onRetry={refresh} retryLabel={t('Try again', 'Erneut versuchen')} />
            ) : loading && freeRooms.length === 0 ? (
              <Spinner label={t('Checking THabella…', 'THabella wird abgefragt…')} />
            ) : shown.length === 0 ? (
              <EmptyState
                title={t('No free rooms', 'Keine freien Räume')}
                hint={t('Try another time or filter.', 'Andere Zeit oder Filter versuchen.')}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
            )}
          </>
        ) : (
          <>
            <ClosedNotice hours={campusHours} compact />
            <div style={{ display: 'flex' }}>
              <TimeControl />
            </div>
          </>
        )}
      </Page>
    </>
  );
}
