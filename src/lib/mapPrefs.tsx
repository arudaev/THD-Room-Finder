import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Small map display preferences, persisted to localStorage. Currently just the
 * amenity glyphs (café / study badges) overlay on the campus map, so students
 * who find them noisy can switch them off. Mirrors the theme provider pattern.
 */
const STORAGE_KEY = 'thd_map_glyphs';

function initialShowGlyphs(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

interface MapPrefsValue {
  showGlyphs: boolean;
  setShowGlyphs: (v: boolean) => void;
}

const MapPrefsContext = createContext<MapPrefsValue | null>(null);

export function MapPrefsProvider({ children }: { children: ReactNode }) {
  const [showGlyphs, setShowGlyphs] = useState<boolean>(initialShowGlyphs);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, showGlyphs ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }, [showGlyphs]);

  const value = useMemo<MapPrefsValue>(() => ({ showGlyphs, setShowGlyphs }), [showGlyphs]);
  return <MapPrefsContext.Provider value={value}>{children}</MapPrefsContext.Provider>;
}

export function useMapPrefs(): MapPrefsValue {
  const ctx = useContext(MapPrefsContext);
  if (!ctx) throw new Error('useMapPrefs must be used within <MapPrefsProvider>');
  return ctx;
}
