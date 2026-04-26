const ROOMS_TTL_MS  = 24 * 60 * 60 * 1000;
const EVENTS_TTL_MS =  5 * 60 * 1000;
const API_BASE = 'https://thd-room-finder.vercel.app';

export function toSqlDate(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw); // { timestamp, data }
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Quota exceeded — ignore; network data was already returned
  }
}

export async function fetchRooms() {
  const cached = readCache('thd_rooms');
  if (cached && Date.now() - cached.timestamp < ROOMS_TTL_MS) {
    return cached.data;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/api/rooms`);
  } catch {
    if (cached) return cached.data; // network down — serve stale
    throw new Error('No internet connection and no cached room data.');
  }

  if (!res.ok) {
    if (cached) return cached.data;
    throw new Error(`Could not load rooms (HTTP ${res.status})`);
  }

  const data = await res.json();
  writeCache('thd_rooms', data);
  return data;
}

export async function fetchPeriods(sqlDate) {
  const key = `thd_events_${sqlDate}`;
  const cached = readCache(key);
  if (cached && Date.now() - cached.timestamp < EVENTS_TTL_MS) {
    return cached.data;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/api/periods?date=${encodeURIComponent(sqlDate)}`);
  } catch {
    if (cached) return cached.data;
    throw new Error('No internet connection and no cached schedule data.');
  }

  if (!res.ok) {
    if (cached) return cached.data;
    throw new Error(`Could not load schedule (HTTP ${res.status})`);
  }

  const data = await res.json();
  writeCache(key, data);
  return data;
}
