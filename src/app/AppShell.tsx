import { useMemo } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdaptiveNav } from '../components';
import type { NavItem } from '../components';
import { IconList, IconMap, IconStar } from '../components/icons';
import { useWindowClass } from '../lib/useWindowClass';
import { useI18n } from '../i18n';
import { useFavorites } from '../features/favorites/favorites';
import { HomeScreen } from '../features/home/HomeScreen';
import { CampusScreen } from '../features/campus/CampusScreen';
import { FavoritesScreen } from '../features/favorites/FavoritesScreen';
import { RoomDetailScreen } from '../features/detail/RoomDetailScreen';

/** Maps the current path to the active nav destination. */
function activeId(pathname: string): string {
  if (pathname.startsWith('/campus')) return 'campus';
  if (pathname.startsWith('/saved')) return 'saved';
  return 'rooms';
}

export function AppShell() {
  const cls = useWindowClass();
  const { t } = useI18n();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  const items = useMemo<NavItem[]>(
    () => [
      { id: 'rooms', label: t('Rooms', 'Räume'), icon: <IconList /> },
      { id: 'campus', label: t('Campus', 'Campus'), icon: <IconMap /> },
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
    navigate(id === 'rooms' ? '/' : `/${id}`);
  };

  const nav = (
    <AdaptiveNav
      items={items}
      active={activeId(location.pathname)}
      onSelect={onSelect}
      variant={cls === 'compact' ? 'bar' : cls === 'medium' ? 'rail' : 'drawer'}
    />
  );

  const content = (
    <main style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/campus" element={<CampusScreen />} />
        <Route path="/saved" element={<FavoritesScreen />} />
        <Route path="/room/:ident" element={<RoomDetailScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </main>
  );

  if (cls === 'compact') {
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
