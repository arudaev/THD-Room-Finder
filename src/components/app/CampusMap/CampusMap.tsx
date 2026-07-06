import React from 'react';
import type {
  Availability,
  BuildingGlyph,
  BuildingGlyphs,
  CampusContext,
  CampusData,
  CampusMapProps,
  CampusTheme,
} from './types';

/* =====================================================================
   CampusMap — self-contained axonometric 2.5D campus map.
   Real OSM footprints + surroundings → local metres → rotate(bearing)
   → axonometric projection → extruded prisms tinted by availability.
   No tiles, no WebGL, no API. Data in via props, selection out via
   onSelect. Every colour lives in the THEME (override via `theme`).

   Faithful TypeScript port of the Claude Design component
   (de229b71 · components/app/CampusMap/CampusMap.jsx).
   ===================================================================== */

type Pt = number[];

/* ---- colour helpers ---- */
const hex = (h: string): number[] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: number[], b: number[], t: number): number[] => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c: number[]): string => 'rgb(' + c.map((v) => Math.round(v)).join(',') + ')';

/** Signed polygon area: positive for CCW rings, negative for CW rings. */
const signedArea = (poly: Pt[]): number =>
  poly.reduce((sum, a, i) => {
    const b = poly[(i + 1) % poly.length];
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0) / 2;

// These footprints overlap after projection in ways that no single scalar
// depth can order correctly. Each pair is [paint first, paint on top].
const BUILDING_DRAW_ORDER: ReadonlyArray<readonly [string, string]> = [
  ['C', 'HS'],
  ['G', 'E'],
  ['GH', 'ITC2'],
];

/* ---- default THEME (deep-merge with `theme` prop) ---- */
const DEFAULT_THEME = {
  // Availability ramp (full → wide-open) on THD's teal "free" family.
  ramp: ['#C4C6D0', '#9DC3BC', '#5FB3A6', '#2E9E8C', '#00897B'], // full → wide-open
  rampStops: [0, 0.18, 0.42, 0.7, 1],
  status: { full: '#C4C6D0', some: '#4DB6AC', free: '#00796B', busy: '#B3261E' },
  selOutline: { dark: '#90CAF9', light: '#1565C0' }, // THD blue selection
  donau: '#5C7E91',
  light: {
    ground: '#E7EAF2', green: '#CBD8CE', water: '#BBD4E4', road: '#FDFCFF', roadBig: '#D5D8E2',
    path: '#DDE0EA', wallR: '#CFD3DE', wallL: '#A7ABBA', trunk: '#7C7A70', text: '#1C1B1F',
    halo: '#F4F6FA', street: '#74777F', tree: ['#88AE86', '#6E9A72', '#9DBE96'], shadow: 0.12,
  },
  dark: {
    ground: '#111318', green: '#1E2A22', water: '#1B2B38', road: '#2A2E36', roadBig: '#3A3F49',
    path: '#242832', wallR: '#4A505C', wallL: '#363B45', trunk: '#3A3128', text: '#E6E1E5',
    halo: '#14161A', street: '#8E9099', tree: ['#3F6A50', '#335A44', '#4C7A5A'], shadow: 0.26,
  },
};

type ResolvedTheme = typeof DEFAULT_THEME;
type Pal = ResolvedTheme['light'];

function mergeTheme(o?: CampusTheme): ResolvedTheme {
  if (!o) return DEFAULT_THEME;
  return {
    ...DEFAULT_THEME,
    ...o,
    status: { ...DEFAULT_THEME.status, ...(o.status || {}) },
    selOutline: { ...DEFAULT_THEME.selOutline, ...(o.selOutline || {}) },
    light: { ...DEFAULT_THEME.light, ...(o.light || {}) },
    dark: { ...DEFAULT_THEME.dark, ...(o.dark || {}) },
  } as ResolvedTheme;
}

interface LocalBuilding {
  key: string;
  label: string;
  sat: boolean;
  name: string;
  ring: Pt[];
  c: Pt;
  height: number;
  free?: number;
  total?: number;
}
interface LocalGeo {
  B: LocalBuilding[];
  roads: { g: Pt[]; n?: string; big?: 0 | 1 }[];
  paths: Pt[][];
  water: Pt[][];
  river: Pt[][];
  green: Pt[][];
  trees: Pt[];
  streets: { n: string; mid: Pt }[];
}

/* ---- geo → local metres (memoised per data) ---- */
function buildLocal(campus: CampusData, context?: CampusContext): LocalGeo {
  const feats = campus.features;
  const lat0 = feats.reduce((s, f) => s + f.properties.lat, 0) / feats.length;
  const lon0 = feats.reduce((s, f) => s + f.properties.lon, 0) / feats.length;
  const MLON = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const MLAT = 110540;
  const toM = ([lon, lat]: number[]): Pt => [(lon - lon0) * MLON, -(lat - lat0) * MLAT];
  const ringsOf = (g: CampusData['features'][number]['geometry']): number[][][] =>
    g.type === 'Polygon'
      ? [(g.coordinates as number[][][])[0]]
      : (g.coordinates as number[][][][]).map((p) => p[0]);
  const B: LocalBuilding[] = feats.map((f) => {
    const ring = ringsOf(f.geometry)[0].slice(0, -1).map(toM);
    let cx = 0;
    let cy = 0;
    ring.forEach((p) => {
      cx += p[0];
      cy += p[1];
    });
    cx /= ring.length;
    cy /= ring.length;
    const p = f.properties;
    return {
      key: p.key, label: p.label, sat: !!p.sat, name: p.name, ring, c: [cx, cy],
      height: p.height || 12, free: p.free, total: p.total,
    };
  });
  const C = context || {};
  const roads = (C.roads || []).map((r) => ({ g: r.g.map(toM), n: r.n, big: r.big }));
  const paths = (C.paths || []).map((r) => r.g.map(toM));
  const water = (C.water || []).map((r) => r.map(toM));
  const river = (C.river || []).map((r) => r.map(toM));
  const green = (C.green || []).map((r) => r.map(toM));
  const trees = (C.trees || []).map(toM);
  const best: Record<string, { L: number; mid: Pt }> = {};
  roads.forEach((r) => {
    if (!r.n) return;
    for (let i = 0; i < r.g.length - 1; i++) {
      const a = r.g[i];
      const b = r.g[i + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!best[r.n] || L > best[r.n].L) best[r.n] = { L, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
    }
  });
  const streets = Object.entries(best)
    .filter(([, v]) => v.L > 40)
    .map(([n, v]) => ({ n, mid: v.mid }));
  return { B, roads, paths, water, river, green, trees, streets };
}

interface RenderState {
  bear: number;
  ang: number;
  dark: boolean;
  sel: string | undefined;
  showLabels: boolean;
  showTrees: boolean;
  THEME: ResolvedTheme;
  avail?: Availability;
  glyphs?: BuildingGlyphs;
}

/**
 * A tiny amenity glyph (coffee cup / book) centred above a building's label, in
 * the label colour with a halo for legibility. Returns an SVG fragment string.
 */
function glyphMark(kind: BuildingGlyph, x: number, y: number, fill: string, halo: string): string {
  const body =
    kind === 'coffee'
      ? `<path d="M${x - 2.2} ${y - 1.4} h4 v1.8 a2 2 0 0 1 -4 0 z"/>` +
        `<path d="M${x + 1.8} ${y - 1} h0.9 a1 1 0 0 1 0 2 h-0.7"/>` +
        `<line x1="${x - 1.6}" y1="${y - 3}" x2="${x - 1.6}" y2="${y - 2.2}"/>` +
        `<line x1="${x + 0.2}" y1="${y - 3}" x2="${x + 0.2}" y2="${y - 2.2}"/>`
      : `<rect x="${x - 2.2}" y="${y - 1.8}" width="4.4" height="3.6" rx="0.4"/>` +
        `<line x1="${x}" y1="${y - 1.8}" x2="${x}" y2="${y + 1.8}"/>`;
  return (
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    `<g stroke="${halo}" stroke-width="1.6">${body}</g>` +
    `<g stroke="${fill}" stroke-width="0.7">${body}</g>` +
    '</g>'
  );
}

/* ---- build the SVG body + framing bounds for one camera/state ---- */
function renderBody(geo: LocalGeo, st: RenderState) {
  const { bear, ang, dark, sel, showLabels, showTrees, THEME, avail, glyphs } = st;
  const pal = (dark ? THEME.dark : THEME.light) as Pal;
  const COSA = Math.cos(ang);
  const SINA = Math.sin(ang);
  const cb = Math.cos(bear);
  const sb = Math.sin(bear);
  const rot = ([x, y]: number[]): Pt => [x * cb - y * sb, x * sb + y * cb];
  const proj = ([x, y]: number[], h?: number): Pt => [(x - y) * COSA, (x + y) * SINA - (h || 0)];
  const P = ([x, y]: number[]): string => x.toFixed(1) + ',' + y.toFixed(1);
  const polyPts = (pts: Pt[], h?: number): string => pts.map((p) => P(proj(rot(p), h))).join(' ');
  const STOPS: [number, number[]][] = THEME.ramp.map((c, i) => [THEME.rampStops[i], hex(c)]);
  const ramp = (r: number): number[] => {
    for (let i = 1; i < STOPS.length; i++) {
      if (r <= STOPS[i][0]) {
        const a = STOPS[i - 1];
        const b = STOPS[i];
        return mix(a[1], b[1], (r - a[0]) / (b[0] - a[0]));
      }
    }
    return STOPS[STOPS.length - 1][1];
  };
  const stoneR = hex(pal.wallR);
  const stoneL = hex(pal.wallL);
  const avFor = (b: LocalBuilding): { ratio: number } => {
    const o = avail && avail[b.key];
    const free = o ? o.free : b.free;
    const total = o ? o.total : b.total;
    const f = free == null ? 0 : free;
    const t = total == null ? 0 : total;
    return { ratio: t ? f / t : 0 };
  };

  function prism(b: LocalBuilding): string {
    const poly = b.ring.map(rot);
    const h = b.height;
    const n = poly.length;
    const area = signedArea(poly);
    let cx = 0;
    let cy = 0;
    poly.forEach((p) => {
      cx += p[0];
      cy += p[1];
    });
    cx /= n;
    cy /= n;
    const rc = ramp(avFor(b).ratio);
    const rim = mix(rc, [255, 255, 255], 0.4);
    let s =
      '<polygon points="' +
      poly.map((p) => P(proj(p, 0))).join(' ') +
      '" fill="rgba(0,0,0,' +
      pal.shadow +
      ')" transform="translate(2,3.5)"/>';
    const walls: { d: number; s: string }[] = [];
    for (let i = 0; i < n; i++) {
      const A = poly[i];
      const Cp = poly[(i + 1) % n];
      const ed = [Cp[0] - A[0], Cp[1] - A[1]];
      // Ring winding gives the true outward normal even for concave footprints.
      // A centroid direction is ambiguous for ITC²'s inset courtyard walls.
      const nm = area < 0 ? [-ed[1], ed[0]] : [ed[1], -ed[0]];
      const mid = [(A[0] + Cp[0]) / 2, (A[1] + Cp[1]) / 2];
      if (nm[0] + nm[1] <= 0) continue;
      const L = Math.hypot(nm[0], nm[1]) || 1;
      const t = Math.abs(nm[0] / L) / (Math.abs(nm[0] / L) + Math.abs(nm[1] / L) + 1e-6);
      const q = [proj(A, 0), proj(Cp, 0), proj(Cp, h), proj(A, h)];
      walls.push({
        d: mid[0] + mid[1],
        s:
          '<polygon data-wall-edge="' +
          i +
          '" points="' +
          q.map(P).join(' ') +
          '" fill="' +
          rgb(mix(stoneL, stoneR, t)) +
          '" stroke="rgba(0,0,0,.14)" stroke-width="0.4"/>',
      });
    }
    walls.sort((a, b2) => a.d - b2.d);
    const roof = poly.map((p) => P(proj(p, h))).join(' ');
    const isSel = b.key === sel;
    let lbl = '';
    if (showLabels) {
      const lp = proj([cx, cy], h);
      lbl =
        '<text x="' +
        lp[0].toFixed(1) +
        '" y="' +
        (lp[1] + 2.6).toFixed(1) +
        '" text-anchor="middle" font-family="Roboto, system-ui, sans-serif" font-weight="700" font-size="' +
        (b.label.length > 2 ? 5 : 7.5) +
        '" fill="' +
        pal.text +
        '" stroke="' +
        pal.halo +
        '" stroke-width="1.5" paint-order="stroke">' +
        b.label +
        '</text>';
      const glyph = glyphs && glyphs[b.key];
      if (glyph) lbl += glyphMark(glyph, lp[0], lp[1] - 6, pal.text, pal.halo);
    }
    return (
      '<g class="cm-bld" data-id="' +
      b.key +
      '">' +
      s +
      walls.map((w) => w.s).join('') +
      '<polygon points="' +
      roof +
      '" fill="' +
      rgb(rc) +
      '" stroke="' +
      rgb(rim) +
      '" stroke-width="0.9" stroke-linejoin="round"/>' +
      (isSel
        ? '<polygon points="' +
          roof +
          '" fill="none" stroke="' +
          (dark ? THEME.selOutline.dark : THEME.selOutline.light) +
          '" stroke-width="1.8" stroke-linejoin="round"/>'
        : '') +
      lbl +
      '</g>'
    );
  }
  function tree(loc: Pt, index: number): string {
    const b = proj(loc, 0);
    const t = proj(loc, 5);
    return (
      '<g class="cm-tree" data-tree-index="' +
      index +
      '"><ellipse cx="' +
      b[0].toFixed(1) +
      '" cy="' +
      b[1].toFixed(1) +
      '" rx="2.6" ry="1.2" fill="rgba(0,0,0,' +
      pal.shadow +
      ')"/>' +
      '<line x1="' +
      b[0].toFixed(1) +
      '" y1="' +
      b[1].toFixed(1) +
      '" x2="' +
      t[0].toFixed(1) +
      '" y2="' +
      t[1].toFixed(1) +
      '" stroke="' +
      pal.trunk +
      '" stroke-width="0.9"/>' +
      '<circle cx="' +
      t[0].toFixed(1) +
      '" cy="' +
      t[1].toFixed(1) +
      '" r="3" fill="' +
      pal.tree[0] +
      '"/><circle cx="' +
      (t[0] - 1.3).toFixed(1) +
      '" cy="' +
      (t[1] + 0.7).toFixed(1) +
      '" r="2.1" fill="' +
      pal.tree[1] +
      '"/><circle cx="' +
      (t[0] + 1.3).toFixed(1) +
      '" cy="' +
      (t[1] - 0.4).toFixed(1) +
      '" r="2.1" fill="' +
      pal.tree[2] +
      '"/></g>'
    );
  }

  // ground extent
  let gx0 = 1e9;
  let gy0 = 1e9;
  let gx1 = -1e9;
  let gy1 = -1e9;
  const ext = (p: Pt): void => {
    const q = proj(rot(p), 0);
    if (q[0] < gx0) gx0 = q[0];
    if (q[0] > gx1) gx1 = q[0];
    if (q[1] < gy0) gy0 = q[1];
    if (q[1] > gy1) gy1 = q[1];
  };
  geo.green.forEach((r) => r.forEach(ext));
  geo.water.forEach((r) => r.forEach(ext));
  geo.B.forEach((b) => b.ring.forEach(ext));
  geo.roads.forEach((r) => r.g.forEach(ext));
  const gp = 60;
  const ground =
    '<rect x="' +
    (gx0 - gp).toFixed(1) +
    '" y="' +
    (gy0 - gp).toFixed(1) +
    '" width="' +
    (gx1 - gx0 + 2 * gp).toFixed(1) +
    '" height="' +
    (gy1 - gy0 + 2 * gp).toFixed(1) +
    '" fill="' +
    pal.ground +
    '"/>';
  const green = geo.green
    .map((r) => '<polygon points="' + polyPts(r, 0) + '" fill="' + pal.green + '"/>')
    .join('');
  const water =
    geo.water.map((r) => '<polygon points="' + polyPts(r, 0) + '" fill="' + pal.water + '"/>').join('') +
    geo.river
      .map(
        (r) =>
          '<polyline points="' +
          polyPts(r, 0) +
          '" fill="none" stroke="' +
          pal.water +
          '" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>',
      )
      .join('');
  const paths = geo.paths
    .map(
      (r) =>
        '<polyline points="' +
        polyPts(r, 0) +
        '" fill="none" stroke="' +
        pal.path +
        '" stroke-width="1.4" stroke-linecap="round"/>',
    )
    .join('');
  const roads = geo.roads
    .map(
      (r) =>
        '<polyline points="' +
        polyPts(r.g, 0) +
        '" fill="none" stroke="' +
        (r.big ? pal.roadBig : pal.road) +
        '" stroke-width="' +
        (r.big ? 5 : 3) +
        '" stroke-linecap="round" stroke-linejoin="round"/>',
    )
    .join('');

  const items: { d: number; s: string; key?: string }[] = [];
  if (showTrees)
    geo.trees.forEach((loc, index) => {
      const rl = rot(loc);
      items.push({ d: rl[0] + rl[1], s: tree(rl, index) });
    });
  geo.B.forEach((b) => {
    const rc = rot(b.c);
    items.push({ d: rc[0] + rc[1], s: prism(b), key: b.key });
  });
  items.sort((a, b) => a.d - b.d);
  BUILDING_DRAW_ORDER.forEach(([behind, inFront]) => {
    const behindIndex = items.findIndex((item) => item.key === behind);
    const inFrontIndex = items.findIndex((item) => item.key === inFront);
    if (behindIndex < 0 || inFrontIndex < 0 || behindIndex < inFrontIndex) return;

    const [item] = items.splice(behindIndex, 1);
    const targetIndex = items.findIndex((candidate) => candidate.key === inFront);
    items.splice(targetIndex, 0, item);
  });

  let labels = '';
  if (showLabels) {
    labels = geo.streets
      .map((s) => {
        const p = proj(rot(s.mid), 0);
        return (
          '<text x="' +
          p[0].toFixed(1) +
          '" y="' +
          p[1].toFixed(1) +
          '" text-anchor="middle" font-family="Roboto, system-ui, sans-serif" font-weight="500" font-size="4.4" fill="' +
          pal.street +
          '" stroke="' +
          pal.halo +
          '" stroke-width="1" paint-order="stroke" opacity="0.9">' +
          s.n +
          '</text>'
        );
      })
      .join('');
    if (geo.river[0]) {
      const m = geo.river[0][Math.floor(geo.river[0].length / 2)];
      const p = proj(rot(m), 0);
      labels +=
        '<text x="' +
        p[0].toFixed(1) +
        '" y="' +
        p[1].toFixed(1) +
        '" text-anchor="middle" font-family="Roboto, system-ui, sans-serif" font-weight="600" font-size="6" letter-spacing="2" fill="' +
        THEME.donau +
        '" stroke="' +
        pal.halo +
        '" stroke-width="1.1" paint-order="stroke">DONAU</text>';
    }
  }

  // framing bounds: riverside core, OR include the selected satellite
  const focus = geo.B.filter((b) => !b.sat || b.key === sel);
  const xs: number[] = [];
  const ys: number[] = [];
  focus.forEach((b) =>
    b.ring.forEach((p) => {
      const q = proj(rot(p), b.height);
      xs.push(q[0]);
      ys.push(q[1]);
      const q0 = proj(rot(p), 0);
      xs.push(q0[0]);
      ys.push(q0[1]);
    }),
  );
  const pad = 46;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const bb = { minX, minY, w: Math.max(...xs) - minX + pad, h: Math.max(...ys) - minY + pad };
  return {
    html: ground + green + water + paths + roads + items.map((i) => i.s).join('') + labels,
    bb,
  };
}

interface Camera {
  zoom: number;
  panx: number;
  pany: number;
  bb: { minX: number; minY: number; w: number; h: number } | null;
  moved: boolean;
}

/**
 * CampusMap — the reusable 2.5D campus map. See types.ts for prop documentation.
 * A self-contained SVG map: real OpenStreetMap footprints extruded and tinted by
 * room availability, with streets, water, parks and trees. No tiles, no WebGL,
 * no API key. Tap a building to select it.
 */
export function CampusMap({
  campus,
  context,
  availability,
  mode = 'auto',
  theme,
  bearing = -22,
  tilt = 34,
  selectedKey,
  onSelect,
  interactive = true,
  showLabels = true,
  showTrees = true,
  glyphs,
  style = {},
}: CampusMapProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const camRef = React.useRef<Camera>({ zoom: 1, panx: 0, pany: 0, bb: null, moved: false });
  const prefersDark =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const [dark, setDark] = React.useState(mode === 'dark' ? true : mode === 'light' ? false : prefersDark);
  const [bear] = React.useState((bearing * Math.PI) / 180);
  const [ang] = React.useState((tilt * Math.PI) / 180);
  const [selInternal, setSelInternal] = React.useState<string | undefined>(
    () => selectedKey || (campus.features[0] && campus.features[0].properties.key),
  );
  const sel = selectedKey !== undefined ? selectedKey : selInternal;

  const THEME = React.useMemo(() => mergeTheme(theme), [theme]);
  const geo = React.useMemo(() => buildLocal(campus, context), [campus, context]);

  React.useEffect(() => {
    if (mode === 'auto') return;
    setDark(mode === 'dark');
  }, [mode]);
  React.useEffect(() => {
    if (mode !== 'auto' || typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = (e: MediaQueryListEvent): void => setDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [mode]);

  const applyVB = React.useCallback(() => {
    const svg = svgRef.current;
    const c = camRef.current;
    if (!svg || !c.bb) return;
    const cx = c.bb.minX + c.bb.w / 2 - c.panx;
    const cy = c.bb.minY + c.bb.h / 2 - c.pany;
    const w = c.bb.w / c.zoom;
    const h = c.bb.h / c.zoom;
    svg.setAttribute(
      'viewBox',
      (cx - w / 2).toFixed(1) + ' ' + (cy - h / 2).toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1),
    );
  }, []);

  // reproject + paint when geometry/camera/theme/state change
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const { html, bb } = renderBody(geo, {
      bear, ang, dark, sel, showLabels, showTrees, THEME, avail: availability, glyphs,
    });
    svg.innerHTML = html;
    camRef.current.bb = bb;
    applyVB();
  }, [geo, bear, ang, dark, sel, showLabels, showTrees, THEME, availability, glyphs, applyVB]);

  // selection reframes when a satellite is picked
  const pick = React.useCallback(
    (k: string) => {
      const wasSat = geo.B.find((b) => b.key === sel)?.sat;
      const willSat = geo.B.find((b) => b.key === k)?.sat;
      if (wasSat || willSat) {
        camRef.current.panx = 0;
        camRef.current.pany = 0;
      }
      if (selectedKey === undefined) setSelInternal(k);
      if (onSelect) onSelect(k);
    },
    [geo, sel, selectedKey, onSelect],
  );

  // interaction: building selection, one-finger drag-pan, two-finger pinch-zoom,
  // wheel-zoom — viewBox only, no reproject. Pointer capture keeps the gesture
  // alive when a finger drifts off the map; touchAction:none blocks the browser's
  // native pan/zoom so the map handles it directly (fixes janky mobile zoom).
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; px: number; py: number } | null = null;
    let pinch: { dist: number; zoom: number } | null = null;
    // Resolve the tapped building at pointer-down: once we setPointerCapture, a
    // mouse `click` retargets to the whole SVG, so it can't be used to hit-test
    // (touch is unaffected — which is why tapping worked but clicking didn't).
    let tapId: string | null = null;

    const pinchDist = (): number => {
      const p = [...pointers.values()];
      return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    };
    const startDrag = (x: number, y: number): void => {
      drag = { x, y, px: camRef.current.panx, py: camRef.current.pany };
    };
    const down = (e: PointerEvent): void => {
      if (!interactive) return;
      e.preventDefault();
      if (pointers.size === 0 && e.button === 0) {
        const target = e.target as Element;
        const building = target.closest?.('[data-id]') as HTMLElement | null;
        tapId = building?.dataset.id ?? null;
      } else {
        tapId = null;
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      camRef.current.moved = false;
      if (pointers.size === 1) {
        startDrag(e.clientX, e.clientY);
      } else if (pointers.size === 2) {
        drag = null;
        pinch = { dist: pinchDist(), zoom: camRef.current.zoom };
      }
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
      svg.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent): void => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2 && pinch) {
        const d = pinchDist();
        if (pinch.dist > 0) {
          camRef.current.zoom = Math.min(7, Math.max(0.5, pinch.zoom * (d / pinch.dist)));
          applyVB();
        }
        camRef.current.moved = true;
        return;
      }
      if (drag) {
        const vb = svg.viewBox.baseVal;
        const sc = vb.width / svg.clientWidth;
        if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) camRef.current.moved = true;
        camRef.current.panx = drag.px + (e.clientX - drag.x) * sc;
        camRef.current.pany = drag.py + (e.clientY - drag.y) * sc;
        applyVB();
      }
    };
    const end = (e: PointerEvent): void => {
      const tappedBuilding = e.type === 'pointerup' && !camRef.current.moved ? tapId : null;
      pointers.delete(e.pointerId);
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
        /* nothing captured */
      }
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        startDrag(p.x, p.y); // hand control to the remaining finger without a jump
      } else if (pointers.size === 0) {
        drag = null;
        svg.style.cursor = interactive ? 'grab' : 'default';
      }
      tapId = null;
      if (tappedBuilding) pick(tappedBuilding);
    };
    const wheel = (e: WheelEvent): void => {
      if (!interactive) return;
      e.preventDefault();
      const c = camRef.current;
      c.zoom = Math.min(7, Math.max(0.5, c.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
      applyVB();
    };
    svg.addEventListener('pointerdown', down);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', wheel, { passive: false });
    svg.style.cursor = interactive ? 'grab' : 'default';
    return () => {
      svg.removeEventListener('pointerdown', down);
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', end);
      svg.removeEventListener('pointercancel', end);
      svg.removeEventListener('wheel', wheel);
    };
  }, [interactive, applyVB, pick]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: (dark ? THEME.dark : THEME.light).ground,
        overflow: 'hidden',
        ...style,
      }}
    >
      <svg
        ref={svgRef}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        aria-label="THD campus 2.5D map"
      />
    </div>
  );
}
