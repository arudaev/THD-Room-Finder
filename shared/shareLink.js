// Focus graph share links (ADR 0003): the link carries one snapshot of the
// semester graph, so the server that draws its preview stores nothing.
// Plain ESM shared by the app (src/) and the Vercel functions (api/).
//
// Layout, version 1, base64url:
//   0      version (1)
//   1      flags: bit 0 dark, bits 1-2 accent, bit 3 German,
//          bit 4 has name, bit 5 has batch
//   2-3    grid start (Sunday; older links may start Monday) as days since 2020-01-01
//   4      weeks in the grid (1-40)
//   5      today, as a day index into the grid (0 … weeks*7-1)
//   6-8    focus minutes this semester (capped)
//   9-10   streak in days (capped)
//   11…    one 3-bit level (0-4) per day from the grid start to today
//   …      name, then batch: one length byte + UTF-8, each opt-in

export const SHARE_VERSION = 1;
/** Longest payload accepted, in characters; a full one is about 140. */
export const MAX_PAYLOAD = 400;
export const ACCENTS = ['violet', 'orchid', 'graphite'];

const EPOCH = Date.UTC(2020, 0, 1);
const DAY = 86400000;
const MAX_TEXT = 40;
const MAX_WEEKS = 40;

function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY);
}

function isoOf(n) {
  return new Date(EPOCH + n * DAY).toISOString().slice(0, 10);
}

function toBase64Url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function clip(text) {
  const bytes = new TextEncoder().encode(String(text).trim().slice(0, MAX_TEXT));
  return bytes.slice(0, MAX_TEXT);
}

/**
 * @param {import('./shareLink').ShareSnapshot} s
 * @returns {string} the payload for /f/<payload>
 */
export function encodeShare(s) {
  const weeks = Math.min(Math.max(1, Math.round(s.weeks)), MAX_WEEKS);
  const today = Math.min(Math.max(0, Math.round(s.today)), weeks * 7 - 1);
  const name = s.name ? clip(s.name) : null;
  const batch = s.batch ? clip(s.batch) : null;
  const accent = Math.max(0, ACCENTS.indexOf(s.accent ?? 'violet'));
  const flags =
    (s.dark ? 1 : 0) | (accent << 1) | (s.lang === 'de' ? 8 : 0) | (name?.length ? 16 : 0) | (batch?.length ? 32 : 0);
  const start = dayNumber(s.start);
  const minutes = Math.min(Math.max(0, Math.round(s.minutes)), 0xffffff);
  const streak = Math.min(Math.max(0, Math.round(s.streak)), 0xffff);

  const days = today + 1;
  const packed = new Uint8Array(Math.ceil((days * 3) / 8));
  for (let i = 0; i < days; i++) {
    const level = Math.min(Math.max(0, s.levels[i] ?? 0), 4);
    for (let b = 0; b < 3; b++) if (level & (1 << b)) packed[(i * 3 + b) >> 3] |= 1 << ((i * 3 + b) & 7);
  }

  const out = [SHARE_VERSION, flags, start >> 8, start & 255, weeks, today, minutes >> 16, (minutes >> 8) & 255, minutes & 255, streak >> 8, streak & 255, ...packed];
  if (name?.length) out.push(name.length, ...name);
  if (batch?.length) out.push(batch.length, ...batch);
  return toBase64Url(out);
}

/**
 * Reads a payload; returns null for anything malformed, never throws.
 * @param {string} payload
 * @returns {import('./shareLink').ShareSnapshot | null}
 */
export function decodeShare(payload) {
  if (typeof payload !== 'string' || payload.length < 15 || payload.length > MAX_PAYLOAD) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  let b;
  try {
    b = fromBase64Url(payload);
  } catch {
    return null;
  }
  if (b.length < 11 || b[0] !== SHARE_VERSION) return null;
  const flags = b[1];
  const weeks = b[4];
  const today = b[5];
  if (weeks < 1 || weeks > MAX_WEEKS || today >= weeks * 7 || (flags >> 1 & 3) > 2) return null;

  const days = today + 1;
  let at = 11 + Math.ceil((days * 3) / 8);
  if (b.length < at) return null;
  const levels = [];
  for (let i = 0; i < days; i++) {
    let level = 0;
    for (let k = 0; k < 3; k++) if (b[11 + ((i * 3 + k) >> 3)] & (1 << ((i * 3 + k) & 7))) level |= 1 << k;
    levels.push(Math.min(level, 4));
  }

  const text = () => {
    const n = b[at];
    if (!n || n > MAX_TEXT || at + 1 + n > b.length) return undefined;
    const value = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(at + 1, at + 1 + n)).trim();
    at += 1 + n;
    return value || undefined;
  };
  const name = flags & 16 ? text() : undefined;
  const batch = flags & 32 ? text() : undefined;

  return {
    dark: Boolean(flags & 1),
    accent: ACCENTS[(flags >> 1) & 3],
    lang: flags & 8 ? 'de' : 'en',
    start: isoOf((b[2] << 8) | b[3]),
    weeks,
    today,
    minutes: (b[6] << 16) | (b[7] << 8) | b[8],
    streak: (b[9] << 8) | b[10],
    levels,
    name,
    batch,
  };
}

/** "21 h" / "21 Std." / "45 min", as the app words it. */
export function hoursText(minutes, lang) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.round(minutes / 60);
  return lang === 'de' ? `${h} Std.` : `${h} h`;
}
