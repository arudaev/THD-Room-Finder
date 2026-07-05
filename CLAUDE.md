# CLAUDE.md — THD Room Finder

> Single cross-platform app (web PWA + Android via Capacitor) that helps THD
> students find a free study room in real time — and know how long it stays free.

## Project Overview

**THD Room Finder** queries THD's public scheduling system **THabella**
(`thabella.th-deg.de`) and cross-references occupied rooms against the rooms that
actually host teaching, to show which classrooms are free right now, or at any
time you pick.

**Key principles:**
- **One codebase.** v2 collapsed the old native Android + native iOS + vanilla-JS
  PWA into a single **React + TypeScript** app (installable PWA + Capacitor
  Android). The v1 native apps are preserved under the `v1-native` git tag.
- **No accounts, no real backend.** The web app uses a thin same-origin proxy
  (`api/`) only for CORS/caching; Android calls THabella directly. All logic runs
  on-device.
- **Answer-first.** Lead with *how long* a room is free, not a binary state.

## Repository Structure

```
src/
  domain/       # framework-free, unit-tested: models, parse, availability, priority, teachingRooms, format
  data/         # dto, mappers, cache (localStorage), thabellaClient (web proxy / native HTTP)
  components/   # ported Material 3 design-system components (core/ + app/) + icons
  features/     # screens + state: home/ detail/ campus/ favorites/ rooms/ (RoomDataContext) shared/
  i18n/         # EN/DE provider (t(en, de))
  lib/          # theme provider, window-size-class hook
  styles/       # design-system token CSS + global entry
  app/          # AppShell (routing + AdaptiveNav layout)
api/            # Vercel serverless proxy: rooms.js, periods.js
android/        # Capacitor Android project (generated)
public/icons/   # app icons
shared/         # canonical room/building taxonomy (JSON)
website/        # static marketing landing page (GitHub Pages)
scripts/dev/    # Python helpers (taxonomy normalization, THabella snapshot)
docs/           # GitHub wiki (submodule)
```

## Architecture

Layering (dependencies point inward): `features → components → state → domain ← data`.
The **domain layer has no framework imports** and is the trusted core — a
faithful TS port of the v1 Android use-cases, extended for v2.

- **Duration-first ranking** (`domain/availability.ts`): free rooms sorted
  longest-free first, main-campus `isPriority` as a tiebreak.
- **Three-state status**: `free | soon | occupied` (`soon` ≤ 40 min).
- **Teaching-room filter** (`domain/teachingRooms.ts`): a room is eligible only
  if it hosts ≥1 event in the current Mon–Fri week; plus an excluded-venue
  blocklist (sports/outdoor/meeting) carried over from the native app.
- **State** via React context: `RoomDataProvider` (data, time-travel,
  auto-refresh), `FavoritesProvider`, `I18nProvider`, `ThemeProvider`.

## THabella API

Base URL: `https://thabella.th-deg.de/thabella/opn/` — **no auth**.

| Endpoint | Body | Purpose |
|---|---|---|
| `POST /room/findRooms` | `{}` | All rooms `RoomDto[]` |
| `POST /period/findByDate/{dateTime}` | `{"sqlDate":"YYYY-MM-DD HH:mm"}` | A day's events `PeriodDto[]` |

Gotchas: `room_ident` is a `Map<string,string>` (one period → N rooms). Public
fields only; titles/organiser are null. **Undocumented, may change** — DTOs are
fully nullable, unknown keys ignored. Cache aggressively (rooms 24h, events 5min,
teaching set 24h).

## Build & Run

```bash
npm install
npm run dev        # Vite dev server (proxies THabella via a dev middleware)
npm run build      # tsc --noEmit + vite build → dist/
npm test           # Vitest
npm run typecheck

# Android
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug        # or assembleRelease (needs keystore.properties)
```

## Code Conventions

- **Architecture boundaries:** domain imports nothing from data/UI. Keep new
  business logic in `domain/` with a unit test.
- **Defensive API parsing:** all DTO fields nullable/optional; unknown keys ignored.
- **German context:** room/building codes stay in original German; app UI is
  English with a live DE toggle. One `t(en, de)` per string; never translate codes.
- **Design system:** style via CSS variables (`--md-*`, tokens), not hard-coded
  colors. Shadows, not borders. Ported components mirror the Claude Design source.
- **Naming:** `<Feature>Screen`, `<Entity>Provider` / `use<Entity>`, `<Entity>Dto`.
- **Tests:** Vitest, behavior-named; fakes over mocks.

## Git & Commits

**Before committing:** `npm run typecheck && npm test && npm run build` all
pass. Don't hard-code THabella data; don't add accounts or a stateful backend.

### Branching

- **Never commit directly to `main`.** `main` is the release branch; PRs target it.
- Branch from the base you're building on (usually `dev`) with a typed prefix:
  `feat/…`, `fix/…`, `chore/…`, `docs/…`, `ci/…`, `refactor/…`, `test/…`
  (e.g. `feat/campus-map`). One coherent change per branch.
- Open a PR to merge back — do not fast-forward straight into `main`.

### Commit message format

Conventional Commits. Subject line: `type(optional-scope): summary`

- **type**: `feat` | `fix` | `docs` | `refactor` | `test` | `chore` | `ci` | `perf`
- **summary**: imperative mood, lower-case, no trailing period, **≤72 chars**
  (e.g. `feat(domain): rank free rooms by remaining duration`)
- **body** (optional): wrap at 72 cols; explain *what* and *why*, not how.
- **footer** (optional): `BREAKING CHANGE:` or issue refs (`Closes #12`).
- One logical change per commit; each commit should build.

### No co-authoring / no attribution

Do **not** add any AI or tool attribution to commits or PRs — no
`Co-Authored-By:` trailers, no "Generated with …" lines, no bot signatures.
Commits are authored solely by the human maintainer.
