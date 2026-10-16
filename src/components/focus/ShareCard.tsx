import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { addDays, dayKey, focusLevel, sundayOf, parseDay } from './FocusGraph';
import type { FocusDay } from './FocusGraph';
import { isCampusClosedDay } from '../../domain/openingHours';

/**
 * The focus graph as an image (D4): drawn with Canvas 2D, so the same picture
 * serves the share sheet preview, Save Image and the link preview. Square
 * 1080 × 1080 is the card; wide 1200 × 630 is the og:image candidate until the
 * preview-shape test settles it (ADR 0003). The grid is the current semester:
 * first week on the left, days still to come as outlined slots, today outlined
 * in on-surface. Colours are read from the tokens at draw time for the given
 * theme and graph colour, so the canvas carries no hex of its own. Flat: no
 * gradients, shadows or photos; about 90 KB.
 */
export type ShareCardFormat = 'square' | 'wide';

export interface ShareCardFigure {
  /** "21" */
  num: string;
  /** "h", "Std.", "min" or empty. */
  unit: string;
  /** "this semester", "day streak". */
  label: string;
}

export interface ShareCardOptions {
  format?: ShareCardFormat;
  days: FocusDay[];
  /** Local date, YYYY-MM-DD. */
  today: string;
  /** First day of the semester, YYYY-MM-DD; its week is the first column. */
  semesterStart: string;
  /** Last day of the semester, YYYY-MM-DD. */
  semesterEnd: string;
  /** Exactly two: hours this semester, then the streak. */
  figures: ShareCardFigure[];
  /** Opt-in line above the figures, "Lena · AIN 7". */
  who?: string;
  /** Jan … Dec, short, in the card's language. */
  months: string[];
  theme: 'light' | 'dark';
  /** Graph colour; violet when omitted. */
  accent?: 'violet' | 'orchid' | 'graphite';
  /** App icon drawn in the footer. */
  iconSrc?: string;
  /** Footer text on the right. */
  url?: string;
}

const FMT = {
  square: { w: 1080, h: 1080, pad: 64, num: 156, unit: 56, lab: 42, month: 38, foot: 38, gap: 6 },
  wide: { w: 1200, h: 630, pad: 56, num: 104, unit: 40, lab: 32, month: 28, foot: 30, gap: 5 },
} as const;

interface Palette {
  surface: string;
  on: string;
  onVar: string;
  ramp: string[];
  closed: string;
  sans: string;
}

function readPalette(theme: 'light' | 'dark', accent: string): Palette {
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', theme);
  if (accent !== 'violet') probe.setAttribute('data-accent', accent);
  probe.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden';
  const dot = document.createElement('i');
  probe.appendChild(dot);
  document.body.appendChild(probe);
  const col = (v: string) => {
    dot.style.backgroundColor = `var(${v})`;
    return getComputedStyle(dot).backgroundColor;
  };
  const p = {
    surface: col('--md-surface'),
    on: col('--md-on-surface'),
    onVar: col('--md-on-surface-variant'),
    ramp: [0, 1, 2, 3, 4].map((i) => col(`--md-graph-${i}`)),
    closed: col('--md-graph-closed'),
    sans: getComputedStyle(probe).getPropertyValue('--font-sans').trim() || 'Roboto, sans-serif',
  };
  probe.remove();
  return p;
}

function loadImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function fontsReady(sans: string) {
  try {
    await document.fonts.ready;
    await Promise.all([300, 400, 500].map((w) => document.fonts.load(`${w} 40px ${sans}`)));
  } catch {
    /* draw with the fallback font */
  }
}

function roundRect(x: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, r: number) {
  x.beginPath();
  if (x.roundRect) x.roundRect(X, Y, W, H, r);
  else x.rect(X, Y, W, H);
}

/** Number of week columns from the semester's first Sunday through its end. */
export function semesterWeeks(semesterStart: string, semesterEnd: string): number {
  const first = sundayOf(parseDay(semesterStart));
  const last = sundayOf(parseDay(semesterEnd));
  return Math.round((last.getTime() - first.getTime()) / (7 * 86400000)) + 1;
}

/** Draws the card and resolves to a PNG blob. */
export async function renderShareCard(o: ShareCardOptions): Promise<Blob> {
  const F = FMT[o.format ?? 'square'];
  const C = readPalette(o.theme, o.accent ?? 'violet');
  await fontsReady(C.sans);
  const logo = await loadImage(o.iconSrc);

  const minutes = new Map<string, number>();
  for (const d of o.days) minutes.set(d.date, (minutes.get(d.date) ?? 0) + d.minutes);
  const first = sundayOf(parseDay(o.semesterStart));
  const weeks = semesterWeeks(o.semesterStart, o.semesterEnd);
  const today = parseDay(o.today);

  const inner = F.w - 2 * F.pad;
  const y0 = F.pad + (o.who ? F.lab * 1.9 : 0);
  const base = y0 + F.num * 0.72;
  const figEnd = base + F.lab * 1.75;
  const footY = F.h - F.pad;
  const gBot = footY - F.foot * 1.2 - F.pad * 0.6;
  const monH = F.month * 1.4;
  const top = figEnd + F.pad * 0.5;
  const pitch = Math.min((inner + F.gap) / weeks, (gBot - top - monH + F.gap) / 7);
  const cell = pitch - F.gap;
  const gTop = top + monH + Math.max(0, (gBot - top - monH - (7 * pitch - F.gap)) / 2);

  const cv = document.createElement('canvas');
  cv.width = F.w;
  cv.height = F.h;
  const x = cv.getContext('2d');
  if (!x) throw new Error('Canvas 2D is not available');
  const font = (w: number, px: number) => `${w} ${px}px ${C.sans}`;
  x.fillStyle = C.surface;
  x.fillRect(0, 0, F.w, F.h);
  x.textBaseline = 'alphabetic';

  if (o.who) {
    let px: number = F.lab;
    x.font = font(500, px);
    while (x.measureText(o.who).width > inner && px > F.lab * 0.75) x.font = font(500, --px);
    let t = o.who;
    while (x.measureText(`${t}…`).width > inner && t.length > 1) t = t.slice(0, -1);
    x.fillStyle = C.on;
    x.fillText(t === o.who ? o.who : `${t}…`, F.pad, F.pad + F.lab * 0.8);
  }

  let fx: number = F.pad;
  for (const f of o.figures) {
    x.fillStyle = C.on;
    x.font = font(300, F.num);
    x.fillText(f.num, fx, base);
    let w = x.measureText(f.num).width;
    if (f.unit) {
      x.font = font(400, F.unit);
      x.fillText(f.unit, fx + w + F.unit * 0.25, base);
      w += F.unit * 0.25 + x.measureText(f.unit).width;
    }
    x.font = font(400, F.lab);
    x.fillStyle = C.onVar;
    x.fillText(f.label, fx, base + F.lab * 1.45);
    w = Math.max(w, x.measureText(f.label).width);
    fx += w + F.pad;
  }

  x.font = font(400, F.month);
  x.fillStyle = C.onVar;
  for (let w = 0; w < weeks; w++) {
    const m = addDays(first, w * 7 + 3).getMonth();
    if (w === 0 || m !== addDays(first, (w - 1) * 7 + 3).getMonth()) {
      x.fillText(o.months[m], F.pad + w * pitch, gTop - F.month * 0.5);
    }
  }

  const r = Math.max(2, cell * 0.16);
  const lw = Math.max(2, cell * 0.08);
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const X = F.pad + w * pitch;
      const Y = gTop + d * pitch;
      if (date > today) {
        x.strokeStyle = C.ramp[0];
        x.lineWidth = lw;
        roundRect(x, X + lw / 2, Y + lw / 2, cell - lw, cell - lw, r);
        x.stroke();
        continue;
      }
      x.fillStyle = isCampusClosedDay(date) ? C.closed : C.ramp[focusLevel(minutes.get(dayKey(date)) ?? 0)];
      roundRect(x, X, Y, cell, cell, r);
      x.fill();
      if (dayKey(date) === o.today) {
        const tw = Math.max(2, cell * 0.07);
        const off = tw * 0.5 + 1;
        x.strokeStyle = C.on;
        x.lineWidth = tw;
        roundRect(x, X - off, Y - off, cell + off * 2, cell + off * 2, r + off);
        x.stroke();
      }
    }
  }

  const L = F.foot * 1.4;
  const mid = footY - F.foot * 0.36;
  if (logo) x.drawImage(logo, F.pad, mid - L / 2, L, L);
  x.fillStyle = C.on;
  x.font = font(500, F.foot);
  x.fillText('THD Room Finder', F.pad + (logo ? L + F.foot * 0.4 : 0), footY);
  if (o.url) {
    x.fillStyle = C.onVar;
    x.font = font(400, F.foot * 0.92);
    x.textAlign = 'right';
    x.fillText(o.url, F.w - F.pad, footY);
    x.textAlign = 'left';
  }

  return new Promise((resolve, reject) =>
    cv.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
  );
}

export interface ShareCardProps extends ShareCardOptions {
  /** Describes the card, e.g. "Focus graph image: 21 hours this semester, …". */
  alt: string;
  style?: CSSProperties;
}

/** The card as an <img>, redrawn whenever an option changes (share sheet preview). */
export function ShareCard({ alt, style = {}, ...options }: ShareCardProps) {
  const [src, setSrc] = useState<string | null>(null);
  const key = JSON.stringify(options);
  useEffect(() => {
    let url: string | null = null;
    let live = true;
    renderShareCard(JSON.parse(key) as ShareCardOptions)
      .then((blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key]);
  const F = FMT[options.format ?? 'square'];
  return (
    <div
      style={{
        aspectRatio: `${F.w} / ${F.h}`,
        width: '100%',
        borderRadius: 'var(--radius-m)',
        overflow: 'hidden',
        background: 'var(--md-surface-variant)',
        boxShadow: 'var(--md-shadow-1)',
        ...style,
      }}
    >
      {src && <img src={src} alt={alt} width={F.w} height={F.h} style={{ display: 'block', width: '100%', height: 'auto' }} />}
    </div>
  );
}
