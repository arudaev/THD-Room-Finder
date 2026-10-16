import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare, MAX_PAYLOAD } from '../../../shared/shareLink.js';
import { sharePage } from '../../../shared/sharePage.js';
import { shareLink } from './shareSnapshot';

const base = {
  // Winter semester: Thu 1 Oct 2026 – Sun 14 Mar 2027; today Thu 15 Oct.
  days: [
    { date: '2026-10-12', minutes: 200 },
    { date: '2026-10-13', minutes: 50 },
    { date: '2026-10-15', minutes: 25 },
  ],
  today: '2026-10-15',
  semesterStart: '2026-10-01',
  semesterEnd: '2027-03-14',
  semesterMinutes: 275,
  streak: 2,
  dark: false,
  accent: 'violet' as const,
  lang: 'en' as const,
};

const payloadOf = (url: string) => url.split('/f/')[1];

describe('focus graph share link', () => {
  it('carries the semester grid and figures, and nothing else by default', () => {
    const url = shareLink(base, 'https://thd-room-finder.vercel.app');
    expect(url.startsWith('https://thd-room-finder.vercel.app/f/')).toBe(true);
    expect(url.length).toBeLessThan(140);

    const s = decodeShare(payloadOf(url))!;
    expect(s.start).toBe('2026-09-27'); // the semester's first Sunday
    expect(s.weeks).toBe(25);
    expect(s.today).toBe(18); // Thu 15 Oct
    // Mon 12 Oct 200 min → 8 blocks, Tue 50 → 2, Thu 25 → 1.
    expect(s.levels.slice(15, 19)).toEqual([4, 2, 0, 1]);
    expect(s).toMatchObject({ minutes: 275, streak: 2, dark: false, accent: 'violet', lang: 'en' });
    expect(s.name).toBeUndefined();
    expect(s.batch).toBeUndefined();
  });

  it('adds name and batch only when passed, in any script', () => {
    const s = decodeShare(payloadOf(shareLink({ ...base, name: 'Jürgen 🙂', batch: 'AIN 7', dark: true, accent: 'orchid', lang: 'de' }, 'x')))!;
    expect(s).toMatchObject({ name: 'Jürgen 🙂', batch: 'AIN 7', dark: true, accent: 'orchid', lang: 'de' });
  });

  it('rejects anything that is not a payload it wrote', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('not a payload!')).toBeNull();
    expect(decodeShare('A'.repeat(MAX_PAYLOAD + 1))).toBeNull();
    const good = encodeShare({ dark: false, accent: 'violet', lang: 'en', start: '2026-09-28', weeks: 2, today: 3, minutes: 0, streak: 0, levels: [] });
    expect(decodeShare(good)).not.toBeNull();
    expect(decodeShare(`B${good.slice(1)}`)).toBeNull(); // another version
    expect(decodeShare(good.slice(0, 12))).toBeNull(); // cut short
  });

  it('builds a preview page that escapes the opt-in text and sends people to the map', () => {
    const payload = payloadOf(shareLink({ ...base, name: '<script>x</script>' }, 'x'));
    const html = sharePage(decodeShare(payload), payload, 'https://example.test');
    expect(html).toContain(`<meta property="og:image" content="https://example.test/api/card?p=${payload}">`);
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;: 5 h of focus this semester');
    expect(html).not.toContain('<script>x');
    expect(html).toContain("location.replace('/')");
  });

  it('falls back to the app preview for a broken link', () => {
    const html = sharePage(null, '', 'https://example.test');
    expect(html).toContain('content="https://example.test/og.jpg"');
  });
});

describe('invite link', () => {
  it('carries the theme and language, and its page shows the matching banner', async () => {
    const { inviteLink } = await import('./shareSnapshot');
    const { invitePage, parseInvite } = await import('../../../shared/sharePage.js');
    expect(inviteLink(true, 'de', 'https://x.test')).toBe('https://x.test/i/dark-de');
    expect(inviteLink(false, 'en', 'https://x.test')).toBe('https://x.test/i/light');

    expect(invitePage(parseInvite('dark'), 'https://x.test')).toContain('content="https://x.test/og-dark.jpg"');
    const light = invitePage(parseInvite('light-de'), 'https://x.test');
    expect(light).toContain('content="https://x.test/og.jpg"');
    expect(light).toContain('lang="de"');
    expect(light).toContain("location.replace('/')");
    expect(parseInvite('<b>')).toBeNull();
  });
});
