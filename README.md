<h1 align="center">
  THD Room Finder
</h1>

<p align="center">
  <strong>Find a free study room at Technische Hochschule Deggendorf — and know how long it stays free.</strong>
</p>

<p align="center">
  <a href="https://vitejs.dev">
    <img src="https://img.shields.io/badge/Vite-React_18-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite + React">
  </a>
  <a href="https://www.typescriptlang.org">
    <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  </a>
  <a href="https://capacitorjs.com">
    <img src="https://img.shields.io/badge/Capacitor-Android-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor Android">
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="GPL-3.0">
  </a>
</p>

---

## Get the App

- **Use it now:** [thd-room-finder.vercel.app](https://thd-room-finder.vercel.app/) — no install needed, or "Add to Home Screen" for the PWA
- **Android APK:** [latest release](https://github.com/arudaev/THD-Room-Finder/releases/latest) — sideload on Android 12+
- **Landing page:** [arudaev.github.io/THD-Room-Finder](https://arudaev.github.io/THD-Room-Finder/)

---

## Overview

THD Room Finder queries THD's public scheduling system
[THabella](https://thabella.th-deg.de) and cross-references occupied rooms
against the rooms that actually host teaching, to show which classrooms are
**free right now** — or at any time you pick.

**v2** is a single **React + TypeScript** codebase that runs as an installable
**PWA on the web** and, via **Capacitor**, as a native **Android** app. (It
replaces the v1 native Android + native iOS + vanilla-JS PWA — all preserved
under the `v1-native` git tag.)

> **No accounts. No backend. No configuration.** Just open the app and find a room.

The v2 redesign sharpens one question — *"where can I sit, right now, for as
long as I need?"*:

- **Duration-first.** Every room leads with **how long it stays free**
  (`free 2h 10m` / `free all day`), not just a binary empty/occupied.
- **Three-state status.** free (teal) · closing-soon (amber) · occupied (red).
- **Answer, not a database.** The big free-room count flows into a list
  **ranked longest-free first**, narrowed by building.
- **Only real study rooms.** A room appears only if it hosts a lecture this
  week — offices and always-closed spaces (and sports/outdoor venues) drop out.

---

## Features

- **Free-room finder** — duration-ranked list of rooms free at the query time
- **Room search** — find any teaching room by code, name or equipment, with live
  status, even when it's busy; bilingual (searching "projector" finds "Beamer")
- **Building filter** — the primary way to narrow, once distance is off the table
- **Time-travel lookup** — check availability at any future date/time
- **Plan-ahead when closed** — before the doors open, preview the rooms that will
  be free instead of a dead-end "closed" notice
- **Room detail** — status banner, capacity, facilities, contact, the day's schedule
- **Campus map** — free rooms on a 2.5D campus map, with amenity badges for
  dining (Mensa, cafés) and study/library spaces
- **Saved rooms** — star your usual spot; the Saved tab answers "free right now?"
- **Bilingual** — English UI with German preserved; live EN/DE toggle
- **Adaptive navigation** — bottom bar (phone) → rail (tablet) → drawer (desktop)
- **Dark theme** — follows the device, with a manual override
- **Offline-friendly PWA** — installable, cached last data, 5-minute auto-refresh

---

## Tech Stack

| | |
|---|---|
| Language | TypeScript (strict) |
| UI | React 18 + a Material 3 design system (CSS-variable tokens) |
| Routing | React Router |
| Build | Vite + `vite-plugin-pwa` (Workbox service worker) |
| Native | Capacitor (Android; iOS deferred until funding) |
| Networking | Web → same-origin Vercel proxy (`api/`); Android → THabella direct via Capacitor HTTP |
| Tests | Vitest |
| Web host | Vercel (Frankfurt functions) |

The visual system (tokens + components) is sourced from the Claude Design
project *THD Room Finder Design System* and lives in `src/styles/tokens` and
`src/components`.

---

## Architecture

```
UI (React screens, src/features/*)
  └── Design system (src/components/*  — ported Material 3 components)
  └── State (React context: RoomData, Favorites, I18n, Theme)
        └── Domain (src/domain/*  — framework-free, unit-tested)
              parse · availability (duration/status/ranking) · teaching-room filter · priority
        └── Data (src/data/*)
              thabellaClient (web proxy / native HTTP) · mappers · localStorage cache
```

The domain layer is a faithful TypeScript port of the v1 Android app's trusted
THabella logic (`RoomMapper`, `PeriodMapper`, `GetFreeRoomsUseCase`,
`RoomPriorityPolicy`), extended with duration/status derivation and the
teaching-room filter. See [AGENTS.md](AGENTS.md) for a fuller map.

---

## THabella API

Base URL: `https://thabella.th-deg.de/thabella/opn/` — **no auth required**.

| Endpoint | Body | Purpose |
|---|---|---|
| `POST /room/findRooms` | `{}` | All rooms as `RoomDto[]` |
| `POST /period/findByDate/{dateTime}` | `{"sqlDate":"YYYY-MM-DD HH:mm"}` | A day's events as `PeriodDto[]` |

The API is undocumented and may change without notice — DTOs are fully nullable
and unknown keys are ignored. On the web these go through the caching proxy in
`api/`; on Android the app calls THabella directly. The teaching-room set is
built from a week of these queries (Mon–Fri), cached 24h.

---

## Build & Run

Requires Node 20+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173 (proxies THabella)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm test           # Vitest domain/data tests
npm run typecheck  # tsc --noEmit
```

### Android (Capacitor)

```bash
# Regenerate launcher/splash assets from assets/logo.svg when branding changes:
npm run assets:android
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug      # debug APK
# Signed release: fill android/keystore.properties (see the .example), then:
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk (sideload on Android 12+)
```

iOS is intentionally not scaffolded yet (blocked on Apple developer funding);
the data layer already abstracts native vs web HTTP, so `npx cap add ios` later
is an isolated step.

---

## CI / Delivery

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push / PR | Typecheck, test, web build; build Android debug APK |
| `release.yml` | tag `v*` | Build web + signed Android APK, publish a GitHub release |
| `pages.yml` | push to `main` | Deploy `website/` marketing page to GitHub Pages |

The web app deploys on **Vercel** (build `dist/` + `api/` functions). Signing
material is never committed: keep `release.keystore` locally, and CI recreates
it from a `KEYSTORE_BASE64` secret plus `KEYSTORE_PASSWORD` / `KEY_ALIAS` /
`KEY_PASSWORD`.

---

## Repository Structure

```
src/            React app — domain/ data/ components/ features/ i18n/ lib/ styles/
api/            Vercel serverless proxy for THabella (rooms.js, periods.js)
android/        Capacitor Android project (generated)
public/icons/   App icons (PWA + Android)
shared/         Canonical room/building taxonomy (JSON)
website/        Static marketing landing page (GitHub Pages)
scripts/dev/    Python helpers (taxonomy normalization, THabella snapshot)
docs/           GitHub wiki (submodule)
```

---

## License

GPL-3.0 — see [LICENSE](LICENSE).
