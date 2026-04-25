# CLAUDE.md — THD Room Finder

> Multi-platform app (Android + iOS) that helps THD students find free study rooms in real-time.

## Project Overview

**THD Room Finder** queries THD's public scheduling system **THabella** (`thabella.th-deg.de`) and cross-references occupied rooms against all known rooms to show which classrooms are currently available.

**Key principle:** No custom backend. Both apps talk directly to THabella's public `/opn/` endpoints and do all logic on-device.

## Repository Structure

```
app/                    # Android app (Kotlin + Jetpack Compose)
ios/                    # iOS app (SwiftUI)
  THDRoomFinder/        # App source (Features/, Domain/, Data/, Intents/)
  THDRoomFinder.xcodeproj
shared/
  thd-room-taxonomy.json   # Canonical room/building metadata (shared by both platforms)
scripts/
  ci/                   # CI helpers: upload-appetize.sh, export-ios-*.sh, android-*.sh
  dev/                  # Dev helpers: thd_room_normalization.py, export-thabella-snapshot.py
website/                # Static landing page (HTML/CSS)
docs/                   # GitHub Wiki submodule
.github/workflows/      # CI: ci.yml, release.yml, appetize.yml, pages.yml
```

## Architecture

### Android

```
UI (Jetpack Compose + Material 3)
  └── ViewModel (StateFlow, Kotlin Coroutines)
        └── Use Cases (domain layer)
              └── Repository (interface in domain, impl in data)
                    └── Remote: Retrofit + Kotlin Serialization → THabella
                    └── Local:  Room DB (cache, 24h TTL rooms / 5min events)
```

Pattern: MVVM + Clean Architecture. Unidirectional data flow (UDF).
Package: `de.thd.roomfinder`

### iOS

```
Features/ (Home, RoomList, RoomDetail) — SwiftUI views + ViewModels
  └── Domain/ (RoomModels, RoomPresentation, RoomPriorityPolicy, RoomRepository)
        └── Data/ (ThabellaAPIClient → THabella)
```

Pattern: MVVM with async/await. No third-party dependencies — Foundation + SwiftUI only.

## Tech Stack

| | Android | iOS |
|---|---|---|
| Language | Kotlin | Swift |
| UI | Jetpack Compose + Material 3 | SwiftUI |
| Networking | Retrofit 2 + OkHttp | URLSession (async/await) |
| Serialization | kotlinx.serialization | Codable |
| Local DB | Room (cache) | — |
| DI | Hilt | — |
| Async | Coroutines + Flow | async/await |
| Min OS | Android 8.0 (SDK 26) | iOS 16+ |
| Build | Gradle Kotlin DSL | Xcode |

## THabella API

Base URL: `https://thabella.th-deg.de/thabella/opn/` — **no auth required**.

| Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `/room/findRooms` | POST | `{}` | All rooms (289+) as `RoomDto[]` |
| `/period/findByDate/{dateTime}` | POST | `{"sqlDate":"YYYY-MM-DD HH:mm"}` | Events for a date/time as `PeriodDto[]` |

Key gotchas:
- `room_ident` in `PeriodDto` is `Map<String, String>`, not an array.
- Public fields only: `startDateTime`, `duration` (minutes), `eventTypeDescription`. Event titles/organiser are always null.
- **No official docs.** Endpoints discovered via THabella's RequireJS source.
- **API may change without notice** — use `ignoreUnknownKeys = true` and nullable fields everywhere.
- Unknown rate limits — cache aggressively.

## Shared Room Taxonomy (`shared/thd-room-taxonomy.json`)

Canonical metadata used by both platforms. Contains:
- `buildings` — 28 entries with codes, campus, display names
- `campuses`, `sites` — campus/site hierarchy
- `roomCodePatterns` — regex patterns for room code normalization

The normalization script (`scripts/dev/thd_room_normalization.py`) derives `RoomVisibilityClass` for each room:
- `teaching_room` — regular classrooms shown by default
- `secondary_venue` — labs, seminar rooms shown in expanded view
- `exclude_default` — admin/server/storage rooms hidden by default
- `unknown` — unrecognized pattern

**RoomPriorityPolicy** (iOS: `Domain/RoomPriorityPolicy.swift`, Android: use cases) sorts free rooms: main-campus teaching rooms first, then secondary venues, then remote buildings.

## Build & Run

### Android

```bash
# Debug APK
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease

# Unit tests
./gradlew test

# Lint
./gradlew lint

# Full CI check (same as CI pipeline)
bash scripts/dev/android-build.sh assembleDebug
bash scripts/dev/android-test.sh
```

### iOS

Open `ios/THDRoomFinder.xcodeproj` in Xcode. Select a simulator and run.

```bash
# Package simulator bundle for Appetize
bash scripts/ci/package-ios-simulator.sh

# Export IPA for TestFlight
bash scripts/ci/export-ios-testflight.sh

# Upload to Appetize
bash scripts/ci/upload-appetize.sh
```

## CI / Delivery

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push / PR | Build + test both Android and iOS |
| `release.yml` | tag `v*` | Build release APK + iOS IPA, create GitHub release |
| `appetize.yml` | push to `main` | Build debug APK + iOS sim bundle, upload to Appetize for live preview |
| `pages.yml` | push to `main` | Deploy `website/` to GitHub Pages |

Appetize previews require the `APPETIZE_API_TOKEN` secret. If absent, CI still builds and attaches the artifact — it just skips the upload.

## Core Features

- [x] Free Room Finder — rooms not occupied right now per THabella schedule
- [x] Building filter — filter by building code (FilterChip row)
- [x] Time-based filtering — check availability at a future date/time
- [x] Room details — capacity, facilities, contact info, day schedule
- [x] Room priority sorting — main-campus teaching rooms ranked first
- [x] Student-friendly visibility filters — exclude admin/server rooms by default
- [x] Offline support — network-first with Room DB fallback (Android); local-first (iOS)
- [x] Auto-refresh — silent 5-minute background refresh
- [x] iOS App Intents — Siri / Shortcuts integration
- [ ] Favorites — save frequently used rooms

## Code Conventions

- **Architecture boundaries:** UI → Domain ← Data. Domain layer has no platform imports.
- **No wildcard imports** (Kotlin); explicit imports (Swift).
- **Defensive API parsing:** `ignoreUnknownKeys = true`, nullable fields for all DTO properties.
- **German context:** room names and building codes stay in their original German form; app UI is in English.
- **Naming:** `<Feature>Screen` / `<Feature>View`, `<Feature>ViewModel`, `<Entity>Repository`, `<Action><Entity>UseCase`, `<Entity>Dto`, `<Entity>Entity`.
- **Tests:** use fakes over mocks; name tests as `` fun `descriptive behavior`() ``.

## Before Committing

1. `./gradlew assembleDebug test lint` passes (Android)
2. Xcode builds without warnings (iOS)
3. One logical change per commit; imperative mood, ≤72 chars.
