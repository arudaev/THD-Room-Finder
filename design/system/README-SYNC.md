# Sync — this folder and the Claude Design project

This folder mirrors the design-system project **THD Room Finder Design
System** on claude.ai/design. It is the system itself: tokens, components,
guideline cards, UI kits, templates, assets, `readme.md` and `SKILL.md`.

| Project | ID | URL |
|---|---|---|
| THD Room Finder Design System (design system) | `de229b71-7390-4512-805f-a450449acdf8` | https://claude.ai/design/p/de229b71-7390-4512-805f-a450449acdf8 |
| THD Room Finder — Focus (Phase 1) (design project, attaches the system) | `79245808-3482-40bf-a5f4-eb70ee8e78a5` | https://claude.ai/design/p/79245808-3482-40bf-a5f4-eb70ee8e78a5 |

## What is where

| In the project | From the repo |
|---|---|
| Everything in this folder except `README-SYNC.md` | `design/system/` |
| `brief/` | `design/brief/` |
| `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json` | Not in git. Claude Design compiles them from the components and `@dsCard` markers |
| `uploads/` | Not in git. Ad-hoc uploads made inside Claude Design |

`tokens/colors.css` here equals `src/styles/tokens/colors.css` in the app,
focus layer included. The other token files differ only in comments.

## Components mirrored from the app

Components that exist in the app are written once, in TypeScript under
`src/components/`, and mirrored here so Claude Design renders exactly what the
app ships. The mirror covers the D1–D4 focus layer, the new core controls and
`RoomCard`:

```bash
node design/mirror-components.mjs
```

It writes `<Name>.jsx` (types stripped, comments kept) and `<Name>.d.ts` (from
the TypeScript compiler, with the `@startingPoint` tag) for every component in
its list. It also mirrors the classroom calendar into `domain/` so focus
graph and share-card previews use the app's closure rules. `.prompt.md` usage notes and the `.card.html` specimens are written
by hand. Never edit a mirrored `.jsx` here; change the source and run the
script in the same PR.

## Sync from the repo to the project

Change the repo first, in a PR. After merge:

```bash
bash design/build-ds-bundle.sh /tmp/thd-ds-bundle
```

Then, in Claude Code, use the design-sync tool against project
`de229b71-…`: list the remote files, plan exactly the paths you write and
delete, then write with `localPath` from the bundle directory. Add or replace
only; delete in the project only what was deleted here.

## Pull from the project into the repo

When a design session changes the system inside Claude Design:

1. Download the changed files (the project's file listing, or a session
   export).
2. Strip preview-injected markup: any `<style data-omelette-injected>` and
   `<script data-omelette-injected>` that the preview server adds to HTML.
   `build-ds-bundle.sh` refuses to upload files that still contain it.
3. Commit to `design/system/` in a PR, with the session's handback note.

## History

| Date | Change |
|---|---|
| July 2026 | System created from the v1 apps and website; React recreations, campus map, templates |
| 13 October 2026 | Mirrored into git; dark-theme selector aligned with the app; readme rewritten for v2; Phase 1 focus layer (tokens, five cards) and `brief/` added ([#31](https://github.com/arudaev/THD-Room-Finder/issues/31)) |
| 14 October 2026 | D1–D4 approved: graph ramp, graph colours and inverse surface added; focus components, new core controls and the extended `RoomCard` mirrored from `src/components/`; focus graph card refreshed ([#62](https://github.com/arudaev/THD-Room-Finder/issues/62)) |
