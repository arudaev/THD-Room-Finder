import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Saved rooms — a student stars the rooms they keep coming back to (their usual
 * quiet spot on J's second floor), and the Saved screen answers "is it free
 * right now?". Persisted in localStorage; no account, per the core promise.
 */
const STORAGE_KEY = 'thd_favorites';

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

interface FavoritesValue {
  favorites: string[];
  isFavorite: (ident: string) => boolean;
  toggle: (ident: string) => void;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  const toggle = useCallback((ident: string) => {
    setFavorites((prev) =>
      prev.includes(ident) ? prev.filter((i) => i !== ident) : [...prev, ident],
    );
  }, []);

  const value = useMemo<FavoritesValue>(
    () => ({ favorites, isFavorite: (ident) => favorites.includes(ident), toggle }),
    [favorites, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within <FavoritesProvider>');
  return ctx;
}
