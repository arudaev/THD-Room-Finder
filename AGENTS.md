# AGENTS.md — working in THD Room Finder

Guidance for coding agents (and humans) touching this repo. It complements
[CLAUDE.md](CLAUDE.md) and [README.md](README.md); read those first for the
full architecture. This file is the quick, task-oriented map.

## What this is

A single **React + TypeScript** app (Vite) that finds free THD study rooms from
public **THabella** data. Runs as a **web PWA** and a **Capacitor Android** app
from one codebase. No accounts, no stateful backend. v1's native Android/iOS
apps were retired into the `v1-native` git tag.

## Golden rules

1. **Business logic goes in `src/domain/` and gets a Vitest test.** The domain
   layer imports nothing from React or the network — keep it that way. It is the
   trusted port of the v1 Android use-cases; changes there are the highest-risk.
2. **Parse defensively.** THabella is undocumented and changes without notice.
   Every DTO field is nullable/optional; never assume a shape.
3. **Only show real study rooms.** Eligibility = "hosts a lecture this week"
   (`domain/teachingRooms.ts`) minus the excluded-venue blocklist
   (`domain/priority.ts`). Don't reintroduce offices/pools/gyms into the list.
4. **Style with tokens, not literals.** Use the `--md-*` / token CSS variables
   (`src/styles/tokens`). Shadows, not borders. Keep the Material 3 look.
5. **Bilingual by construction.** UI strings use `t(en, de)` from `useI18n()`.
   Never translate room/building codes (`A.011`, `ITC1.07`).
6. **Don't add a backend or accounts.** The `api/` proxy is CORS/caching only.

## Where things live

| You want to… | Look in |
|---|---|
| Change how "free / soon / occupied" or duration is decided | `src/domain/availability.ts`, `format.ts` |
| Change the teaching-room / venue filtering | `src/domain/teachingRooms.ts`, `priority.ts` |
| Change THabella fetching / caching | `src/data/thabellaClient.ts`, `cache.ts`, `mappers.ts` |
| Edit a screen | `src/features/<home|detail|campus|favorites>/…` |
| Shared data/time-travel/refresh state | `src/features/rooms/RoomDataContext.tsx` |
| A design-system component | `src/components/<core|app>/…` (mirror the Claude Design source) |
| Navigation / layout / routing | `src/app/AppShell.tsx`, `src/components/app/AdaptiveNav.tsx` |
| Theme / locale | `src/lib/theme.tsx`, `src/i18n/` |
| Change the app logo / launcher / splash | `assets/logo.svg`, then `npm run assets:android` |

## Commands

```bash
npm install
npm run dev        # localhost:5173 — dev server proxies THabella (no CORS setup needed)
npm run typecheck  # tsc --noEmit — must be clean
npm test           # Vitest — domain/data tests
npm run build      # typecheck + vite build → dist/
```

Android: `npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)`.
A signed release APK needs `android/keystore.properties` (see the `.example`).

## Verifying a change

- `npm run typecheck && npm test && npm run build` must all pass.
- For UI/behavior, run `npm run dev` and check against **live THabella** data:
  free-room count, duration-ranked order, EN/DE toggle, dark mode, room detail
  schedule. There are no fixtures — the dev middleware hits the real API.

## Agent git workflow

- Use exactly one task branch and one pull request. If review or CI finds a
  problem, update that same branch and PR; never create follow-up fix PRs for
  the same task.
- Agents must never merge pull requests, force-push shared history, move release
  tags, or publish releases. Stop after opening the PR; the maintainer merges and
  releases.
- Keep unrelated working-tree changes out of the branch and PR.

## Known follow-ups (good first tasks)

- **Room/building code normalization** via `shared/thd-room-taxonomy.json`:
  descriptively-named rooms currently yield noisy building-filter chips
  (`Vorlesungssaal`, `DEGG`, `--`). Map them to canonical codes.
- **2.5D CampusMap**: `CampusScreen` is a building-grouped locator; the
  design-system `CampusMap` (SVG) is meant to replace it.
- **iOS**: `npx cap add ios` once Apple developer funding lands.
