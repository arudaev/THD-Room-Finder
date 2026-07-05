/**
 * Per-building availability for the 2.5D campus map — collapses the live,
 * duration-ranked free-room list into a `{ free, total }` count per campus
 * building key, which tints each footprint on the map.
 *
 * Framework-free (domain layer): the returned record is structurally the
 * `Availability` shape the `CampusMap` component consumes, without importing it.
 */
import type { FreeRoom, Room } from './models';
import { isExcludedVenue } from './priority';

/** One building's headline availability. */
export interface BuildingCount {
  free: number;
  total: number;
}

/**
 * Campus map building key → the live THabella building code(s) it represents.
 * The map keys (from the OSM footprints) are the Deggendorf riverside core;
 * live `room.building` codes are parsed from THabella room names. Single-letter
 * buildings match directly; ITC² maps onto the parsed "ITC" group; a handful of
 * footprints (F, G, GH, HS, V2) have no distinct live code today and remain
 * neutral unless THabella starts returning an eligible room for their code.
 */
export const CAMPUS_KEY_TO_BUILDINGS: Record<string, string[]> = {
  A: ['A'],
  B: ['B'],
  C: ['C'],
  D: ['D'],
  E: ['E'],
  F: ['F'],
  G: ['G'],
  GH: ['GH'],
  H: ['H'],
  HS: ['HS'],
  I: ['I'],
  J: ['J'],
  K: ['K'],
  L: ['L'],
  ITC2: ['ITC'],
  ITC2P: [],
  DEGG: ['DEGG', 'Deggs'],
  V2: ['V2'],
};

/** Resolve one parsed THabella room onto its campus-map footprint. */
export function campusKeyForRoom(room: Room): string | null {
  // The general room mapper intentionally keeps the legacy `ITC` building code,
  // so split ITC²+ using the raw label before applying the building aliases.
  if (/^ITC\s*2\+/i.test(room.name)) return 'ITC2P';

  for (const [key, codes] of Object.entries(CAMPUS_KEY_TO_BUILDINGS)) {
    if (codes.includes(room.building)) return key;
  }
  return null;
}

/**
 * Build a `{ [buildingKey]: { free, total } }` map from the live room set.
 *
 * `total` counts display-eligible rooms (teaching set, minus excluded venues)
 * per building; `free` counts the subset currently free. Every campus key is
 * returned so missing live data stays neutral instead of exposing sample data.
 *
 * @param rooms          all rooms known to THabella
 * @param freeRooms      the currently-free, duration-ranked, filtered list
 * @param eligibleIdents teaching-room eligibility set (offices excluded); when
 *                       omitted, every non-excluded room counts toward totals
 */
export function buildingAvailability(
  rooms: Room[],
  freeRooms: FreeRoom[],
  eligibleIdents?: ReadonlySet<string>,
): Record<string, BuildingCount> {
  const freeIdents = new Set(freeRooms.map((f) => f.room.ident));
  const out = Object.fromEntries(
    Object.keys(CAMPUS_KEY_TO_BUILDINGS).map((key) => [key, { free: 0, total: 0 }]),
  ) as Record<string, BuildingCount>;

  for (const room of rooms) {
    if (eligibleIdents && !eligibleIdents.has(room.ident)) continue;
    if (isExcludedVenue(room)) continue;
    const key = campusKeyForRoom(room);
    if (!key) continue;
    const entry = out[key];
    entry.total += 1;
    if (freeIdents.has(room.ident)) entry.free += 1;
  }
  return out;
}
