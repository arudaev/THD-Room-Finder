import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdaptiveNav, CheckInSheet } from '../components';
import { useFocusSession } from '../features/focus/FocusSessionContext';
import { sessionView } from '../features/focus/sessionView';
import { FocusNotifications } from '../features/focus/FocusNotifications';
import { AppUpdates } from '../features/update/AppUpdates';
import type { NavItem } from '../components';
import { IconList, IconMap } from '../components/icons';
import { IconPerson } from '../components/focus/focusIcons';
import { useWindowClass, useWideLayout } from '../lib/useWindowClass';
import { useI18n } from '../i18n';
import { HomeScreen } from '../features/home/HomeScreen';
import { CampusScreen } from '../features/campus/CampusScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SettingsScreen } from '../features/profile/SettingsScreen';
import { RoomDetailScreen } from '../features/detail/RoomDetailScreen';

// Component specimen for `npm run dev` and Vercel previews; the import is
// dropped from production builds because the condition is a build-time
// constant.
const FocusGallery = import.meta.env.DEV || __DEV_GALLERY__
  ? lazy(() => import('../features/dev/FocusGallery').then((m) => ({ default: m.FocusGallery })))
  : null;

/** Maps the current path to the active nav destination. */
function activeId(pathname: string): string {
  if (pathname.startsWith('/rooms')) return 'rooms';
  if (pathname.startsWith('/profile') || pathname.startsWith('/saved')) return 'profile';
  return 'campus';
}

export function AppShell() {
  const cls = useWindowClass();
  const wide = useWideLayout();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const focus = useFocusSession();
  const checkIn =
    focus.active && focus.plan && focus.status ? sessionView(focus.active, focus.plan, focus.status, focus.now, t) : null;

  const items = useMemo<NavItem[]>(
    () => [
      { id: 'campus', label: t('Campus', 'Campus'), icon: <IconMap /> },
      { id: 'rooms', label: t('Rooms', 'Räume'), icon: <IconList /> },
      { id: 'profile', label: t('Profile', 'Profil'), icon: <IconPerson size={24} /> },
    ],
    [t],
  );

  const onSelect = (id: string) => {
    navigate(id === 'campus' ? '/' : `/${id}`);
  };

  const nav = (
    <AdaptiveNav key="navigation"
      items={items}
      active={activeId(location.pathname)}
      onSelect={onSelect}
      variant={!wide ? 'bar' : cls === 'expanded' ? 'drawer' : 'rail'}
    />
  );

  const content = (
    <main key="page-content" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
      <Routes>
        <Route path="/" element={<CampusScreen />} />
        <Route path="/rooms" element={<HomeScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/profile/settings" element={<SettingsScreen />} />
        {/* The Saved tab became part of Profile (#37); old links still work. */}
        <Route path="/saved" element={<Navigate to="/profile" replace />} />
        {/* Share and invite links opened inside the app land on the map. */}
        <Route path="/f/*" element={<Navigate to="/" replace />} />
        <Route path="/i/*" element={<Navigate to="/" replace />} />
        <Route path="/room/:ident" element={<RoomDetailScreen />} />
        {FocusGallery && (
          <Route
            path="/dev/focus"
            element={
              <Suspense fallback={null}>
                <FocusGallery />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<CampusScreen />} />
      </Routes>
      <FocusNotifications />
      <AppUpdates />
      {focus.active && checkIn && (
        <CheckInSheet
          // On the session's own room the focus surface asks instead.
          open={checkIn.phase === 'confirm' && location.pathname !== `/room/${encodeURIComponent(focus.active.roomIdent)}`}
          variant={wide ? 'dialog' : 'sheet'}
          title={
            checkIn.blockLabel
              ? t(`Break's over in ${focus.active.roomCode}`, `Pause vorbei in ${focus.active.roomCode}`)
              : t(`Still focusing in ${focus.active.roomCode}?`, `Lernst du noch in ${focus.active.roomCode}?`)
          }
          meta={`${checkIn.blockLabel ?? checkIn.clock} · ${focus.active.roomCode}`}
          body={checkIn.line}
          endLabel={t('End', 'Beenden')}
          keepLabel={checkIn.confirmLabel}
          onKeep={() => void focus.confirm()}
          onEnd={() => void focus.end()}
        />
      )}
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
