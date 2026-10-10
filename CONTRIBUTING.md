# Contributing and delivery

Read [PROJECT-CHARTER.md](PROJECT-CHARTER.md), [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md). The selected first milestone is individual room-linked focus and cohort-aware discovery. Group coordination and organization events are later scope.

## Issues and project board

Use the repository's Campus Study project. Titles follow `[M1] Outcome` for an epic and `[M1-S1] Concrete behavior` for a story/task. Epics describe outcome, scope/non-goals and completion criteria; children contain a user story or technical problem, acceptance criteria, dependencies, design/data implications and verification. Avoid one issue per tiny edit.

Use native parent/sub-issue relationships, not only checkbox links. Record blocking dependencies explicitly; an epic relationship and a dependency are different. Use `epic`, `story` or `task`, plus a relevant area and `needs-design` where required. Priority and milestone belong in project fields; labels do not need to duplicate every status.

Project states: **Backlog → Ready → In progress → In review → Done**, with **Blocked** for an identified dependency. Ready means scope/acceptance are clear. Draft PR means work in progress; review-ready PR means In review. Done means accepted/merged implementation (or a completed non-code task), not an opened PR or passed CI. Deployment verification belongs in the acceptance checklist. An epic closes only after its children and outcome are complete.

Assign a person only when they take ownership. Record start/target/completion dates when known rather than inventing deadlines. Branch creation alone is not proof work has started; use a draft PR or project update. Linked PRs, parent issue and progress fields provide traceability.

## Branches, previews and native stacks

`main` is production trunk. This project uses PR previews rather than requiring a permanent `dev` branch. Existing historical dev work is not deleted or reset. Use `feature/<issue>-<description>`, `fix/<issue>-<description>`, `docs/<issue>-<description>` or `chore/<issue>-<description>`. Keep one branch/PR per coherent issue; review fixes update that branch.

Native GitHub stacks are supported by the official **github/gh-stack** CLI extension, verified locally at v0.2.1 on 10 October 2026. It was already installed and has been upgraded. Installation elsewhere: `gh extension install github/gh-stack`. Stacks are generally available as of October 6, not a third-party workaround. [GitHub announcement](https://github.blog/changelog/2026-10-06-stacked-pull-requests-generally-available/).

Example for real dependent work, using actual issue numbers in place of placeholders:

```bash
gh stack init --base main feature/<issue-a>-study-identity
# Implement, verify and commit the coherent first layer.
gh stack add feature/<issue-b>-focus-presence
# Implement, verify and commit the dependent layer.
gh stack add feature/<issue-c>-cohort-room-signals
gh stack submit --auto
gh stack view
```

`submit --auto` creates drafts by default; inspect and rewrite generated titles/bodies with `gh pr edit --body-file` before requesting review. Layer 1 targets main, layer 2 targets layer 1, and so on. Each diff contains only its own work, while its Vercel preview includes ancestors. Parallel independent tasks should not be forced into a stack. Prefer a few meaningful layers over a six-layer stack of tiny changes.

Explicitly link every PR to its own issue using the Development relationship or a supported closing reference. Ancestor-base PR closing references may not close an issue until code reaches the default branch; do not assume every intermediary merge completes delivery. Describe stack/base, outcome, tests, preview and remaining acceptance checks. Do not copy the epic's closing keyword into every child PR.

Agents must not run stack merge, enable auto-merge, merge PRs or publish releases. `gh stack sync/rebase/push/submit` may rewrite branch history: inspect behavior before using them on published/shared layers, and do not force-push shared history. Maintainer handles any necessary shared-stack restacking. Never automatically delete another contributor's branches. All branches in native stacks must be in the same repository; fork contributions can use ordinary PRs. [Stack creation reference](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-stacked-pull-requests).

## Sensible commits

Commit meaningful completed units, not every file/edit or a stream of WIP checkpoints. Prefer one commit per small coherent PR; use additional commits only for distinct reviewable changes. Do not rewrite already shared history simply to meet a numerical target.

Format: `feat(scope): imperative summary` (also `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`), subject at most 72 characters. Include an organized body explaining behavior, purpose and verification for substantive changes:

```text
feat(focus): publish expiring room study signals

- Keep personal timers usable without sharing.
- Limit cohort summaries to the permitted audience.
- Verify expiry and room-ranking boundaries with domain tests.

Refs #<issue>
```

Author: `arudaev <hlexhelftd@gmail.com>`. No co-author trailers, generated-by messages, bot signatures, tool attribution or session IDs in commits/PRs. Never put credentials in messages or documentation. Set authorship explicitly for this repository before committing.

## Checks, environments and project automation

Run `npm run typecheck`, `npm test`, `npm run build`. UI/service work additionally needs live-data/device checks, audience/expiry tests and abuse/request-budget verification. CI applies to every PR base, including feature branches in a stack. Do not weaken checks because a PR is an intermediate layer.

Vercel previews test each PR's cumulative tree; `main` remains the production deployment source. Fake student identities/data belong only in isolated preview/local Supabase environments. New database migrations and seeded environments need their own review and budget check; branch entitlement and usage charges are not inferred from a paid-account nickname.

The project uses native GitHub workflows where possible. Account-owned Projects cannot be updated using the repository's ordinary GITHUB_TOKEN alone; any future custom automation needs a narrowly scoped GitHub App/token, not a copied administrator credential. Configure and verify built-in rules before claiming automated transitions; document any remaining manual action honestly.

Wiki content lives in a separate repository. Its task-branch commit must be pushed before a parent gitlink can reference it. Review the snapshot through the parent PR; the maintainer separately publishes the wiki default branch after acceptance. Do not silently push wiki default while opening a review PR.
