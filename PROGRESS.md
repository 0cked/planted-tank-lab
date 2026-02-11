# PROGRESS (Append-only)

This file is an append-only changelog of work completed.

Planning note (2026-02-11): `TODO.md` is deprecated and archived.
If older entries mention `TODO.md`, treat those references as historical only.
Use `AUTOPILOT.md` + `PLAN_EXEC.md` for current execution.

Each work session must add a new dated entry that includes:
- what changed
- what was verified
- what's next (by `PLAN_EXEC.md` task ID)

---

## 2026-02-08

- Work: repo audit + planning-system cleanup started; new Autopilot tracking system added (see `AUTOPILOT.md`).
- Verified: pending (run `pnpm verify` after commits).
- Next: OPS-01..OPS-06 then A-01 (see `TODO.md`).

## 2026-02-08 18:00

- Work: Completed repo operating system (Autopilot tracking + gates dashboard) and archived legacy planning (`3d56cf5`). Added route error boundaries + not-found UX (root + builder/products/plants/builds) and e2e coverage (`e71605f`). Stabilized typecheck by generating typed routes before `tsc` (`ae3f8ea`).
- Verified: `pnpm verify` (lint + typecheck + unit + e2e + build) passed. `pnpm verify:gates` prints gates dashboard.
- Next: A-02, A-03, A-04 (see `TODO.md`).

## 2026-02-08 18:50

- Work: Added baseline security headers via `next.config.ts` (`aa7f24a`).
- Verified: `curl -I http://localhost:3000` shows nosniff/referrer/permissions/x-frame-options in dev. `pnpm verify` passed.
- Next: A-03, A-04, A-05 (see `TODO.md`).

## 2026-02-08 19:10

- Work: Added best-effort rate limiting for `/api/trpc/*` and `/go/*` via `src/proxy.ts` (`0400772`). Added ADR `decisions/0001-rate-limiting-store.md`.
- Verified: `pnpm verify` passed. Manual local loop returned 429s after exceeding the per-minute limit.
- Next: A-04, A-05 (see `TODO.md`).

## 2026-02-08 19:20

- Work: Verified rate limiting in production and marked Gate G6 as PASS in `config/gates.json`.
- Verified: `pnpm verify:gates` prints G6 as PASS.
- Next: A-04, A-05 (see `TODO.md`).

## 2026-02-08 19:40

- Work: Added request IDs and structured server logs for `/api/trpc/*` and `/go/*` (`ed8e558`).
- Verified: `pnpm verify` passed.
- Next: A-05, B-01 (see `TODO.md`).

## 2026-02-09 20:05

- Work: Wired Sentry error reporting for server + client (Next instrumentation hooks + route/global error boundaries) and added ADR 0002 (`621d635`).
- Verified: `pnpm verify` passed (lint + typecheck + unit + e2e + build).
- Next: B-01, B-02, B-03 (see `TODO.md`).

## 2026-02-09 20:55

- Work: Completed B-01 required-specs contracts + missing-data UX. Added `src/engine/required-specs.ts`, surfaced "insufficient data" notes in the engine, and updated builder pickers to distinguish incompatible vs missing-data with a "Show hidden" toggle (`e50f638`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: B-02, B-03, B-04 (see `TODO.md`).

## 2026-02-09 21:25

- Work: Completed B-02 admin categories CRUD + reorder at `/admin/categories` (create, edit, move up/down) and wired builder stepper ordering to follow `categories.display_order` for core/extras grouping (`c27e483`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: B-03, B-04, B-05 (see `TODO.md`).

## 2026-02-09 22:05

- Work: Completed B-03 CSV exports for products/plants/offers via `/admin/exports/*` and added CSV formatting utilities + unit tests (`b37bd37`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: B-04, B-05, C-01 (see `TODO.md`).

## 2026-02-09 22:30

- Work: Completed B-04 audit logging expansion for product + plant save/upload routes (actions now visible in `/admin/logs`) (`7533133`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Next: B-05, C-01, C-02 (see `TODO.md`).

## 2026-02-09 23:00

- Work: Completed B-05 data quality dashboard at `/admin/quality` (curated products missing images/offers/required specs; plants missing images/sources) (`5487f7f`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Next: C-01, C-02, C-03 (see `TODO.md`).

## 2026-02-10

- Work: Updated execution plan to align with the public-launch UX overhaul proposal (Phase A/B/C), with Phase A folded into C-03. Updated `AUTOPILOT.md` + `TODO.md` accordingly.
- Verified: pending (run `pnpm verify` after implementing C-03 changes).
- Next: C-03 (Phase A builder UX: drawer/bottom sheet picker + compatibility-first flow).

## 2026-02-10 20:30

- Work: Completed C-03 Phase A builder UX. Pickers are now a drawer/bottom sheet with sticky search; builder shows a strong “Next recommended” CTA; row actions have correct hover cursor affordances. Updated plant list/detail to use `SmartImage` so remote images never crash Next/Image in production/tests. (`9818700`)
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: C-04, C-05, C-06.

## 2026-02-10 21:15

- Work: Completed C-04 auth entrypoint. Added a prominent top-nav “Sign up” CTA + “Sign in” link (stable, never 404). `/sign-up` and `/sign-in` redirect to `/login` with mode hints. Added friendly error messaging on `/login`. Fixed Google OAuth env on Vercel Production (removed newline from `NEXTAUTH_URL`, set `GOOGLE_CLIENT_SECRET`) and redeployed.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`. Manual: POST to `/api/auth/signin/google` returns Google auth URL.
- Next: C-05, C-06, D-01.

## 2026-02-09

- Work: Completed C-01 curated catalog completeness for core builder categories (tank/light/filter/substrate). Added `scripts/catalog-check.ts` + `pnpm catalog:check`; seeded placeholder `image_url` for curated core items and filled required substrate/filter spec keys for compatibility rules.
- Verified: `pnpm catalog:check`; `pnpm verify`.
- Next: C-02, C-03 (see `TODO.md`).

- Work: Completed C-02 plant content baseline for the top 30 plants in `data/plants.json` by adding missing citations (`sources`) and filling missing `image_url` where absent.
- Verified: spot-check list integrity (first 30 have sources + image_url); `pnpm verify`.
- Next: C-03 (see `TODO.md`).

## 2026-02-09 10:45

- Work: Began C-03 builder UX cleanup:
  - Removed confusing “+ Choose a X” non-clickable label; replaced empty selection state with a clickable “Choose a X” link.
  - Button label logic now uses `hasSelection` instead of string prefix checks.
  - Added stable `data-testid="category-row-*-action"` for the row action button; updated builder Playwright tests.
  - Stabilized local DB usage against Supabase pooler by disabling prepared statements when `DATABASE_URL` is the pooler (`prepare: false`) + conservative pooling.
- Verified: `pnpm verify`.
- Next: continue C-03 (completion panel + offers-empty UX).

## 2026-02-09 12:15

- Work: Daily visual QA walkthrough on plantedtanklab.com (Home → Builder → Products → Plants → Builds → Sign-in).
  Findings:
  - Builder: grammar bug “Choose a Accessories”.
  - Plants: curated list is pitched as image-forward but many cards render without images; plant detail “Photo” section is an empty header.
  - Plant data: enum formatting leak (`Water_column`), and several fields show raw `—` (Origin/Family).
  - Products/hardscape: many items show missing price/offers; detail pages rely on “No offers yet” messaging.
- Verified: manual walkthrough in a fresh browser session.
- Next: fold fixes into C-03 (empty states + copy) and C-06 (images/offers/content completeness).

## 2026-02-09 16:05

- Work: Fixed builder picker dialog title grammar for plural category names (e.g. “Choose Accessories” instead of “Choose a Accessories”) (`5808a1c`).
- Verified: `pnpm verify:gates`; `pnpm test`.
- Next: continue C-03 (completion panel + offers-empty UX + intentional Photo empty states).

## 2026-02-09 21:30

- Work: Completed C-05 shared build snapshot polish:
  - Added active top-nav highlighting via `aria-current="page"` (new `SiteNav` component).
  - Clarified “Open in builder” behavior and added product links on the snapshot page.
  - Updated Playwright smoke tests to cover share → snapshot → open-in-builder flow.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.
- Next: C-06, C-07, D-01.

## 2026-02-09 21:45

- Work: Fixed `pnpm build` failing on `/login` by wrapping `LoginPanel` (uses `useSearchParams`) in a Suspense boundary.
- Verified: `pnpm build`.
- Next: C-06, C-07, D-01.

## 2026-02-09 22:10

- Work: Completed C-06 content + imagery baseline:
  - Plants: filled missing images and sources in `data/plants.json` (added helper scripts to keep this repeatable) and reseeded.
  - Plants detail: made Plant info rows hide missing fields and humanize enum labels (no more `water_column` underscore leak).
  - Products: made category browsing more image-forward and ensured lists/details show a graceful photo fallback when product photos are missing.
- Verified: `pnpm seed`; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: C-07, C-08, D-01.

## 2026-02-09 22:35

- Work: Completed C-07 builder Phase B polish:
  - Picker lists are now more photo-forward with spec chips and clear Fit/Incompatible/Can’t verify badges.
  - Added a “What to fix next” panel to make compatibility feedback actionable (jump-to-step).
  - Made category rows stack cleanly on mobile.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: C-08, D-01, D-02.

## 2026-02-09 22:40

- Work: Completed C-08 browsing polish:
  - Products: category lists now show spec chips (more scannable, hobby-catalog feel).
  - Copy pass: confirmed no internal MVP/seed jargon in customer-facing UI.
  - Hero/CTAs: kept intentional crop/overlay and consistent button hierarchy.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: D-01, D-02, D-03.

## 2026-02-10 01:40

- Work: Completed D-01 consent-respecting analytics/events (minimal):
  - Added `analytics_events` table + migration.
  - Added `/api/analytics/event` (best-effort, no-op without consent).
  - Added client `trackEvent` helper gated by `ptl_cookie_consent=accepted`.
  - Tracked: builder started, share created, signup completed (client-side) when consent is granted.
  - Updated `/go/[offerId]` offer click logging to respect analytics consent.
- Verified: `pnpm verify:gates`, `pnpm typecheck`, `pnpm test`.
- Next: D-02, D-03.

## 2026-02-10 02:20

- Work: Completed D-02 report-a-problem intake:
  - Added `problem_reports` table + migration.
  - Added `/report` form (tRPC `reports.submit`).
  - Added admin triage at `/admin/reports` with resolve/dismiss.
  - Added footer link to "Report a problem".
- Verified: `pnpm verify`.
- Next: D-03, D-04.

## 2026-02-10 04:45

- Work: Completed D-03 terms + copy/legal baseline:
  - Added `/terms` page.
  - Linked Terms in the site footer.
  - Added `/terms` to the sitemap.
- Verified: `pnpm verify`.
- Next: D-04.

## 2026-02-10 08:00

- Work: Started D-04 final QA by running the full automated verification suite on a clean working tree.
- Verified: `pnpm verify` (lint + typecheck + unit tests + e2e smoke + build) **PASS**; `pnpm verify:gates` shows **no FAIL** gates.
- Next: finish D-04 by completing the manual QA + production spot-check checklist in `VERIFY.md` (desktop + mobile), then update `config/gates.json` (set PASS/lastVerifiedAt where applicable).

## 2026-02-10 12:05

- Work: Re-ran D-04 automated go/no-go verification on a clean tree.
- Verified: `pnpm verify` **PASS**; `pnpm verify:gates` shows **no FAIL** gates.
- Next: complete remaining D-04 manual QA checklist (G0/G1/G9 focus) per `VERIFY.md`, then update `config/gates.json` (status + lastVerifiedAt) accordingly.

## 2026-02-10 12:15

- Work: Daily visual QA walkthrough on plantedtanklab.com (Home → Builder → Products → Plants → Builds → Sign-in → Profile).
- Findings (backlog candidates):
  - Product detail specs show raw snake_case labels (e.g. `hardscape_type`, `raises_gh`) instead of human-friendly labels.
  - Hardscape list shows price as `—` for items with no offers; consider a more intentional empty pricing state (“No offers yet”, or hide price column when offer count is 0).
- Verified: primary nav + footer links load; `/profile` unauth state is a clean sign-in prompt.
- Next: continue D-04 manual QA checklist per `VERIFY.md` and update gates timestamps.

## 2026-02-10 13:50

- Work: Reconciled repo architecture + plans for a trust-first ingestion → normalization pipeline (ADR 0003).
  - Updated `AGENTS.md` contract: ingestion/scraping is backend-only; no request-path external fetching; normalization is the only reconciliation layer.
  - Added ingestion foundations to DB schema:
    - `ingestion_sources`, `ingestion_runs`, `ingestion_jobs`, `ingestion_entities`, `ingestion_entity_snapshots`
    - `canonical_entity_mappings`, `normalization_overrides`
  - Generated and applied migration `0009_ingestion_foundation.sql`.
  - Backfilled `drizzle.__drizzle_migrations` with the latest applied migration so `drizzle-kit migrate` can run forward.
  - Implemented backend-only ingestion runner: `pnpm ingest run` (job queue + worker + offer HEAD refresh source).
  - Refactored offer refresh endpoints (admin + cron) to enqueue ingestion jobs (no request-path scraping).
  - Added unit coverage for ingestion offer refresh job processing + provenance rows.
  - Updated docs/gates to use `pnpm drizzle-kit migrate` (avoid interactive `push` drift).
- Verified: `pnpm verify` PASS; `pnpm ingest run --dry-run` works; migrations applied cleanly.
- Next: E-04 (seed/import through ingestion+normalization), then E-05 (canonical mapping/duplicates), then E-06 (cache boundaries + invalidation).

## 2026-02-10 15:54

- Work: Pivoted hosting from Vercel to Fly.io (ADR 0004) by adding container + process-group foundations.
  - Added `Dockerfile`, `.dockerignore`, `fly.toml`.
  - Added long-running ingestion operations:
    - `pnpm ingest daemon` (worker loop)
    - `pnpm ingest schedule --loop` (scheduler loop; enqueues jobs from `ingestion_sources.schedule_every_minutes`)
  - Added `src/server/ingestion/scheduler.ts` and a scheduler unit test.
  - Updated docs and agent contract to reflect Fly.io as the production host (`AGENTS.md`, `README.md`).
  - Hardened CI verification: e2e now runs against a production build (`pnpm test:e2e` builds first; Playwright uses `pnpm start`).
- Verified: `pnpm verify` PASS.
- Next: F-04 deploy to Fly (web + worker + scheduler), then F-05 DNS cutover, then resume E-04 seed-through-ingestion.

## 2026-02-10 16:15

- Work: Added optional GitHub Actions auto-deploy for Fly (`.github/workflows/fly-deploy.yml`) and updated docs/plans to reference `FLY_API_TOKEN`.
- Verified: `pnpm verify` PASS; `docker build -t plantedtanklab .` PASS.
- Next: F-04 (Fly deploy), F-05 (DNS cutover).

## 2026-02-11 22:10

- Work: Consolidated planning system for multi-session agent execution. Archived `TODO.md` and pre-consolidation snapshots to `archive/planning/2026-02-11/`. Rewrote `AUTOPILOT.md` and `PLAN_EXEC.md` around the production data-pipeline track (`IN-*` tasks). Updated `AGENTS.md` + `README.md` to remove deprecated planning references.
- Verified: planning docs now reference a 4-file system (`AUTOPILOT.md`, `PLAN_EXEC.md`, `PROGRESS.md`, `VERIFY.md`) and no active docs require `TODO.md`.
- Next: `IN-01` then `IN-02`.

## 2026-02-11 22:18

- Work: Completed planning-doc consistency sweep after consolidation (active docs + archive notes + AGENTS/README alignment).
- Verified: `pnpm verify:gates`.
- Next: `IN-01`.

## 2026-02-11 22:50

- Work: Started `IN-02` seed-flow refactor so canonical product/plant/offer writes happen via normalization (`src/server/normalization/manual-seed.ts`; `scripts/seed.ts` now routes through ingestion + normalization path).
- Verified:
  - `pnpm test -- tests/server/manual-seed-source.test.ts` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm verify:gates` (PASS)
  - Manual SQL snapshot presence check (manual_seed has product/plant/offer entities with snapshots).
- Blocker: `pnpm seed` is intermittently terminated by external signal in this environment (`SIGKILL` / exit 143), preventing completion of the required `pnpm seed && pnpm seed` idempotency verify loop for `IN-02`.
- Next: continue `IN-02` by rerunning seed verification in a stable session, then mark `IN-02` complete.

## 2026-02-11 23:20

- Work: Completed `IN-02` seed-flow refactor verification closeout and advanced task tracking.
  - Confirmed `scripts/seed.ts` canonical writes for products/plants/offers are routed through `src/server/normalization/manual-seed.ts` (no direct JSON-to-canonical writes for those entities).
  - Confirmed seed run summary includes ingestion + normalization inserted/updated metrics.
  - Updated planning artifacts to move active work from `IN-02` to `IN-03` (`PLAN_EXEC.md`, `AUTOPILOT.md`).
- Verified:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm seed && pnpm seed` (both PASS)
  - Idempotency check from seed summaries remains stable across both runs:
    - categories=12, brands=37, products=134, plants=70, rules=20, retailers=8, offers=102, priceHistory=179
- Next: `IN-03` (ingestion idempotency regression tests).
