# Campus study presence: project charter

Decision date: **10 October 2026**. Owner: repository maintainer. Status: selected product direction and delivery plan; feature implementation and paid infrastructure provisioning have not started. This supersedes the earlier three-concept comparison and invitation-first recommendation.

## First delivery: my room, my focus, my classmates

A student has E203 saved, arrives there, opens its detail and starts focus. Their remembered identity includes a chosen display name, degree and batch/cohort. With the visibility chosen during setup, classmates can see a relevant room-level study signal. Other room seekers see that there is self-reported study activity, without receiving private identity information. Starting a session should be a short familiar action, not an event composer.

Solo means studying individually; it does **not** necessarily mean invisible. Distinguish study mode from audience. Setup explains cohort visibility once and lets the student choose a default; start uses that preference with a visible audience summary. A private local timer remains available. No favorites are automatically published, and the app does not infer that a student entered a building.

Switching from solo/quiet to open/group marks willingness to study with others and can broaden the chosen audience. In M1 this is a mode of one person's session, not a multi-person timer, RSVP system or event. A display name can be shown to an explicitly selected audience. The map may show a building activity badge; room detail/list supplies the precise room, mode and permitted cohort information.

## Scope

| M1: deliver together | Later, separate epics | Outside this project's purpose |
|---|---|---|
| Remembered identity, degree/cohort and audience preference | Shared group leases/timers, polls, pre-planned sessions | University timetable/grades/email replacement |
| Start/end one individual's room-linked focus, chosen end time and five-minute lease expiry | Organization tags/roles and verified-host events | Exclusive room reservation or proof of physical occupancy |
| Cohort-aware room signals and activity-aware room ordering | City places/events and justified additional maps | Continuous GPS tracking, public attendance histories |
| Solo versus open mode, separate audience and optional name display | Notifications, friends, calendar subscriptions, payments | A general-purpose social network/chat service |
| EN/DE, accessible list/map equivalents, restrained palette | Other identity conveniences justified by usage | Automatic publication of private favorites |
| Isolated previews, fake-user testing, budget/abuse controls | Expanded campus/community pilots | Agent merges/releases or surprise infrastructure spending |

Room schedules remain authoritative for scheduled teaching. Study activity is an independent self-reported layer. Never recolor a lecture-free room as lecture-occupied, hide occupied lectures through social relevance, or imply that starting focus reserves the room.

## Room ordering decision

Apply existing teaching eligibility, chosen time, duration and access constraints first. For otherwise suitable rooms, the proposed default puts **no study activity or relevant same-degree/same-batch activity** ahead of unrelated study activity. Preserve duration-ranked ordering within activity buckets. Matching activity has a clear relevance badge; it is not proof that the person welcomes interruption. Open mode states whether company is welcome.

Provide a discoverable quiet preference that deprioritizes all shared activity. Saved rooms stay easy to find; a saved room does not disappear because another student is focusing. Expired signals stop influencing ranking. No presence data means ordinary schedule ranking, not an invented zero-occupancy claim. Domain/data tests must cover these rules before implementation.

## Identity, visibility and architecture decision

Recommend Supabase Auth plus Postgres/RLS for the new shared capability, subject to an isolated-environment and budget check. Browsing/favorites/local timer remain accountless. Store minimal chosen identity, canonical degree/cohort, consent/default audience and one active room session per identity. Do not assume a university SSO/API or require university credentials. Degree/cohort are self-declared unless later separately verified.

The service returns only audience-authorized summaries. Outsiders may receive a coarse activity signal needed for ranking; private names/cohort records are not sent and merely hidden in the client. Broad visibility is an explicit setting. Deletion/revocation and expiry must remove future access. A later implementation ADR must settle auth provider, exact cohort taxonomy and retention before service activation; this charter authorizes planning for the narrowly defined service, not arbitrary backend expansion.

Use server-time leases, a candidate 60-second renewal and approximately five-minute expiry after last renewal. Choose the final interval against measured cost and expiry UX; the previous 30-second model is a comparison, not a mandate. Hidden pages stop renewal under the selected prototype model. A chosen session end also terminates activity. Screen-awake is optional and capability-dependent. Group continuity is deferred from M1.

## Visual direction

Retain current Material 3 tokens and room availability semantics. Current source already uses blue primary, teal availability, amber warning and red occupied; the whole interface is not teal-only. New identity/activity accents can use restrained violet, apricot/orange and ochre/yellow containers, with dark readable text and coordinated dark-theme variants. Blue/slate stay structural; teal/amber/red keep their established availability meanings.

Do not use color as a unique identity, verified role or sole cohort label. A cohort mapping is stable and labeled; colors may repeat. Organization tags such as ESN, CC, FF or UAI are later verified-role badges, not freely claimed authority. See the design brief for state/component specifications; exact palette values require contrast validation before production CSS.

## Delivery and completion

Use `main` as production trunk with PR-specific Vercel previews; no permanent `dev` integration branch is required for this work. Dependent tasks can form a native GitHub PR stack, one branch/PR per independently reviewable issue. Same task fixes stay in that PR. Maintainer alone merges. CI must run on every stack base, not only PRs targeting main.

Use synthetic students/cohorts in isolated Supabase previews or local development. Never seed fake users into production, reuse a production service-role credential in the browser, or assume a paid account makes branches free. Confirm entitlement/cost before provisioning. Planning and repository/project automation can be configured now; feature/database implementation follows its tracked issues.

M1 completes when room → start → authorized classmate visibility → correct room ordering → expiry/end works on phone/desktop and EN/DE, remains accessible without the map, passes meaningful tests/typecheck/build, and meets documented request/cost limits. CI success alone does not prove device behavior or privacy. Review is based on this selected flow, not a requirement to compare three different products first.

Supporting detail: [focus behavior](docs/Focus-and-Presence.md), [roadmap](docs/Product-Roadmap.md), [design brief](docs/Design-Session-Brief.md), [operating envelope](docs/Operating-Envelope.md), [delivery conventions](CONTRIBUTING.md). Wiki documentation is a separate Git submodule; the root charter and contribution guide are the reviewable repository entry points.
