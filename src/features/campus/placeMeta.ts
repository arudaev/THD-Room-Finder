/**
 * Static metadata for the non-teaching / amenity buildings on the campus map —
 * the Library (a study space) and the café/canteen buildings. These host no
 * THabella teaching, so they'd otherwise render as neutral, empty footprints.
 * Keyed by campus-map building key (see CampusMap `key`).
 */
import type { BuildingGlyph } from '../../components';
import type { Translate } from '../../i18n';

export interface PlaceLink {
  label: (t: Translate) => string;
  url: string;
}

export interface PlaceMeta {
  /** Amenity glyph drawn on the map + shown in the panel. */
  glyph: BuildingGlyph;
  /** Short description line. */
  note: (t: Translate) => string;
  /** Amenity lines (café / canteen with floor), if any. */
  amenities?: ((t: Translate) => string)[];
  /** External links (e.g. STWNO menu). */
  links?: PlaceLink[];
  /** Show a live open/closed line (Library uses its own hours; study spaces the
   *  general campus hours). The caller supplies the right schedule. */
  showHours?: boolean;
  /** Show the full today's opening window (e.g. "Open · 07:30–17:00") instead of
   *  the abbreviated "Open until 17:00" — used for the STWNO cafeteria/Mensa
   *  venues, where the whole window matters more than just the closing time. */
  fullHoursFormat?: boolean;
  /** Label for the primary hours line, only needed when `secondaryVenue` also
   *  shows its own hours (otherwise the line is unlabeled). */
  primaryVenueLabel?: (t: Translate) => string;
  /** A second venue in the same building with its own opening hours (e.g. the
   *  Mensa lunch service upstairs from building F's ground-floor café). The
   *  caller supplies the matching CampusHours. */
  secondaryVenue?: {
    label: (t: Translate) => string;
  };
}

// Only the Mensa (building F) publishes a daily Speiseplan — Glashaus and the
// Kaffeebar serve snacks/coffee off a fixed counter, not a changing menu.
const STWNO_MENSA = 'https://stwno.de/en/gastro-en/speiseplan-en/menu-deggendorf/menu-th-deg-mensa';

const menuLink = (url: string): PlaceLink => ({
  label: (t) => t('Menu (STWNO)', 'Speiseplan (STWNO)'),
  url,
});

export const PLACE_META: Record<string, PlaceMeta> = {
  G: {
    glyph: 'book',
    showHours: true,
    note: (t) =>
      t(
        'Library — always a good place to study, within its opening hours.',
        'Bibliothek — immer ein guter Lernort, innerhalb der Öffnungszeiten.',
      ),
  },
  HS: {
    glyph: 'book',
    showHours: true,
    note: (t) =>
      t(
        'Pavillon P — a meeting place (Begegnungsstätte) that is great for studying, plus the Campus-Store.',
        'Pavillon P — eine Begegnungsstätte, ideal zum Lernen, sowie der Campus-Store.',
      ),
    amenities: [
      (t) => t('Meeting & study place', 'Begegnungsstätte & Lernort'),
      (t) => t('Campus-Store', 'Campus-Store'),
    ],
  },
  ITC2: {
    glyph: 'book',
    showHours: true,
    note: (t) =>
      t(
        'ITC² — the ITC² library with open study rooms (Lernräume).',
        'ITC² — die ITC²-Bibliothek mit offenen Lernräumen.',
      ),
    amenities: [(t) => t('Library & study rooms', 'Bibliothek & Lernräume')],
  },
  F: {
    glyph: 'coffee',
    showHours: true,
    fullHoursFormat: true,
    note: (t) => t('Mensa — student dining & café.', 'Mensa — Verpflegung & Café.'),
    amenities: [
      (t) => t('Café · ground floor', 'Café · Erdgeschoss'),
      (t) => t('Mensa · 1st floor', 'Mensa · 1. OG'),
    ],
    links: [menuLink(STWNO_MENSA)],
    primaryVenueLabel: (t) => t('Café', 'Café'),
    secondaryVenue: {
      label: (t) => t('Mensa (lunch)', 'Mensa (Mittagstisch)'),
    },
  },
  GH: {
    glyph: 'coffee',
    showHours: true,
    fullHoursFormat: true,
    note: (t) => t('Mensa Glashaus — student dining.', 'Mensa Glashaus — studentische Verpflegung.'),
    amenities: [
      (t) => t('Mensa · ground floor', 'Mensa · Erdgeschoss'),
      (t) => t('Conference room · 1st floor', 'Konferenzraum · 1. OG'),
    ],
  },
  K: {
    glyph: 'coffee',
    showHours: true,
    fullHoursFormat: true,
    note: (t) => t('Kermi Forum — café on the ground floor.', 'Kermi Forum — Café im Erdgeschoss.'),
    amenities: [(t) => t('Café · ground floor', 'Café · Erdgeschoss')],
  },
};

/** Glyph overlay for the map, derived from PLACE_META. */
export const PLACE_GLYPHS: Record<string, BuildingGlyph> = Object.fromEntries(
  Object.entries(PLACE_META).map(([key, meta]) => [key, meta.glyph]),
);
