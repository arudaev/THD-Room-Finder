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
6. **Keep backend scope explicit.** Current shipped app is accountless and the
   THabella proxy remains CORS/caching only. The selected M1 plan in
   [PROJECT-CHARTER.md](PROJECT-CHARTER.md) permits designing a separate, minimal
   identity/presence service. Implement it only in the tracked delivery tasks
   with isolated environments, audience authorization and cost limits; do not
   turn the timetable proxy into a general social backend.

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
- A dependent epic may use native GitHub stacked PRs: one branch/PR per coherent
  child issue, each based on the layer below. This is compatible with the
  one-PR-per-task rule; it is not one PR for every tiny edit. Use the official
  `github/gh-stack` extension and [CONTRIBUTING.md](CONTRIBUTING.md).
- Use `main` as production trunk; PR-specific previews provide integration
  testing. Do not require a permanent `dev` branch or alter existing dev work.
- Use sensible, consolidated commits for meaningful completed units. Do not
  commit every small edit or leave a long chain of WIP/fixup checkpoints.
- Standardize subjects as `feat(scope): imperative summary` (or fix/docs/chore/
  refactor/test/ci/perf), at most 72 characters. Substantive commits need an
  organized body, normally bullets covering behavior, purpose and verification.
- Author all commits as `arudaev <hlexhelftd@gmail.com>`. No co-author trailers,
  generated-by text, bot signatures, tool attribution or session IDs in commits
  or PRs. These rules apply regardless of which development tool is used.
- Never run `gh stack merge`, enable auto-merge or force-push shared stack
  history. Inspect sync/rebase/push behavior before touching published layers;
  maintainer handles shared-history restacking and all merges/releases.

## Known follow-ups (good first tasks)

- **Room/building identity audit** via `shared/thd-room-taxonomy.json`:
  normalization already exists; verify remaining aliases and distinguish
  campuses before extending shared building codes.
- **2.5D CampusMap extensions**: the SVG map is implemented in `CampusScreen`.
  Future event overlays and other-campus datasets are proposals.
- **iOS**: `npx cap add ios` once Apple developer funding lands.

## Product research

See `docs/Product-Direction.md` for the selected product plan, roadmap, user
stories and design-session brief. See `docs/Map-Expansion.md` for map reuse limits
and `docs/Focus-and-Presence.md` for proposed focus-session semantics.
The selected first milestone is individual room-linked focus with remembered
degree/cohort identity and cohort-aware room signals/ranking; see
`PROJECT-CHARTER.md`. Solo/group mode is separate from visibility. Multi-person
focus, organizations, voting and push are later scope. GitHub planning is now
authorized; feature/database implementation is a separate tracked phase.
