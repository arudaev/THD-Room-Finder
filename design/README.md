# Individual focus interaction specimen

Open [focus-specimen.html](focus-specimen.html) through `npm run dev` at `/design/focus-specimen.html`. This is one selected-flow prototype with synthetic data, not competing product directions. It imports the current app's color/shape/spacing tokens. No backend, Auth, analytics, real student data or physical-location detection is attached. It is outside the production entry point/build.

Try saved E203 → **Start focus**: the remembered duration, mode and audience are shown before starting and reused immediately. A returning student does not need to confirm a sheet every time. **Session settings** opens optional duration/mode/audience controls; during an active segment, duration stays fixed and mode/audience can change. Switch the demonstration viewer between owner, matching classmate and unrelated viewer. Observe the permitted activity text and room ordering. Try private local, open mode, consented name display, reconnecting and expired fixtures, EN/DE and dark theme. Expiry/reconnection controls are test fixtures; the timer is a fixed chosen-duration specimen, not a production lifecycle implementation.

The viewer selector changes the activity projection and sample room ordering; owner controls remain visible for operating the demonstration. It is not an authentication switch. Campus-detail visibility does not make an unrelated viewer a matching cohort. The reconnecting fixture represents stale/unknown activity after the freshness threshold, not every brief request delay.

## Component and state contract for #21

| Component | Input / events | Required behavior |
|---|---|---|
| `RoomActivityRow` | Authorized summary DTO, locale, freshness; room navigation event | Under schedule availability; matching, coarse, public detail, unknown, expired and empty states; no unauthorized raw identity input |
| `FocusStartSheet` | Room, available duration, remembered settings; start/cancel/settings events | Native-equivalent accessible dialog, duration, quiet/open, separately explained audience and name consent; preserve focus on close |
| `ActiveFocusControl` | Own server session and connection state; end/resume events | Compact timestamp-derived display; reconnecting/grace/expired are distinct; no whole-map second ticks |
| `CohortBadge` | Allowed catalogue label and stable accent family | Label/icon carries meaning; accent may repeat; no verified membership or organization claim |
| `BuildingActivityBadge` | Authorized room-level aggregate and freshness | Small overlay with list equivalent; never replace timetable building fill |
| `IdentitySetup` | Auth state, degree/cohort catalogue, default audience; save/delete/private events | One-time recoverable identity setup, no university credentials; audience disclosure; local fallback |

Suggested application seam (types are a specification, not production source):

```ts
type StudyMode = 'quiet' | 'open';
type Audience = 'local' | 'classmates' | 'campus';
type RoomActivity =
  | { kind: 'unknown' }
  | { kind: 'none'; observedAt: string }
  | { kind: 'coarse'; observedAt: string; expiresAt: string }
  | { kind: 'relevant' | 'campus'; label: string; count: number;
      mode: StudyMode; displayName?: string;
      observedAt: string; expiresAt: string };
```

The server returns these permitted projections; the component must not receive all profiles and filter them. Aggregates with different session expiries need server-provided validity and refetch semantics, not a fabricated shared deadline. No activity DTO carries email, Auth ID or device lease token. Own-session commands use a separate owner-only adapter.

## Copy and behavior

| Meaning | EN | DE |
|---|---|---|
| Primary action | Start focus | Fokus starten |
| Solo mode | Quiet focus | In Ruhe lernen |
| Open mode | Company welcome | Gesellschaft willkommen |
| Classmate audience | Classmates + campus activity | Studiengruppe + Campus-Aktivität |
| Coarse activity | Study activity reported | Lernaktivität gemeldet |
| Quiet relevance | Same degree and intake · please do not interrupt | Gleicher Studiengang und Studienstart · bitte nicht stören |
| No fresh read | Study activity unknown | Lernaktivität unbekannt |
| Lost lease | Session expired · start a new segment | Sitzung abgelaufen · neuen Abschnitt starten |

Use `t(en, de)` in production; keep room codes unchanged. Long German labels wrap. Quiet/open uses text and an icon, never color alone. Every action has at least the current 44 px touch target. Dynamic status uses a polite live region; don't announce the timer every second. Keyboard order is room → start → dialog inputs → confirm/cancel → active control. Escape/cancel restores trigger focus. Reduced-motion users receive no activity pulse.

The specimen uses restrained violet for the matching cohort, apricot for an alternate sample and ochre for neutral audience emphasis. Preserve teal schedule availability, amber closing-soon and red scheduled occupancy. Production adds semantic light/dark tokens after component review; it must not copy literals into TSX. Organization tags remain later scope.

## Boundaries and next implementation

This prepares #21's design specification; #21 stays open for reusable component implementation and live integration after #19/#20. The specimen does not implement Supabase/RLS, real expiry, background behavior, screen wake lock or the SVG campus renderer. It does not demonstrate those guarantees. Architecture/access/operating acceptance lives in [ADR 0001](../architecture/0001-study-presence.md) and [pilot verification](../architecture/pilot-verification.md).
