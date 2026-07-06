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
  /** The Library shows a live open/closed line from its own hours instead. */
  isLibrary?: boolean;
}

const STWNO_MENSA = 'https://stwno.de/en/gastro-en/speiseplan-en/menu-deggendorf/menu-th-deg-mensa';
const STWNO_GLASHAUS = 'https://stwno.de/en/gastro-en/speiseplan-en/menu-deggendorf/menu-th-deg-glashaus';
const STWNO_DEGGENDORF = 'https://stwno.de/en/gastro-en/speiseplan-en/menu-deggendorf';

const menuLink = (url: string): PlaceLink => ({
  label: (t) => t('Menu (STWNO)', 'Speiseplan (STWNO)'),
  url,
});

export const PLACE_META: Record<string, PlaceMeta> = {
  G: {
    glyph: 'book',
    isLibrary: true,
    note: (t) =>
      t(
        'Library — always a good place to study, within its opening hours.',
        'Bibliothek — immer ein guter Lernort, innerhalb der Öffnungszeiten.',
      ),
  },
  F: {
    glyph: 'coffee',
    note: (t) => t('Mensa — student dining & café.', 'Mensa — Verpflegung & Café.'),
    amenities: [
      (t) => t('Café · ground floor', 'Café · Erdgeschoss'),
      (t) => t('Canteen · 1st floor', 'Mensa · 1. OG'),
    ],
    links: [menuLink(STWNO_MENSA)],
  },
  GH: {
    glyph: 'coffee',
    note: (t) => t('Glashaus — café.', 'Glashaus — Café.'),
    amenities: [(t) => t('Café · ground floor', 'Café · Erdgeschoss')],
    links: [menuLink(STWNO_GLASHAUS)],
  },
  K: {
    glyph: 'coffee',
    note: (t) => t('Kermi Forum — café on the ground floor.', 'Kermi Forum — Café im Erdgeschoss.'),
    amenities: [(t) => t('Café · ground floor', 'Café · Erdgeschoss')],
    links: [menuLink(STWNO_DEGGENDORF)],
  },
};

/** Glyph overlay for the map, derived from PLACE_META. */
export const PLACE_GLYPHS: Record<string, BuildingGlyph> = Object.fromEntries(
  Object.entries(PLACE_META).map(([key, meta]) => [key, meta.glyph]),
);
