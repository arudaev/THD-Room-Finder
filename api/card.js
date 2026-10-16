import { ImageResponse } from '@vercel/og';
import { decodeShare, hoursText } from '../shared/shareLink.js';

// GET /api/card?p=<payload> — the og:image of a focus graph share link
// (ADR 0003). Draws the semester grid and figures from the payload alone:
// nothing is read or stored, so the same payload always gives the same PNG
// and the CDN may keep it forever. Colours mirror src/styles/tokens/colors.css.

const SURFACE = {
  light: { bg: '#FDFCFF', on: '#1C1B1F', onVar: '#44464F', empty: '#EFEEF5', slot: '#E3E1EC', closed: '#C4C6D0', brand: '#1565C0' },
  dark: { bg: '#1C1B1F', on: '#E6E1E5', onVar: '#C4C6D0', empty: '#2B2930', slot: '#36343B', closed: '#44464F', brand: '#A8C8FF' },
};
const RAMP = {
  light: {
    violet: ['#D8CCF6', '#AE95E8', '#7E5BCC', '#4A2A91'],
    orchid: ['#F1CBE7', '#DE92CB', '#B24FA0', '#7E1F6E'],
    graphite: ['#D6D7DC', '#A3A5AE', '#6C6E78', '#303239'],
  },
  dark: {
    violet: ['#3D2D6E', '#5B3FAD', '#9479E6', '#D3C2FF'],
    orchid: ['#4F2346', '#7B3A70', '#BE68AE', '#F3BCE6'],
    graphite: ['#3F4047', '#5D5F68', '#9799A3', '#E2E3E8'],
  },
};
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
};

const W = 1200;
const H = 630;

/** Satori element: h('div', style, ...children). */
const h = (type, style, ...children) => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c !== null && c !== undefined && c !== false) },
});

export function cardTree(s, origin) {
  const C = SURFACE[s.dark ? 'dark' : 'light'];
  const ramp = RAMP[s.dark ? 'dark' : 'light'][s.accent];
  const de = s.lang === 'de';
  const who = [s.name, s.batch].filter(Boolean).join(' · ');
  const hours = hoursText(s.minutes, s.lang);
  const [num, unit] = hours.split(' ');

  // Grid: one column per week, Sunday at the top for new links; days after today are slots.
  const gridW = 680;
  const pitch = Math.min(Math.floor(gridW / s.weeks), 34);
  const cell = pitch - Math.max(3, Math.round(pitch * 0.16));
  const start = new Date(`${s.start}T00:00:00Z`);
  const columns = [];
  for (let w = 0; w < s.weeks; w++) {
    const weekStart = new Date(start.getTime() + w * 7 * 86400000);
    const prev = new Date(weekStart.getTime() - 7 * 86400000);
    // As the in-app graph: a new month gets a label; the first column only
    // when its month lasts two more weeks, so the labels never collide.
    const ahead = (n) => new Date(weekStart.getTime() + n * 7 * 86400000).getUTCMonth() === weekStart.getUTCMonth();
    const shows = w === 0 ? ahead(1) && ahead(2) : weekStart.getUTCMonth() !== prev.getUTCMonth();
    const label = shows ? MONTHS[s.lang][weekStart.getUTCMonth()] : '';
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const i = w * 7 + d;
      const future = i > s.today;
      const level = future ? 0 : s.levels[i] ?? 0;
      // Calendar dates use UTC here; browser/domain dates use local calendar days.
      // Repository classroom schedules currently close only on weekends.
      const weekday = new Date(start.getTime() + i * 86400000).getUTCDay();
      const closed = weekday === 0 || weekday === 6;
      cells.push(
        h('div', {
          width: cell,
          height: cell,
          marginBottom: pitch - cell,
          borderRadius: Math.max(3, Math.round(cell * 0.18)),
          background: future ? 'transparent' : closed ? C.closed : level ? ramp[level - 1] : C.empty,
          border: future ? `2px solid ${C.slot}` : i === s.today ? `3px solid ${C.on}` : 'none',
        }),
      );
    }
    columns.push(
      h(
        'div',
        { flexDirection: 'column', width: pitch, position: 'relative' },
        h('div', { height: 30, fontSize: 20, color: C.onVar, whiteSpace: 'nowrap', overflow: 'visible' }, label),
        ...cells,
      ),
    );
  }

  return h(
    'div',
    { width: W, height: H, background: C.bg, color: C.on, flexDirection: 'column', padding: '48px 56px', fontFamily: 'Noto Sans' },
    // Header: the app, the way the link preview advertises it.
    h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between' },
      h(
        'div',
        { alignItems: 'center' },
        { type: 'img', props: { src: `${origin}/icons/app-icon-192.png`, width: 52, height: 52, style: { borderRadius: 12 } } },
        h('div', { marginLeft: 16, fontSize: 30, fontWeight: 600, color: C.brand }, 'THD Room Finder'),
      ),
      h('div', { fontSize: 22, color: C.onVar }, de ? 'Freien Raum finden · fokussieren' : 'Find a free room · focus in it'),
    ),
    // Body: figures on the left, the semester on the right.
    h(
      'div',
      { flex: 1, alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
      h(
        'div',
        { flexDirection: 'column', width: 380 },
        who ? h('div', { fontSize: 30, fontWeight: 600, marginBottom: 18, color: C.on }, who) : null,
        h(
          'div',
          { alignItems: 'baseline' },
          h('div', { fontSize: 120, fontWeight: 300, lineHeight: 1 }, num),
          unit ? h('div', { fontSize: 44, marginLeft: 10, color: C.onVar }, unit) : null,
        ),
        h('div', { fontSize: 28, color: C.onVar, marginTop: 6 }, de ? 'in diesem Semester' : 'this semester'),
        h(
          'div',
          { alignItems: 'baseline', marginTop: 26 },
          h('div', { fontSize: 56, fontWeight: 300, lineHeight: 1 }, String(s.streak)),
          h('div', { fontSize: 28, color: C.onVar, marginLeft: 12 }, de ? 'Tage in Folge' : 'day streak'),
        ),
      ),
      h('div', { width: gridW, justifyContent: 'flex-end' }, ...columns),
    ),
    // Footer: the ramp, and where to get it.
    h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between', fontSize: 22, color: C.onVar },
      h('div', {}, 'thd-room-finder.vercel.app'),
      h(
        'div',
        { alignItems: 'center' },
        h('div', { width: 20, height: 20, borderRadius: 4, background: C.closed, marginRight: 8 }),
        h('div', { marginRight: 18 }, de ? 'Campus geschlossen' : 'Campus closed'),
        h('div', { marginRight: 10 }, de ? 'Weniger' : 'Less'),
        ...[C.empty, ...ramp].map((c) => h('div', { width: 20, height: 20, borderRadius: 4, background: c, marginRight: 5 })),
        h('div', { marginLeft: 5 }, de ? 'Mehr' : 'More'),
      ),
    ),
  );
}

export function GET(request) {
  const url = new URL(request.url);
  const snapshot = decodeShare(url.searchParams.get('p') ?? '');
  if (!snapshot) return new Response('Invalid share link', { status: 400 });
  return new ImageResponse(cardTree(snapshot, url.origin), {
    width: W,
    height: H,
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
