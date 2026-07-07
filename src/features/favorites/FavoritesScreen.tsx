import { useNavigate } from 'react-router-dom';
import { RoomCard } from '../../components';
import { useRoomData } from '../rooms/RoomDataContext';
import { useFavorites } from './favorites';
import { useI18n } from '../../i18n';
import { computeRoomAvailability, getRoomSchedule } from '../../domain/availability';
import { mayBeLocked } from '../../domain/roomFilters';
import { formatTime, roomMeta, statusBannerText } from '../../domain/format';
import { BrandHeader } from '../shared/BrandHeader';
import { ClosedNotice } from '../shared/ClosedNotice';
import { Page, EmptyState } from '../shared/ui';

export function FavoritesScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { rooms, events, planningTime, preview, campusHours } = useRoomData();
  const { favorites } = useFavorites();

  const saved = favorites
    .map((ident) => rooms.find((r) => r.ident === ident))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  // Availability is only meaningful while the campus is reachable. When it's
  // closed (and not previewing an opening later today), a saved room isn't
  // "free" — it's shut — so show a closed notice and mute each card rather than
  // claiming it's open. When open (or previewing), rank status at planningTime
  // and cap free windows at closing, mirroring the room-detail screen.
  const showAvailability = campusHours.open || preview;

  return (
    <>
      <BrandHeader title={t('Saved', 'Gespeichert')} />
      <Page>
        {saved.length === 0 ? (
          <EmptyState
            title={t('No saved rooms yet', 'Noch keine gespeicherten Räume')}
            hint={t('Star a room to see it here — "is my usual spot free?"', 'Markiere einen Raum, um ihn hier zu sehen.')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {!showAvailability && <ClosedNotice hours={campusHours} compact />}
            {showAvailability && preview && campusHours.todayOpen && (
              <div
                style={{
                  background: 'var(--md-surface-1)',
                  borderRadius: 'var(--radius-l)',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: 'var(--body-medium-size)',
                  color: 'var(--md-on-surface-variant)',
                  textAlign: 'center',
                }}
              >
                {t(
                  `Campus opens at ${formatTime(campusHours.todayOpen)} — planning ahead`,
                  `Campus öffnet um ${formatTime(campusHours.todayOpen)} — Vorschau`,
                )}
              </div>
            )}
            {saved.map((room) => {
              if (!showAvailability) {
                return (
                  <RoomCard
                    key={room.ident}
                    name={room.code}
                    meta={roomMeta(room)}
                    status="occupied"
                    statusLabel={t('closed', 'zu')}
                    duration="—"
                    href={`/room/${encodeURIComponent(room.ident)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/room/${encodeURIComponent(room.ident)}`);
                    }}
                  />
                );
              }
              const availability = computeRoomAvailability(
                getRoomSchedule(events, room.ident),
                planningTime,
                campusHours.todayClose,
              );
              const banner = statusBannerText(availability, planningTime);
              return (
                <RoomCard
                  key={room.ident}
                  name={room.code}
                  meta={roomMeta(room)}
                  hint={mayBeLocked(room) ? t('may be locked', 'evtl. abgeschlossen') : undefined}
                  status={availability.status}
                  duration={banner.duration ?? ''}
                  href={`/room/${encodeURIComponent(room.ident)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/room/${encodeURIComponent(room.ident)}`);
                  }}
                />
              );
            })}
          </div>
        )}
      </Page>
    </>
  );
}
