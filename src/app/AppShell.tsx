import { useMemo } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdaptiveNav } from '../components';
import type { NavItem } from '../components';
import { IconList, IconMap, IconStar } from '../components/icons';
import { useWindowClass, useWideLayout } from '../lib/useWindowClass';
import { useI18n } from '../i18n';
import { useFavorites } from '../features/favorites/favorites';
import { HomeScreen } from '../features/home/HomeScreen';
import { CampusScreen } from '../features/campus/CampusScreen';
import { FavoritesScreen } from '../features/favorites/FavoritesScreen';
import { RoomDetailScreen } from '../features/detail/RoomDetailScreen';

/** Maps the current path to the active nav destination. */
function activeId(pathname: string): string {
  if (pathname.startsWith('/rooms')) return 'rooms';
  if (pathname.startsWith('/saved')) return 'saved';
  return 'campus';
}

export function AppShell() {
  const cls = useWindowClass();
  const wide = useWideLayout();
  const { t } = useI18n();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  const items = useMemo<NavItem[]>(
    () => [
      { id: 'campus', label: t('Campus', 'Campus'), icon: <IconMap /> },
      { id: 'rooms', label: t('Rooms', 'Räume'), icon: <IconList /> },
      {
        id: 'saved',
        label: t('Saved', 'Gespeichert'),
        icon: <IconStar />,
        badge: favorites.length > 0 ? favorites.length : undefined,
      },
    ],
    [t, favorites.length],
  );

  const onSelect = (id: string) => {
    navigate(id === 'campus' ? '/' : `/${id}`);
  };

  const nav = (
    <AdaptiveNav
      items={items}
      active={activeId(location.pathname)}
      onSelect={onSelect}
      variant={!wide ? 'bar' : cls === 'expanded' ? 'drawer' : 'rail'}
    />
  );

  const content = (
    <main style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
      <Routes>
        <Route path="/" element={<CampusScreen />} />
        <Route path="/rooms" element={<HomeScreen />} />
        <Route path="/saved" element={<FavoritesScreen />} />
        <Route path="/room/:ident" element={<RoomDetailScreen />} />
        <Route path="*" element={<CampusScreen />} />
      </Routes>
    </main>
  );

  if (!wide) {
    // Content scrolls; bottom navigation bar pinned below.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        {content}
        {nav}
      </div>
    );
  }
  // Rail / drawer pinned left; content scrolls beside it.
  return (
    <div style={{ display: 'flex', height: '100dvh' }}>
      {nav}
      {content}
    </div>
  );
}
