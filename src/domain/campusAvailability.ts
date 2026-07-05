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
 * footprints (F, G, GH, HS, ITC²+, V2) have no distinct live code today and fall
 * back to the map's static sample counts.
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

/**
 * Build a `{ [buildingKey]: { free, total } }` map from the live room set.
 *
 * `total` counts display-eligible rooms (teaching set, minus excluded venues)
 * per building; `free` counts the subset currently free. Keys with no matching
 * live rooms are omitted, so the map can fall back to its static feature props.
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

  // Live counts keyed by the parsed building code.
  const byBuilding = new Map<string, BuildingCount>();
  for (const room of rooms) {
    if (eligibleIdents && !eligibleIdents.has(room.ident)) continue;
    if (isExcludedVenue(room)) continue;
    const code = room.building;
    if (!code) continue;
    const entry = byBuilding.get(code) ?? { free: 0, total: 0 };
    entry.total += 1;
    if (freeIdents.has(room.ident)) entry.free += 1;
    byBuilding.set(code, entry);
  }

  // Fold live counts onto the campus map's building keys.
  const out: Record<string, BuildingCount> = {};
  for (const [key, codes] of Object.entries(CAMPUS_KEY_TO_BUILDINGS)) {
    let free = 0;
    let total = 0;
    let matched = false;
    for (const code of codes) {
      const entry = byBuilding.get(code);
      if (entry) {
        free += entry.free;
        total += entry.total;
        matched = true;
      }
    }
    if (matched) out[key] = { free, total };
  }
  return out;
}
