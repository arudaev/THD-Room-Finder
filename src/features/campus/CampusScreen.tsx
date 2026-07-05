import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomCard } from '../../components';
import { IconMapPin } from '../../components/icons';
import { useRoomData } from '../rooms/RoomDataContext';
import { useI18n } from '../../i18n';
import { freeRoomDuration, roomMeta } from '../../domain/format';
import { freeStatus } from '../../domain/availability';
import type { FreeRoom } from '../../domain/models';
import { BrandHeader } from '../shared/BrandHeader';
import { Page, SectionLabel, Spinner } from '../shared/ui';

/**
 * Campus locator — free rooms grouped by building, so a student who doesn't
 * know the campus can find "which building has something free". The full 2.5D
 * SVG CampusMap (design-system `CampusMap`) slots in here next.
 */
export function CampusScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { freeRooms, queryTime, loading } = useRoomData();

  const byBuilding = useMemo(() => {
    const groups = new Map<string, FreeRoom[]>();
    for (const f of freeRooms) {
      const list = groups.get(f.room.building);
      if (list) list.push(f);
      else groups.set(f.room.building, [f]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [freeRooms]);

  return (
    <>
      <BrandHeader title={t('Campus', 'Campus')} />
      <Page>
        {loading && freeRooms.length === 0 ? (
          <Spinner label={t('Checking THabella…', 'THabella wird abgefragt…')} />
        ) : (
          byBuilding.map(([building, list]) => (
            <div key={building} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--md-primary)' }}>
                  <IconMapPin size={18} />
                </span>
                <SectionLabel>
                  {t('Building', 'Gebäude')} {building} · {list.length} {t('free', 'frei')}
                </SectionLabel>
              </div>
              {list.map((f) => (
                <RoomCard
                  key={f.room.ident}
                  name={f.room.code}
                  meta={roomMeta(f.room)}
                  status={freeStatus(f.freeUntil, queryTime)}
                  duration={freeRoomDuration(f, queryTime)}
                  href={`/room/${encodeURIComponent(f.room.ident)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/room/${encodeURIComponent(f.room.ident)}`);
                  }}
                />
              ))}
            </div>
          ))
        )}
      </Page>
    </>
  );
}
