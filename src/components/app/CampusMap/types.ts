import type { CSSProperties } from 'react';

/** A GeoJSON-ish building feature. `properties` carry the room-finder fields. */
export interface CampusBuildingFeature {
  type: 'Feature';
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
  properties: {
    /** Stable id used for selection + availability lookup (e.g. "C", "ITC2"). */
    key: string;
    /** Short on-roof label (e.g. "C", "ITC²"). */
    label: string;
    /** Full human name shown by the host UI. */
    name: string;
    /** Building height in metres (drives the extrusion). */
    height?: number;
    /** true = off the riverside core (selecting it reframes the map). */
    sat?: boolean;
    /** Building centroid — used for label/placement + framing. */
    lon: number;
    lat: number;
    /** Fallback availability if the `availability` prop omits this key. */
    free?: number;
    total?: number;
  };
}

export interface CampusData {
  type: 'FeatureCollection';
  features: CampusBuildingFeature[];
}

/** Surroundings, as raw [lon,lat] geometry (all optional). */
export interface CampusContext {
  roads?: { g: [number, number][]; n?: string; big?: 0 | 1 }[];
  paths?: { g: [number, number][] }[];
  water?: [number, number][][];
  river?: [number, number][][];
  green?: [number, number][][];
  trees?: [number, number][];
}

/** Per-building live availability (overrides feature props). */
export type Availability = Record<string, { free: number; total: number }>;

/** Small amenity glyph drawn above a building's roof label. */
export type BuildingGlyph = 'coffee' | 'book' | 'printer';
/** Per-building glyph overlay (e.g. café buildings, the Library). */
export type BuildingGlyphs = Record<string, BuildingGlyph>;

/** Deep-overridable colour theme. Omitted keys fall back to the default. */
export interface CampusTheme {
  ramp?: string[];
  rampStops?: number[];
  status?: { full?: string; some?: string; free?: string; busy?: string };
  selOutline?: { dark?: string; light?: string };
  donau?: string;
  light?: Record<string, unknown>;
  dark?: Record<string, unknown>;
}

export interface CampusMapProps {
  /** Buildings to extrude + make selectable. */
  campus: CampusData;
  /** Optional surroundings (streets, Donau, parks, trees). */
  context?: CampusContext;
  /** Live free/total per building key; falls back to feature props. */
  availability?: Availability;
  /** 'auto' follows the OS setting; 'light' / 'dark' force it. */
  mode?: 'auto' | 'light' | 'dark';
  /** Override any palette colour — the single theming surface. */
  theme?: CampusTheme;
  /** Initial camera, in degrees. */
  bearing?: number;
  tilt?: number;
  /** Controlled selection. Omit to let the map manage its own. */
  selectedKey?: string;
  /** Fires with the building key when one is tapped. */
  onSelect?: (key: string) => void;
  /** Enable drag-pan / wheel-zoom / tap-select (default true). */
  interactive?: boolean;
  showLabels?: boolean;
  showTrees?: boolean;
  /** Optional amenity glyph per building key, drawn above the roof label. */
  glyphs?: BuildingGlyphs;
  style?: CSSProperties;
}
