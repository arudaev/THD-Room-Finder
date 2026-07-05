import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './i18n';
import { RoomDataProvider } from './features/rooms/RoomDataContext';
import { FavoritesProvider } from './features/favorites/favorites';
import { AppShell } from './app/AppShell';

/**
 * App root — providers wrap the shell:
 *   ThemeProvider  → device-adaptive light/dark
 *   I18nProvider   → EN/DE
 *   RoomDataProvider → THabella data, teaching filter, time-travel, auto-refresh
 *   FavoritesProvider → saved rooms
 */
export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <RoomDataProvider>
          <FavoritesProvider>
            <AppShell />
          </FavoritesProvider>
        </RoomDataProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
