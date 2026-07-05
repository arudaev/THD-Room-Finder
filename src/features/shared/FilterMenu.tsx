import { Chip } from '../../components';
import type { RoomKind } from '../../domain/roomFilters';
import { useRoomFilters } from '../rooms/RoomFilterContext';
import { useI18n } from '../../i18n';
import { Popover, PopoverLabel } from './Popover';

function IconSliders({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

/**
 * Compact filter control: a small "Filters" pill that opens a popover with the
 * room-type + seats options (and building chips on the Rooms tab). The filter
 * state is shared, so the choices here also re-tint the campus map. Kept out of
 * sight until opened, so the room list stays the focus.
 */
export function FilterMenu({
  buildings,
  building,
  onBuilding,
}: {
  buildings?: string[];
  building?: string | null;
  onBuilding?: (b: string | null) => void;
}) {
  const { t } = useI18n();
  const { filters, setWithSeatsOnly, setKind, isFiltered } = useRoomFilters();

  const kinds: { id: RoomKind | 'all'; label: string }[] = [
    { id: 'all', label: t('All types', 'Alle Typen') },
    { id: 'lecture', label: t('Lecture halls', 'Hörsäle') },
    { id: 'computer', label: t('Computer labs', 'PC-Räume') },
    { id: 'lab', label: t('Labs', 'Labore') },
    { id: 'seminar', label: t('Seminar rooms', 'Seminarräume') },
  ];

  const showBuildings = buildings && buildings.length > 0 && onBuilding;
  const active = isFiltered || (building != null);

  return (
    <Popover
      ariaLabel={t('Filters', 'Filter')}
      active={active}
      trigger={
        <>
          <IconSliders />
          {t('Filters', 'Filter')}
          {active && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--md-primary)',
                display: 'inline-block',
              }}
            />
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <PopoverLabel>{t('Room type', 'Raumtyp')}</PopoverLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {kinds.map((k) => (
              <Chip key={k.id} active={filters.kind === k.id} onClick={() => setKind(k.id)}>
                {k.label}
              </Chip>
            ))}
          </div>
        </div>

        {showBuildings && (
          <div>
            <PopoverLabel>{t('Building', 'Gebäude')}</PopoverLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <Chip active={building == null} onClick={() => onBuilding?.(null)}>
                {t('All', 'Alle')}
              </Chip>
              {buildings.map((b) => (
                <Chip key={b} active={building === b} onClick={() => onBuilding?.(b)}>
                  {b}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            cursor: 'pointer',
            fontSize: 'var(--body-small-size)',
            color: 'var(--md-on-surface-variant)',
          }}
        >
          <input
            type="checkbox"
            checked={filters.withSeatsOnly}
            onChange={(e) => setWithSeatsOnly(e.target.checked)}
            style={{ accentColor: 'var(--md-primary)', width: 16, height: 16 }}
          />
          {t('Only rooms with seat info', 'Nur Räume mit Platzangabe')}
        </label>
      </div>
    </Popover>
  );
}
