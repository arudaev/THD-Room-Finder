# Focus sessions: Phase 1 product specification

> **Status:** selected scope for milestone **M1 — Focus sessions** (epic
> [#16](https://github.com/arudaev/THD-Room-Finder/issues/16)). Decisions are
> recorded in the [charter](../../PROJECT-CHARTER.md),
> [ADR 0002](../architecture/adr/0002-focus-session-lifecycle.md) and
> [ADR 0004](../architecture/adr/0004-focus-rhythm.md). Visual
> design follows the [design brief](../../design/brief/README.md).

## The idea in one paragraph

Room Finder already answers *"where is a free room, and for how long?"*. That
question only matters a few weeks a year, around exams. Phase 1 adds the
everyday reason to open the app: **you go to a room you like and start a focus
session**: blocks of focus with short breaks, in a rhythm you choose. The
focus is the point; the room is the reward. Alone, it claims the room quietly. Open to your batch, it becomes an
invitation: your classmates see a violet room on the map and can come and
study with you. Every session you finish fills in your personal focus graph.

## Who it is for

| Person | Need | What Phase 1 gives them |
|---|---|---|
| Student who studies at home and occasionally on campus | A quiet room that stays free, without hunting | Free rooms ranked by how long they stay free; claimed rooms sink lower in the list |
| Student who wants company | Know where classmates are studying right now | Violet batch signals on map and list |
| Student who wants a routine | Proof of consistency, a streak to keep | Local focus graph and shareable card |
| New student | Find good rooms on an unfamiliar campus | Same as today, plus visible activity of their batch |

## Core flow

```mermaid
sequenceDiagram
    actor S as Student (AIN 7)
    participant App
    participant Svc as Focus service
    actor B as Batchmate (AIN 7)
    actor O as Other student

    S->>App: Open E212 (free 6 h)
    S->>App: Start focus
    App->>Svc: start(E212, until next lecture, Private)
    Svc-->>App: session, leaseUntil
    Note over App: Focus surface turns violet,<br/>Private / Public toggle shown
    O->>Svc: room summaries (building E)
    Svc-->>O: E212: focus session (anonymous)
    Note over O: E212 shows dark purple<br/>and ranks below free rooms
    S->>App: Switch to Public
    App->>Svc: update(mode = Public)
    B->>Svc: room summaries
    Svc-->>B: E212: AIN 7 studying (name if allowed)
    Note over B: Building E gets a violet marker;<br/>E212 shows "AIN 7 · studying · join"
    S->>App: End (or chosen end / lecture / no check-in)
    App->>Svc: end()
    Note over App: +minutes on the local focus graph
```

## Screens and states

### Room detail

| State | What the student sees | Primary action |
|---|---|---|
| Free, no activity | Teal status card "free for 6 h"; under Start, the rhythm for this session ("Pomodoro · 25 min focus, 5 min break"), tap to change | **Start focus** (filled, primary blue) |
| Free, your batch is studying here | Teal status card + violet row "AIN 7 · 2 studying" | **Join focus** (starts your own session, public) |
| Claimed by someone else | Dark-purple row "Focus session · 40 min" under the status card | Start focus still possible: it is a shared room, not a booking |
| Lecture now | Red status card | None (focus unavailable) |
| Your session, focus block | Violet focus surface: countdown to the break, "Block 2 of 3", a track of blocks and breaks, planned end, **Private / Public** (Private by default; only with a study profile), End | End |
| Your session, break | The same surface, "Break · 7:40 left", what comes next | End |
| Your session, break over | "Break's over" with **Start block 3**; 10 minutes to answer | Start block 3 |

Facility tags (Beamer, Whiteboard, EDV…) collapse into one summary line under
the status card so the Start focus action stays above the fold.

### Room list and map

- List rows keep the duration hero. A batch session adds a violet badge; a
  claim tints the overline and duration dark purple and moves the row into the
  claimed bucket ([ordering](#ordering)).
- Map buildings keep the teal availability tint. A building with a public
  session of your batch gets a **violet ring** on its roof; claims show as a
  small dark-purple dot with a count. Text labels ("AIN 7 · 2") appear only
  on the **tapped building**, so the overview stays quiet on small screens.
  **No focus signal ever recolours lecture occupancy.**
- Every map signal has a list equivalent for screen readers and colour-blind
  users.

### Profile tab (replaces *Saved*)

Navigation becomes **Campus · Rooms · Profile**.

The Profile holds only what a student checks or updates **almost daily**:
their focus graph and saved rooms. Everything set once a semester or less
lives in **Settings**, behind one gear icon. Later phases add to Profile only
if they pass the same test.

| Profile | Contents |
|---|---|
| Header | Avatar initial, display name, batch chip ("AIN 7"), gear → Settings. Signed out: "Set Up Study Profile" |
| Focus graph | GitHub-style contribution calendar: square cells, rows Sun–Sat, one column per week, current week rightmost, five levels from near-white to the darkest violet, counted in Pomodoro blocks per day (1 · 2–3 · 4–6 · 7+); streak and total; **Share** |
| Saved rooms | Today's Saved list with live status (unchanged behaviour, new home) |

| Settings | Contents |
|---|---|
| Study profile | Programme (e.g. AIN), intake term → shown as "AIN 7", display name |
| Sharing | Default mode (Private); the one place that explains what others see |
| Focus | Default rhythm (Deep, Pomodoro, Lecture, Open or Custom), notifications |
| Appearance | Theme, language, graph colour (Violet, Orchid or Graphite, each with a hand-tuned ramp; it colours the focus graph and share card only, while session and batch signals stay violet and free/soon/claimed/lecture never change), quiet preference |
| Account | Sign in with email code, export/import focus history, sign out, delete profile |

### Sharing the focus graph

| Action | What happens |
|---|---|
| **Share link** (main) | The app builds a link that carries a snapshot of the current semester's graph. Chat apps show the card as the link preview; opening it lands on the campus map. Copy Link is the main action. Nothing is stored on a server ([ADR 0003](../architecture/adr/0003-focus-graph-share-links.md)) |
| **Save image** | The same card as a PNG (1080×1080, ≤ 150 KB), for stories and apps without link previews |
| Card contents | Hours this semester, streak, the semester grid (first week of the semester on the left, future days blank), app name and URL. Name and batch only if switched on |
| Theme and accent | The sender's app theme (light/dark) and focus accent at the moment of sharing |

## Batches

A **batch** is a programme plus an intake term: *AIN, winter 2023*. The app
derives the semester number for the current term (winter 2026 → **AIN 7**),
including extension semesters 8 and 9. Programme codes come from the THD
taxonomy built in [#40](https://github.com/arudaev/THD-Room-Finder/issues/40):
for example **AIN** (Artificial Intelligence, English) and **KI** (Künstliche
Intelligenz, German) are different programmes and different batches.

Batch membership is **self-declared** in Phase 1. It is a discovery aid, not
proof of enrolment.

## Ordering

THabella eligibility (rooms that host teaching this week), the chosen time and
the required duration are applied first. Then:

| Bucket | Rooms | Sort within bucket |
|---|---|---|
| 1 | Free, no focus activity, **or** your batch is studying there publicly | Longest free first; main campus tiebreak |
| 2 | Closing soon (free ≤ 40 min) | Longest free first |
| 3 | Claimed by a focus session (private, or another batch's public session); a claimed room closing soon stays here with an amber duration | Longest free first |
| 4 | Lecture now | Soonest free first |

A **quiet preference** (Profile → Appearance) treats your own batch's sessions
as claims too, for people who want to be alone. Saved rooms are always
reachable from Profile, whatever their bucket.

## Colour semantics

| Meaning | Token family (concept) | Light | Dark | Where |
|---|---|---|---|---|
| Free | `--md-tertiary` (teal) | `#00796B` | `#80CBC4` | Status, map tint |
| Closing soon | `--md-warning` (amber) | `#9A6700` | `#F4C05A` | Status |
| Lecture / occupied | `--md-error` (red) | `#B3261E` | `#F2B8B5` | Status |
| **Your focus / your batch** | `--md-focus` (violet) | `#6A4BA8` | `#D0BCFF` | Active session surface, batch badge, map marker |
| **Claimed by a focus session** | `--md-claimed` (dark purple) | `#4E4060` | `#CFC0DC` | Claim row, claimed bucket, map dot |
| Phase 3 city events (reserved) | `--md-event` (ochre) | `#6B5E00` | `#DCCB5C` | Not used before M4 |
| Structure, actions | `--md-primary` (THD blue) | `#1565C0` | `#90CAF9` | Start focus button, links, navigation |

All pairs meet WCAG AA, most AAA; ratios are listed in the
[design brief](../../design/brief/02-focus-layer.md). Colour is never the only
carrier of meaning: every signal also has a label and an icon.

## Session rules (summary of ADR 0002 and ADR 0004)

- A session is a **rhythm of focus blocks and breaks**. Pomodoro (25 min
  focus, 5 min break, 15 after every 4th block) is the default; Deep (50/10,
  listed first), Lecture (90/15), Open (a stopwatch) and Custom are one tap
  away.
- The plan ends before the room's next lecture, at closing time or after
  3 hours, whichever comes first, and never on a break.
- After each break the app asks to **start the next block**. With no answer
  within 10 minutes the session ends at the end of the last block, so a
  forgotten session holds a room for at most one block and break more.
- Only focus time counts for the focus graph. In the Android app, time spent
  in other apps during a block is subtracted.
- **Without a study profile, focus stays on the device**: no claim, nothing
  sent. Offline works the same way.
- **Signed in, the focus graph follows you** to every device you sign in on:
  dates and minutes sync, rooms stay on the device. A running shared session
  shows on your other devices too
  ([ADR 0005](../architecture/adr/0005-focus-across-devices.md)).
- With a study profile, **Private is the default**. Public is one tap away
  and can be switched back.
- Locking the phone does not end the session. A notification shows the phase
  and a countdown; in the Android app it is on the lock screen too.
- One active session per person. Starting elsewhere ends the old one.

### Joining and ending

Phase 1 has **no shared group object**. Every session belongs to one person.

| Action | What happens |
|---|---|
| **Join** on a batch row | Starts *your own* session in that room, **Public**, in the **same rhythm as the batch** so everyone breaks together. Joining during a break starts focus right away. Your planned end comes from the same rules as Start |
| **End** | Ends **only your** session. Nobody else's timer changes |
| The person you joined ends | Your session keeps running. The batch row's count drops by one |
| Last Public session in the room ends | The violet batch row disappears; remaining Private sessions still show as a claim |
| Switch to Private after joining | Allowed; you leave the batch count and show as a claim |
| No answer after a break | Your session ends at the end of your last block; the batch row's count drops by one |

Groups with invitations, friends outside the batch and a group object are
Phase 2 ([later phases](later-phases.md)).

## Privacy promises

| Promise | How it is kept |
|---|---|
| Outsiders never learn who is in a claimed room | The service returns anonymous claims to non-batch viewers; names never leave the server for them |
| No attendance history on a server | Signed out, completed sessions stay on the device. Signed in, only dates and minutes sync so the graph matches across devices; rooms never leave the device ([ADR 0005](../architecture/adr/0005-focus-across-devices.md)) |
| Self-declared batch, honest wording | Setup explains that batch matching is self-declared and that others see a claim |
| Delete means delete | Profile deletion ends sessions and removes the identity and the synced history; Clear history clears the account copy too |
| No location tracking | The app never reads GPS; a session is linked to the room the student picked |

## Acceptance examples

- Starting in E212 at 10:15 with a lecture at 16:00 plans an end of 13:15 (3 h cap).
- A batchmate sees "AIN 7 · studying"; a KI student sees only "Focus session".
- Deep rhythm from 09:30 with a lecture at 11:30: block 1 until 10:20, a break until 10:30, block 2 until 11:20, and the session ends.
- Not answering "Start block 2" by 10:40 ends that session at 10:20 with 50 minutes recorded.
- Locking the phone for a whole block keeps the session.
- A lecture at 12:00 ends a session that started at 11:30.
- With presence unavailable, the list falls back to schedule order and says "activity unknown".
- Time travel to tomorrow 09:00 shows no focus signals.

## Out of scope for Phase 1

Group objects and invitations, chat, friends, organization accounts, events, city layer, push
from a server, leaderboards. See [later phases](later-phases.md).

### Campus closures and focus streaks

Focus streaks count consecutive **open classroom-campus days**, not calendar
days. Saturday and Sunday pause the streak: focusing Monday through Friday
produces five days, it remains five over the weekend and on Monday before a
session, and becomes six after focusing Monday. Missing an open weekday breaks
the streak once that day ends. Closed days never add streak days, even if an
older/imported session falls on one; all saved minutes remain in history and
semester totals. An empty history always has a zero streak.

The profile graph, compact mobile graph, saved PNG and link-preview card show
elapsed closed dates in neutral gray (`--md-graph-closed`), independent of graph
colour, in light and dark themes. Today retains its outline, including on a
closed day. Future dates retain the graph's blank slots / share card's outlined
slots. Tooltips and the accessible table include "Campus closed" / "Campus
geschlossen" alongside any recorded minutes; the compact graph footer explains the
paused streak. The semester total leads the card, with the study-day streak on a secondary line. The footer pairs a pause icon and a short weekend note with the five-swatch intensity ramp; its less-to-more label remains accessible. At every screen width, native swipe, trackpad and keyboard scrolling reveal the full year without a visible scrollbar. Cells scale with the card width (14�26 px); the profile column is capped at 840 px. Wider pointer layouts also offer older/newer navigation buttons. The viewed week is preserved when resizing or rotating. Weekend cells blend the closed-day token into the surface for softer contrast. A subtle left-edge fade signals more history and disappears at the oldest week.

The source is the general classroom schedule in `src/domain/openingHours.ts`,
not the library schedule or the absence of THabella lectures. The repository
currently has **no dated holiday or exceptional campus-closure calendar**, so
no extra closure dates are guessed. Semester breaks have reduced weekday hours
and therefore do not pause weekday streaks. If verified dated closures are
added later, update the classroom calendar and the server share-card renderer
together and extend their consistency tests.

Weeks start on Sunday in the graph and new share cards/links, matching the
GitHub contribution calendar reference. Visible row labels remain Monday,
Wednesday and Friday (rows 2, 4 and 6). Existing share payloads retain their
encoded start date, so older links still map minutes to the correct dates.
