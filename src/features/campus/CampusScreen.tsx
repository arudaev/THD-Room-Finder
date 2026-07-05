import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CampusMap, CAMPUS_GEOJSON, CAMPUS_CONTEXT, RoomCard } from '../../components';
import type { Availability } from '../../components';
import { useRoomData } from '../rooms/RoomDataContext';
import { useRoomFilters } from '../rooms/RoomFilterContext';
import { useFavorites } from '../favorites/favorites';
import { useI18n } from '../../i18n';
import { useTheme } from '../../lib/theme';
import { useWindowClass, useWideLayout } from '../../lib/useWindowClass';
import { freeRoomDuration, roomMeta } from '../../domain/format';
import { freeStatus } from '../../domain/availability';
import {
  buildingAvailability,
  campusKeyForRoom,
} from '../../domain/campusAvailability';
import type { BuildingCount } from '../../domain/campusAvailability';
import { favoritesFirst, matchesRoomFilters } from '../../domain/roomFilters';
import type { FreeRoom } from '../../domain/models';
import { BrandHeader } from '../shared/BrandHeader';
import { ClosedNotice } from '../shared/ClosedNotice';
import { FilterMenu } from '../shared/FilterMenu';
import { Spinner } from '../shared/ui';

/** On-roof label + full name per campus building key, from the map geometry. */
const KEY_META: Record<string, { label: string; name: string }> = Object.fromEntries(
  CAMPUS_GEOJSON.features.map((f) => [
    f.properties.key,
    { label: f.properties.label, name: f.properties.name },
  ]),
);

/** Badge tint for a building count — teal when roomy, muted when tight/full. */
function availColor(a?: BuildingCount): string {
  if (!a || a.free === 0) return '#74777F';
  return a.total && a.free / a.total >= 0.5 ? 'var(--md-tertiary)' : '#4DB6AC';
}

function IconArrowLeft({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function BuildingBadge({ label, color, size = 44 }: { label: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-m)',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: size >= 44 ? '0.95rem' : '0.8rem',
        color: '#fff',
        flexShrink: 0,
        background: color,
      }}
    >
      {label}
    </div>
  );
}

/**
 * Campus locator — a 2.5D map of THD's riverside core, each building tinted by
 * how many of its rooms are free right now. Tap a building to see its free
 * rooms, then a room for its schedule. The map is the primary path; the plain
 * building-grouped list has been replaced by the design-system `CampusMap`.
 *
 * Layout adapts to the window size class: a stacked map-over-list on compact
 * (phone), a map + side-panel split on medium/expanded (tablet / desktop).
 */
export function CampusScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme } = useTheme();
  const cls = useWindowClass();
  const wide = useWideLayout();
  const { rooms, freeRooms, teachingIdents, queryTime, campusHours, loading } = useRoomData();
  const { filters } = useRoomFilters();
  const { isFavorite } = useFavorites();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Apply the shared room filters (seats / type) to both the lists and the map
  // tint, then float saved rooms to the top.
  const filteredFree = useMemo<FreeRoom[]>(
    () => favoritesFirst(freeRooms.filter((f) => matchesRoomFilters(f.room, filters)), isFavorite),
    [freeRooms, filters, isFavorite],
  );

  const availability = useMemo<Availability>(
    () =>
      buildingAvailability(
        rooms.filter((r) => matchesRoomFilters(r, filters)),
        filteredFree,
        teachingIdents ?? undefined,
      ),
    [rooms, filteredFree, teachingIdents, filters],
  );

  const selectedRooms = useMemo<FreeRoom[]>(() => {
    if (!selectedKey) return [];
    return filteredFree.filter((f) => campusKeyForRoom(f.room) === selectedKey);
  }, [selectedKey, filteredFree]);

  const mapMode = theme === 'system' ? 'auto' : theme;
  const openRoom = (ident: string) => navigate(`/room/${encodeURIComponent(ident)}`);

  const list = (items: FreeRoom[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-6) var(--space-4)',
            color: 'var(--md-on-surface-variant)',
            fontSize: 'var(--body-medium-size)',
            background: 'var(--md-surface-1)',
            borderRadius: 'var(--radius-l)',
          }}
        >
          {t('No free rooms here right now. Pick another building.', 'Hier ist gerade nichts frei. Anderes Gebäude wählen.')}
        </div>
      ) : (
        items.map((f) => (
          <RoomCard
            key={f.room.ident}
            name={f.room.code}
            meta={roomMeta(f.room)}
            status={freeStatus(f.freeUntil, queryTime)}
            duration={freeRoomDuration(f, queryTime)}
            href={`/room/${encodeURIComponent(f.room.ident)}`}
            onClick={(e) => {
              e.preventDefault();
              openRoom(f.room.ident);
            }}
          />
        ))
      )}
    </div>
  );

  // The panel below / beside the map: a "campus closed" banner when the
  // buildings are shut, else the selected building's rooms, else the free-now
  // hero + longest-free list.
  const panel = !campusHours.open ? (
    <ClosedNotice hours={campusHours} />
  ) : selectedKey ? (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={() => setSelectedKey(null)}
          aria-label={t('Back to all rooms', 'Zurück zu allen Räumen')}
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--md-surface-1)',
            color: 'var(--md-on-surface-variant)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <IconArrowLeft />
        </button>
        <BuildingBadge label={KEY_META[selectedKey]?.label ?? selectedKey} color={availColor(availability[selectedKey])} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 'var(--title-medium-size)', fontWeight: 600, lineHeight: 1.2, color: 'var(--md-on-surface)' }}>
            {KEY_META[selectedKey]?.name ?? selectedKey}
          </div>
          <div style={{ fontSize: 'var(--body-small-size)', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
            <b style={{ color: 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>{selectedRooms.length}</b>{' '}
            {t('rooms free right now', 'Räume jetzt frei')}
          </div>
        </div>
      </div>
      {list(selectedRooms)}
    </>
  ) : (
    <>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 'clamp(3.5rem, 14vw, var(--display-small-size))',
            lineHeight: 1,
            fontWeight: 'var(--weight-light)',
            color: 'var(--md-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {loading && filteredFree.length === 0 ? '—' : filteredFree.length}
        </div>
        <div style={{ fontSize: 'var(--title-medium-size)', color: 'var(--md-on-surface)', marginTop: 'var(--space-2)' }}>
          {t('rooms free right now', 'Räume jetzt frei')}
        </div>
        <div style={{ fontSize: 'var(--body-small-size)', color: 'var(--md-on-surface-variant)', marginTop: 'var(--space-3)' }}>
          {t('Tap a building on the map to see its free rooms.', 'Tippe ein Gebäude auf der Karte für freie Räume.')}
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ marginLeft: 'auto' }}>
          <FilterMenu />
        </div>
      </div>
      {list(filteredFree)}
    </>
  );

  const map = (
    <CampusMap
      campus={CAMPUS_GEOJSON}
      context={CAMPUS_CONTEXT}
      availability={availability}
      mode={mapMode}
      selectedKey={selectedKey ?? ''}
      onSelect={(k) => setSelectedKey(k)}
      style={{ width: '100%', height: '100%' }}
    />
  );

  if (loading && freeRooms.length === 0) {
    return (
      <>
        <BrandHeader title={t('Campus', 'Campus')} />
        <Spinner label={t('Checking THabella…', 'THabella wird abgefragt…')} />
      </>
    );
  }

  // Split layout: map fills, side panel scrolls (wide landscape tablet / desktop).
  if (wide) {
    const panelWidth = cls === 'expanded' ? 420 : 340;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <BrandHeader title={t('Campus', 'Campus')} />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>{map}</div>
          <aside
            style={{
              width: panelWidth,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              overflowY: 'auto',
              background: 'var(--md-surface)',
              borderLeft: '1px solid var(--md-outline-variant)',
            }}
          >
            {panel}
          </aside>
        </div>
      </div>
    );
  }

  // Compact: stacked map over list (phone).
  return (
    <>
      <BrandHeader title={t('Campus', 'Campus')} />
      <div style={{ position: 'relative', height: 'clamp(260px, 42vh, 440px)', flexShrink: 0 }}>{map}</div>
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          marginInline: 'auto',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {panel}
      </div>
    </>
  );
}
