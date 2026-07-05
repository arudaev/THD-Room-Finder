import { useNavigate } from 'react-router-dom';
import { RoomCard } from '../../components';
import { useRoomData } from '../rooms/RoomDataContext';
import { useFavorites } from './favorites';
import { useI18n } from '../../i18n';
import { computeRoomAvailability, getRoomSchedule } from '../../domain/availability';
import { roomMeta, statusBannerText } from '../../domain/format';
import { BrandHeader } from '../shared/BrandHeader';
import { Page, EmptyState } from '../shared/ui';

export function FavoritesScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { rooms, events, queryTime } = useRoomData();
  const { favorites } = useFavorites();

  const saved = favorites
    .map((ident) => rooms.find((r) => r.ident === ident))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

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
            {saved.map((room) => {
              const availability = computeRoomAvailability(getRoomSchedule(events, room.ident), queryTime);
              const banner = statusBannerText(availability, queryTime);
              return (
                <RoomCard
                  key={room.ident}
                  name={room.code}
                  meta={roomMeta(room)}
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
