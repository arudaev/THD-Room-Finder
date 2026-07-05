import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { FreeRoom, Room, ScheduledEvent } from '../../domain/models';
import { computeFreeRooms } from '../../domain/availability';
import { getEventsForDate, getRooms, getTeachingRoomIdents } from '../../data/thabellaClient';

const REFRESH_MS = 5 * 60 * 1000;

export interface RoomData {
  loading: boolean;
  error: string | null;
  rooms: Room[];
  /** Events for the query day (drives detail schedules + availability). */
  events: ScheduledEvent[];
  /** Teaching-room eligibility set for the current week (offices excluded). */
  teachingIdents: Set<string> | null;
  /** Free rooms at `queryTime`, duration-ranked and teaching-filtered. */
  freeRooms: FreeRoom[];
  queryTime: Date;
  isCustomTime: boolean;
  lastUpdated: Date | null;
  setQueryTime: (d: Date) => void;
  resetTime: () => void;
  refresh: () => void;
}

const RoomDataContext = createContext<RoomData | null>(null);

export function RoomDataProvider({ children }: { children: ReactNode }) {
  const [queryTime, setQueryTimeState] = useState<Date>(() => new Date());
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [teachingIdents, setTeachingIdents] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (when: Date) => {
    setLoading(true);
    setError(null);
    try {
      const [roomList, idents, dayEvents] = await Promise.all([
        getRooms(),
        getTeachingRoomIdents(),
        getEventsForDate(when),
      ]);
      setRooms(roomList);
      setTeachingIdents(idents);
      setEvents(dayEvents);
      setLastUpdated(new Date());
    } catch (e) {
      setError((e as Error).message || 'Could not reach THabella.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(queryTime);
  }, [queryTime, load]);

  // 5-minute silent auto-refresh — only while pinned to "now".
  useEffect(() => {
    const id = setInterval(() => {
      if (!isCustomTime) setQueryTimeState(new Date());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [isCustomTime]);

  const freeRooms = useMemo(
    () =>
      computeFreeRooms(rooms, events, queryTime, {
        eligibleIdents: teachingIdents ?? undefined,
      }),
    [rooms, events, queryTime, teachingIdents],
  );

  const setQueryTime = useCallback((d: Date) => {
    setIsCustomTime(true);
    setQueryTimeState(d);
  }, []);
  const resetTime = useCallback(() => {
    setIsCustomTime(false);
    setQueryTimeState(new Date());
  }, []);
  const refresh = useCallback(() => setQueryTimeState(new Date()), []);

  const value = useMemo<RoomData>(
    () => ({
      loading,
      error,
      rooms,
      events,
      teachingIdents,
      freeRooms,
      queryTime,
      isCustomTime,
      lastUpdated,
      setQueryTime,
      resetTime,
      refresh,
    }),
    [
      loading,
      error,
      rooms,
      events,
      teachingIdents,
      freeRooms,
      queryTime,
      isCustomTime,
      lastUpdated,
      setQueryTime,
      resetTime,
      refresh,
    ],
  );

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>;
}

export function useRoomData(): RoomData {
  const ctx = useContext(RoomDataContext);
  if (!ctx) throw new Error('useRoomData must be used within <RoomDataProvider>');
  return ctx;
}
