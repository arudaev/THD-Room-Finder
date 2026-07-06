import { useI18n } from '../../i18n';
import { Popover, PopoverLabel } from './Popover';
import { IconSearch, IconX } from '../../components/icons';

/**
 * Compact room-search control. The trigger is a magnifier pill; the text field
 * lives in a popover until tapped. Controlled by the parent (which owns the
 * query and renders the matching rooms), mirroring `TimeControl`.
 */
export function SearchControl({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const { t } = useI18n();
  const active = query.trim().length > 0;

  return (
    <Popover
      ariaLabel={t('Search rooms', 'Räume suchen')}
      active={active}
      align="end"
      trigger={
        <>
          <IconSearch size={16} />
          {t('Search', 'Suche')}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <PopoverLabel>{t('Find a room', 'Raum finden')}</PopoverLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('Code, name or equipment', 'Nummer, Name oder Ausstattung')}
            aria-label={t('Search by room code, name or equipment', 'Nach Raumnummer, Name oder Ausstattung suchen')}
            style={{
              flex: 1,
              minWidth: 0,
              border: '1px solid var(--md-outline-variant)',
              background: 'var(--md-surface)',
              color: 'var(--md-on-surface)',
              borderRadius: 'var(--radius-s)',
              padding: '0.5rem 0.6rem',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--body-medium-size)',
            }}
          />
          {active && (
            <button
              type="button"
              onClick={() => onQuery('')}
              aria-label={t('Clear search', 'Suche löschen')}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                flexShrink: 0,
                border: 'none',
                borderRadius: '50%',
                background: 'var(--md-surface-1)',
                color: 'var(--md-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              <IconX size={16} />
            </button>
          )}
        </div>
        <div style={{ fontSize: 'var(--body-small-size)', color: 'var(--md-on-surface-variant)' }}>
          {t('e.g. "B004" or "projector"', 'z. B. „B004" oder „Beamer"')}
        </div>
      </div>
    </Popover>
  );
}
