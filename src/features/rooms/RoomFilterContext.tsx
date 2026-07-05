import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { RoomFilters, RoomKind } from '../../domain/roomFilters';
import { DEFAULT_ROOM_FILTERS } from '../../domain/roomFilters';

/**
 * Shared room-filter state. The Rooms tab exposes the controls, but the filters
 * live here so the Campus 2.5D map reflects the same configuration ("show only
 * computer labs" tints the map too). Persisted to localStorage.
 */
const STORAGE_KEY = 'thd_room_filters';

function load(): RoomFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RoomFilters>;
      return {
        withSeatsOnly:
          typeof parsed.withSeatsOnly === 'boolean'
            ? parsed.withSeatsOnly
            : DEFAULT_ROOM_FILTERS.withSeatsOnly,
        kind: parsed.kind ?? DEFAULT_ROOM_FILTERS.kind,
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ROOM_FILTERS;
}

interface RoomFilterValue {
  filters: RoomFilters;
  setWithSeatsOnly: (v: boolean) => void;
  setKind: (k: RoomKind | 'all') => void;
  /** True when anything is narrowed from the defaults (for a badge/indicator). */
  isFiltered: boolean;
}

const RoomFilterContext = createContext<RoomFilterValue | null>(null);

export function RoomFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<RoomFilters>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  const setWithSeatsOnly = useCallback(
    (withSeatsOnly: boolean) => setFilters((f) => ({ ...f, withSeatsOnly })),
    [],
  );
  const setKind = useCallback((kind: RoomKind | 'all') => setFilters((f) => ({ ...f, kind })), []);

  const value = useMemo<RoomFilterValue>(
    () => ({
      filters,
      setWithSeatsOnly,
      setKind,
      isFiltered:
        filters.kind !== DEFAULT_ROOM_FILTERS.kind ||
        filters.withSeatsOnly !== DEFAULT_ROOM_FILTERS.withSeatsOnly,
    }),
    [filters, setWithSeatsOnly, setKind],
  );

  return <RoomFilterContext.Provider value={value}>{children}</RoomFilterContext.Provider>;
}

export function useRoomFilters(): RoomFilterValue {
  const ctx = useContext(RoomFilterContext);
  if (!ctx) throw new Error('useRoomFilters must be used within <RoomFilterProvider>');
  return ctx;
}
