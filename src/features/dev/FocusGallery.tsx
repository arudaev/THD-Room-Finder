import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityRow,
  BuildingRow,
  CheckInSheet,
  ConfirmDialog,
  FocusButton,
  FocusGraph,
  FocusPill,
  FocusSummary,
  FocusSurface,
  ListNotice,
  MapLegend,
  ProfileHeader,
  RoomCard,
  SegmentedControl,
  ShareCard,
  Skeleton,
  Snackbar,
  Switch,
} from '../../components';
import type { FocusDay, FocusGraphText, FocusSurfaceText, FocusTrackSegment, FocusVisibility } from '../../components';
import { useI18n } from '../../i18n';
import { roomStatusLabel } from '../shared/roomStatusLabel';
import { useTheme } from '../../lib/theme';

/**
 * Development-only specimen of the focus-layer components (D1–D4) with fake,
 * deterministic data. Reached at /dev/focus in `npm run dev` and in Vercel
 * preview deployments; it is not routed in production builds. Used to check
 * light/dark and EN/DE before the screens that use these components are
 * built.
 */

const TODAY = '2026-10-13';

function sampleDays(): FocusDay[] {
  const days: FocusDay[] = [];
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const end = new Date(2026, 9, 13);
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (rnd() < (weekend ? 0.25 : 0.6)) {
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date, minutes: Math.round((15 + rnd() * 220) / 5) * 5 });
    }
  }
  return days;
}

const DAYS = sampleDays();

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--md-on-surface-variant)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Deep 50/10 from 10:30 to 12:20: block, break, block, break, block. */
function track(now: number, progress: number): FocusTrackSegment[] {
  const shape: [FocusTrackSegment['kind'], number][] = [['focus', 50], ['break', 10], ['focus', 50], ['break', 10], ['focus', 50]];
  return shape.map(([kind, minutes], i) => ({
    kind,
    minutes,
    state: i < now ? 'done' : i === now ? 'now' : 'next',
    ...(i === now && { progress }),
  }));
}

export function FocusGallery() {
  const { t, locale, setLocale } = useI18n();
  const { theme, cycle, setTheme, accent, setAccent } = useTheme();
  const [visibility, setVisibility] = useState<FocusVisibility>('private');
  const [showName, setShowName] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [snack, setSnack] = useState('');

  // ?theme=light|dark, ?lang=en|de and ?accent=orchid|graphite make screenshots reproducible.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const th = q.get('theme');
    const lang = q.get('lang');
    if (th === 'light' || th === 'dark') setTheme(th);
    if (lang === 'en' || lang === 'de') setLocale(lang);
    const acc = q.get('accent');
    if (acc === 'orchid' || acc === 'graphite') setAccent(acc);
  }, [setTheme, setLocale, setAccent]);

  const months = locale === 'de'
    ? ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = locale === 'de' ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const surfaceText: FocusSurfaceText = {
    title: t('Focus', 'Fokus'),
    private: t('Private', 'Privat'),
    public: t('Public · AIN 7', 'Öffentlich · AIN 7'),
    visibility: t('Who sees this session', 'Wer diese Session sieht'),
    explainPrivate: t('Others see that someone is focusing here, not who.', 'Andere sehen, dass hier jemand lernt – aber nicht wer.'),
    explainPublic: t(
      'AIN 7 sees you here and can join. Everyone else sees a focus session.',
      'AIN 7 sieht dich hier und kann beitreten. Alle anderen sehen nur eine Fokus-Session.',
    ),
    showName: t('Show my name', 'Meinen Namen zeigen'),
    nameSub: showName ? t('Shown as Lena', 'Angezeigt als Lena') : t('Shown as "AIN 7 student"', 'Angezeigt als „Studi aus AIN 7"'),
    lockedNote: t(
      'Keeps running when your phone is locked. After each break, tap to start the next block.',
      'Läuft weiter, wenn dein Handy gesperrt ist. Nach jeder Pause tippst du, um den nächsten Block zu starten.',
    ),
    end: t('End', 'Beenden'),
    signedOut: t(
      "This session stays on your device; the room doesn't show as claimed. Set up a study profile to claim rooms and focus with your batch.",
      'Diese Session bleibt auf deinem Gerät; der Raum wird nicht als belegt angezeigt. Richte ein Studienprofil ein, um Räume zu belegen und mit deinem Jahrgang zu lernen.',
    ),
    setup: t('Set Up Study Profile', 'Studienprofil einrichten'),
  };

  const graphText: FocusGraphText = {
    days: dayNames,
    months,
    cellLabel: (d, m) => {
      const day = `${dayNames[d.getDay()]} ${d.getDate()}${locale === 'de' ? '.' : ''} ${months[d.getMonth()]}`;
      if (!m) return `${day} · ${t('No focus', 'Kein Fokus')}`;
      const h = Math.floor(m / 60);
      const min = m % 60;
      const dur = locale === 'de' ? `${h ? `${h} Std. ` : ''}${min} Min.` : `${h ? `${h} h ` : ''}${min} min`;
      return `${day} · ${dur}`;
    },
    less: t('Less', 'Weniger'),
    more: t('More', 'Mehr'),
    closed: t('Campus closed', 'Campus geschlossen'),
    closureNote: t('Weekends pause your streak', 'Serie pausiert am Wochenende'),
    older: t('Older weeks', '�ltere Wochen'),
    newer: t('Newer weeks', 'Neuere Wochen'),
    share: t('Share focus graph', 'Fokus-Verlauf teilen'),
    tableCaption: t('Focus minutes per day, newest week first', 'Fokus-Minuten pro Tag, neueste Woche zuerst'),
    weekOf: t('Week of', 'Woche ab'),
    weekLabel: (d) => `${d.getDate()}${locale === 'de' ? '.' : ''} ${months[d.getMonth()]}`,
  };
  const stats = t('21 h this semester · 12-day streak', '21 Std. in diesem Semester · 12 Tage in Folge');

  return (
    <div
      style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 32, color: 'var(--md-on-surface)' }}
    >
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 400, flex: 1 }}>Focus layer · D1–D4</h1>
        <SegmentedControl
          tone="primary"
          label="Language"
          value={locale}
          onChange={setLocale}
          options={[
            { id: 'en', label: 'EN' },
            { id: 'de', label: 'DE' },
          ]}
        />
        <button type="button" onClick={cycle} style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1px solid var(--md-outline)', background: 'none', color: 'inherit', cursor: 'pointer' }}>
          Theme: {theme}
        </button>
      </header>

      <Section title="D1 · Room detail">
        <ActivityRow
          kind="batch"
          title={t('AIN 7 · 2 studying', 'AIN 7 · 2 lernen hier')}
          sub={t('Public sessions · since 09:40', 'Öffentliche Sessions · seit 09:40')}
          action={<FocusButton tone="join">{t('Join', 'Beitreten')}</FocusButton>}
        />
        <ActivityRow
          kind="claimed"
          title={t('Focus session · started 25 min ago', 'Fokus-Session · seit 25 Min.')}
          sub={t(
            'Someone is studying here. A claim is not a booking, so you can still focus here.',
            'Hier lernt gerade jemand. Eine Fokus-Session ist keine Buchung – du kannst hier trotzdem lernen.',
          )}
        />
        <ActivityRow kind="unknown" title={t('Focus activity unknown', 'Fokus-Aktivität unbekannt')} />
        <FocusButton tone="start" fullWidth>
          {t('Start focus', 'Fokus starten')}
        </FocusButton>
        <FocusSurface
          elapsed="32:10"
          phaseLabel={t('Block 2 of 3', 'Block 2 von 3')}
          track={track(1, 0.36)}
          plannedLine={t('Break at 11:20 · ends 12:20, before the 12:30 lecture', 'Pause um 11:20 · endet 12:20, vor der Vorlesung um 12:30')}
          visibility={visibility}
          onVisibility={setVisibility}
          showName={showName}
          onShowName={setShowName}
          signedIn
          text={surfaceText}
          onEnd={() => setCheckIn(true)}
        />
        <FocusSurface
          elapsed="07:40"
          phase="break"
          phaseLabel={t('Block 3 of 3 next', 'Danach Block 3 von 3')}
          track={track(3, 0.23)}
          plannedLine={t('Block 3 at 11:30 · ends 12:20, before the 12:30 lecture', 'Block 3 um 11:30 · endet 12:20, vor der Vorlesung um 12:30')}
          visibility="private"
          showName={false}
          signedIn={false}
          text={{ ...surfaceText, title: t('Break', 'Pause') }}
        />
        <FocusSurface
          elapsed="08:12"
          phase="confirm"
          phaseLabel={t('Block 3 of 3', 'Block 3 von 3')}
          track={track(4, 0.06)}
          confirmLabel={t('Start Block 3', 'Block 3 starten')}
          plannedLine={t('No answer by 11:40 ends the session.', 'Ohne Antwort bis 11:40 endet die Session.')}
          visibility="private"
          showName={false}
          signedIn
          text={{ ...surfaceText, title: t("Break's over", 'Pause vorbei') }}
        />
        <FocusSummary
          title={t('Session ended', 'Session beendet')}
          added={t('1 h 25 min', '1 Std. 25 Min.')}
          addedLabel={t('added to your focus graph', 'zu deinem Fokus-Verlauf hinzugefügt')}
          todayLine={t('Today 2 h 10 min · 12-day streak', 'Heute 2 Std. 10 Min. · 12 Tage in Folge')}
          viewGraphLabel={t('View Focus Graph', 'Fokus-Verlauf ansehen')}
        />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <FocusPill elapsed="32:10" room="E 212" label={t('Focus in E 212, 33 minutes left in block 2. Open room.', 'Fokus in E 212, noch 33 Minuten in Block 2. Raum öffnen.')} />
          <FocusPill elapsed="07:40" phase="break" room="E 212" label={t('Break in E 212, 8 minutes left. Open room.', 'Pause in E 212, noch 8 Minuten. Raum öffnen.')} />
          <FocusPill elapsed="1:05:40" room="ITC1.07" label="Focus in ITC1.07" />
        </div>
      </Section>

      <Section title="D2 · Profile">
        <ProfileHeader signedIn name="Lena" batch="AIN 7" batchLabel={t('Batch AIN 7', 'Jahrgang AIN 7')} notSignedIn={t('Not signed in', 'Nicht angemeldet')} setupLabel={surfaceText.setup} settingsLabel={t('Settings', 'Einstellungen')} />
        <ProfileHeader signedIn={false} notSignedIn={t('Not signed in', 'Nicht angemeldet')} setupLabel={surfaceText.setup} settingsLabel={t('Settings', 'Einstellungen')} />
        <SegmentedControl
          tone="primary"
          label="Graph colour"
          value={accent}
          onChange={setAccent}
          options={[
            { id: 'violet', label: t('Violet', 'Violett') },
            { id: 'orchid', label: t('Orchid', 'Orchidee') },
            { id: 'graphite', label: t('Graphite', 'Graphit') },
          ]}
        />
        <FocusGraph days={DAYS} today={TODAY} weeks={53} stats={t('21 h this semester', '21 Std. dieses Semester')} secondaryStats={t('12-day study streak', '12 Lerntage in Folge')} label={stats} text={graphText} onShare={() => setSnack(t('Link copied', 'Link kopiert'))} />
        <div style={{ maxWidth: 380 }}>
          <FocusGraph days={DAYS} today={TODAY} weeks={53} compact stats={t('21 h this semester', '21 Std. dieses Semester')} secondaryStats={t('12-day study streak', '12 Lerntage in Folge')} label={stats} text={graphText} onShare={() => undefined} />
        </div>
        <FocusGraph days={[]} today={TODAY} weeks={20} stats={t('No focus yet. Start a session in any free room.', 'Noch kein Fokus. Starte eine Session in einem freien Raum.')} label="Focus graph" text={graphText} />
        <div style={{ background: 'var(--md-surface)', borderRadius: 'var(--radius-l)', boxShadow: 'var(--md-shadow-1)', padding: '4px 16px' }}>
          <Switch checked={quiet} onChange={setQuiet} label={t("Show my batch's sessions like anyone else's", 'Sessions meines Jahrgangs wie fremde anzeigen')} />
        </div>
        <Skeleton label={t('Checking room status…', 'Raumstatus wird geladen …')} blocks={[72, 72]} />
        <button type="button" onClick={() => setConfirm(true)} style={{ alignSelf: 'start' }}>
          Open delete dialog
        </button>
      </Section>

      <Section title="D3 · List and map">
        <ListNotice kind="quiet">{t('AIN 7 sessions show as claimed (Settings).', 'Sessions von AIN 7 erscheinen als Fokus-Session (Einstellungen).')}</ListNotice>
        <ListNotice kind="time">{t('Schedule only. Focus activity shows for now.', 'Nur Belegung. Fokus-Aktivität gibt es nur für jetzt.')}</ListNotice>
        <ListNotice kind="unknown">{t('Focus activity unknown', 'Fokus-Aktivität unbekannt')}</ListNotice>
        <RoomCard name="E 212" meta={t('Building E · 60 seats', 'Gebäude E · 60 Plätze')} status="free" statusLabel={roomStatusLabel('free', t)} duration="6h" focus={{ kind: 'own', label: t('Your session · 24:10', 'Deine Session · 24:10') }} />
        <RoomCard name="A 008" meta={t('Building A · 45 seats', 'Gebäude A · 45 Plätze')} status="free" statusLabel={roomStatusLabel('free', t)} duration="4h 30m" focus={{ kind: 'batch', label: t('AIN 7 · 2 studying', 'AIN 7 · 2 lernen hier') }} />
        <RoomCard name="ITC 2.01" meta={t('ITC 2 · 30 seats', 'ITC 2 · 30 Plätze')} status="claimed" statusLabel={roomStatusLabel('claimed', t)} duration="4h" focus={{ kind: 'claimed', label: t('Focus session · 40 min', 'Fokus-Session · 40 Min.') }} />
        <RoomCard name="D 105" meta={t('Building D · 24 seats', 'Gebäude D · 24 Plätze')} status="soon" statusLabel={roomStatusLabel('soon', t)} duration="25m" focus={{ kind: 'claimed', label: t('Focus session · 10 min', 'Fokus-Session · 10 Min.') }} />
        <div style={{ background: 'var(--md-surface)', borderRadius: 'var(--radius-l)', boxShadow: 'var(--md-shadow-1)', overflow: 'hidden' }}>
          <BuildingRow code="ITC" name="Rohde & Schwarz Forum" freeLine={t('4 of 20 rooms free', '4 von 20 Räumen frei')} batch={t('AIN 7 · 2 studying', 'AIN 7 · 2 lernen hier')} claims={t('1 focus session', '1 Fokus-Session')} />
          <BuildingRow code="E" name={t('Building E', 'Gebäude E')} freeLine={t('6 of 12 rooms free', '6 von 12 Räumen frei')} own={t('Your session', 'Deine Session')} divider />
          <BuildingRow code="A" name={t('Building A', 'Gebäude A')} freeLine={t('2 of 9 rooms free', '2 von 9 Räumen frei')} divider />
        </div>
        <MapLegend free={t('Free rooms', 'Freie Räume')} batch={t('AIN 7 studying', 'AIN 7 lernt hier')} claim={t('Focus session', 'Fokus-Session')} />
        <MapLegend free={t('Free rooms', 'Freie Räume')} note={t('Schedule only', 'Nur Belegung')} />
      </Section>

      <Section title="D4 · Share card">
        <div style={{ maxWidth: 360 }}>
          <ShareCard
            days={DAYS}
            today={TODAY}
            semesterStart="2026-10-01"
            semesterEnd="2027-03-14"
            months={months}
            theme={theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme}
            accent={accent}
            iconSrc="/icons/app-icon.svg"
            url="thd-room-finder.vercel.app"
            figures={[
              { num: '21', unit: t('h', 'Std.'), label: t('this semester', 'in diesem Semester') },
              { num: '12', unit: '', label: t('day streak', 'Tage in Folge') },
            ]}
            alt={t('Focus graph image: 21 hours this semester, 12-day streak.', 'Bild des Fokus-Verlaufs: 21 Stunden in diesem Semester, 12 Tage in Folge.')}
          />
        </div>
      </Section>

      <CheckInSheet
        open={checkIn}
        title={t("Break's over in E 212", 'Pause vorbei in E 212')}
        meta={t('Block 3 of 3 · E 212', 'Block 3 von 3 · E 212')}
        body={t('No answer by 11:40 ends the session.', 'Ohne Antwort bis 11:40 endet die Session.')}
        endLabel={t('End', 'Beenden')}
        keepLabel={t('Start Block 3', 'Block 3 starten')}
        onKeep={() => setCheckIn(false)}
        onEnd={() => setCheckIn(false)}
      />
      <ConfirmDialog
        open={confirm}
        title={t('Delete study profile?', 'Studienprofil löschen?')}
        body={t(
          'Your profile and any public session are removed. Your focus graph stays on this device.',
          'Dein Profil und laufende öffentliche Sessions werden entfernt. Dein Fokus-Verlauf bleibt auf diesem Gerät.',
        )}
        confirmLabel={t('Delete', 'Löschen')}
        cancelLabel={t('Cancel', 'Abbrechen')}
        onCancel={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)}
      />
      <Snackbar message={snack} onClose={() => setSnack('')} bottom={96} />
    </div>
  );
}
