import { AppBar, IconButton, LanguageToggle } from '../../components';
import { IconMoon, IconSun } from '../../components/icons';
import { useTheme } from '../../lib/theme';
import { useI18n } from '../../i18n';

const stickyBar = { position: 'sticky' as const, top: 0, zIndex: 10 };

/** Brand app bar shared by the top-level tabs — language + theme controls. */
export function BrandHeader({ title }: { title?: string }) {
  const { theme, cycle } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const themeLabel =
    theme === 'dark'
      ? t('Dark theme', 'Dunkles Design')
      : theme === 'light'
        ? t('Light theme', 'Helles Design')
        : t('System theme', 'System-Design');

  return (
    <AppBar
      title={title}
      style={stickyBar}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', paddingRight: '0.25rem' }}>
          <LanguageToggle size="small" value={locale} onChange={setLocale} />
          <IconButton label={themeLabel} onClick={cycle}>
            {theme === 'dark' ? <IconMoon size={20} /> : <IconSun size={20} />}
          </IconButton>
        </div>
      }
    />
  );
}
