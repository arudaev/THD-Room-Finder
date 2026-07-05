import { Chip } from '../../components';
import type { RoomKind } from '../../domain/roomFilters';
import { useRoomFilters } from '../rooms/RoomFilterContext';
import { useI18n } from '../../i18n';

/**
 * Room filter controls — a "with seats" toggle plus a room-type chip row. Lives
 * in the Rooms tab and (compactly) on Campus; the state is shared, so both the
 * list and the 2.5D map respond to it.
 */
export function RoomFilterBar() {
  const { t } = useI18n();
  const { filters, setWithSeatsOnly, setKind } = useRoomFilters();

  const kinds: { id: RoomKind | 'all'; label: string }[] = [
    { id: 'all', label: t('All types', 'Alle Typen') },
    { id: 'lecture', label: t('Lecture halls', 'Hörsäle') },
    { id: 'computer', label: t('Computer labs', 'PC-Räume') },
    { id: 'lab', label: t('Labs', 'Labore') },
    { id: 'seminar', label: t('Seminar rooms', 'Seminarräume') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 4 }}>
        {kinds.map((k) => (
          <Chip key={k.id} active={filters.kind === k.id} onClick={() => setKind(k.id)}>
            {k.label}
          </Chip>
        ))}
      </div>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          cursor: 'pointer',
          fontSize: 'var(--body-small-size)',
          color: 'var(--md-on-surface-variant)',
          alignSelf: 'flex-start',
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
  );
}
