import { LanguageToggle } from '../../components';
import type { Theme } from '../../lib/theme';
import { useTheme } from '../../lib/theme';
import { useI18n } from '../../i18n';
import { Popover, PopoverLabel } from './Popover';

/** A gear glyph — the single visible entry point for theme + language. */
function IconTune({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2.4" fill="var(--md-surface)" />
      <circle cx="15" cy="12" r="2.4" fill="var(--md-surface)" />
      <circle cx="8" cy="18" r="2.4" fill="var(--md-surface)" />
    </svg>
  );
}

/**
 * Settings tucked behind one icon button in the app bar: theme (System / Light /
 * Dark) and language (EN / DE). Keeps the top bar minimal — the controls are out
 * of sight until opened.
 */
export function OverflowMenu() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const themes: { id: Theme; label: string }[] = [
    { id: 'system', label: t('System', 'System') },
    { id: 'light', label: t('Light', 'Hell') },
    { id: 'dark', label: t('Dark', 'Dunkel') },
  ];

  return (
    <Popover ariaLabel={t('Settings', 'Einstellungen')} round trigger={<IconTune />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <PopoverLabel>{t('Theme', 'Design')}</PopoverLabel>
          <div style={{ display: 'inline-flex', gap: 2, background: 'var(--md-surface-1)', border: '1px solid var(--md-outline-variant)', borderRadius: 'var(--radius-xl)', padding: 3 }}>
            {themes.map((th) => {
              const on = th.id === theme;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  style={{
                    border: 'none',
                    borderRadius: 'var(--radius-xl)',
                    cursor: 'pointer',
                    padding: '0.35rem 0.7rem',
                    fontSize: 'var(--body-small-size)',
                    fontWeight: 'var(--weight-medium)',
                    background: on ? 'var(--md-secondary-container)' : 'transparent',
                    color: on ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                  }}
                >
                  {th.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <PopoverLabel>{t('Language', 'Sprache')}</PopoverLabel>
          <LanguageToggle value={locale} onChange={setLocale} />
        </div>
      </div>
    </Popover>
  );
}
