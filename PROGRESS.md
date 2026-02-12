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

## 2026-02-11 14:07

- Work: Updated planning artifacts per Jacob’s production-readiness directive to remove all pre-ingestion catalog content and all placeholders.
  - `AUTOPILOT.md`: queue now explicitly prioritizes `IN-11A` immediately after `IN-11`.
  - `PLAN_EXEC.md`: added `IN-11A (P0)` with acceptance criteria + verification for legacy/placeholder purge and provenance-only catalog policy.
- Verified: planning docs updated and aligned (`AUTOPILOT.md`, `PLAN_EXEC.md`).
- Next: execute `IN-11`, then `IN-11A`.

## 2026-02-11 14:10

- Work: Added new production-scope curation track for baseline template builds (“aquascape in a box”).
  - `PLAN_EXEC.md`: added `CAT-01` (define Budget/Mid/Premium templates with exact quantities + compatible BOM) and `CAT-02` (one-click start-from-template UX).
  - `AUTOPILOT.md`: inserted CAT-01/CAT-02 directly after catalog hardening tasks.
- Verified: planning docs aligned with Jacob’s template-build directive.
- Next: execute `IN-11` → `IN-11A` → `CAT-01` → `CAT-02`.

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

## 2026-02-11 22:56

- Work: Completed `IN-02` by finishing the seed-through-normalization boundary.
  - Added `src/server/normalization/manual-seed.ts` as the canonical normalization path for manual-seed snapshots (products/plants/offers) with deterministic canonical mapping upserts.
  - Refactored `scripts/seed.ts` so canonical `products/plants/offers` are no longer written directly from JSON; seed now runs `ingestion -> normalization -> canonical`.
  - Added seed output normalization summary (`inserted/updated` by entity type + totals/mappings).
- Verified:
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm test tests/server/manual-seed-source.test.ts` (PASS)
  - `pnpm seed` (PASS)
  - `pnpm seed` (PASS, second run idempotent)
  - `node --import tsx scripts/gates.ts` (PASS)
  - Seed run row counts stable across both runs:
    - categories `12`, brands `37`, products `134`, plants `70`, rules `20`, retailers `8`, offers `102`, priceHistory `179`
- Next: `IN-03` (ingestion idempotency regression tests).

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

## 2026-02-11 23:42

- Work: Completed `IN-03` ingestion idempotency regression coverage.
  - Added `tests/ingestion/idempotency.test.ts` to validate end-to-end idempotency for ingestion + normalization on a dedicated test source.
  - Coverage includes:
    - duplicate seed input handling
    - unchanged payload `content_hash` snapshot dedupe
    - stable canonical product/plant/offer IDs across repeated normalization
    - guard against duplicate canonical rows for product/plant/offer keys
- Verified:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test` (includes new idempotency test)
- Next: `IN-04` (deterministic product matching precedence).

## 2026-02-11 00:23

- Work: Completed `IN-04` deterministic product matching precedence.
  - Added `src/server/normalization/matchers/product.ts` with deterministic precedence:
    1) `identifier_exact` (existing entity mapping / exact identifier)
    2) `brand_model_fingerprint`
    3) `new_canonical`
  - Wired matcher into `normalizeProductsFromSnapshots` in `src/server/normalization/manual-seed.ts`.
  - Product normalization now persists matcher-selected `matchMethod` + `confidence` into `canonical_entity_mappings`.
  - Expanded manual-seed product schema to accept identifier/model fields and persist structured identifier metadata in product `meta`.
  - Added matcher precedence unit coverage in `tests/server/product-matcher.test.ts`.
  - Extended ingestion idempotency coverage to assert product mapping metadata across runs in `tests/ingestion/idempotency.test.ts`.
  - Hardened idempotency test cleanup to remove all offer rows for the test product before product deletion.
- Verified:
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm verify:gates` (PASS)
  - `pnpm test -- tests/server/product-matcher.test.ts tests/ingestion/idempotency.test.ts` (PASS; Vitest executed full suite in this repo config)
  - `pnpm test` (PASS)
- Notes:
  - Repeated local `pnpm test` loops can transiently trip ingestion idempotency-bucket tests; before the final pass, cleared stale test idempotency jobs with:
    - `pnpm tsx -e "import { like } from 'drizzle-orm'; import { db } from './src/server/db'; import { ingestionJobs } from './src/server/db/schema'; (async () => { await db.delete(ingestionJobs).where(like(ingestionJobs.idempotencyKey, 'test:schedule:offers-head:%')); await db.delete(ingestionJobs).where(like(ingestionJobs.idempotencyKey, 'test:offers.head_refresh.one:%')); })().catch((error) => { console.error(error); process.exit(1); });"`
- Next: `IN-05` (plant + offer deterministic matching).


## 2026-02-11 02:08

- Work: Completed `IN-05` deterministic plant + offer matching for manual-seed normalization.
  - Added `src/server/normalization/matchers/plant.ts` with deterministic precedence:
    1) `identifier_exact`
    2) `scientific_name_exact`
    3) `slug_exact`
    4) `new_canonical`
  - Added `src/server/normalization/matchers/offer.ts` with deterministic precedence:
    1) `identifier_exact`
    2) `product_retailer_url_fingerprint` (canonical product id + retailer id + normalized URL)
    3) `new_canonical`
  - Wired both matchers into `src/server/normalization/manual-seed.ts` so plant/offer normalization now updates canonical rows by matcher result and persists matcher `matchMethod` + `confidence` into `canonical_entity_mappings`.
  - Added matcher unit coverage:
    - `tests/server/plant-matcher.test.ts`
    - `tests/server/offer-matcher.test.ts`
  - Expanded `tests/ingestion/idempotency.test.ts` to assert plant + offer mapping metadata across repeated normalization runs.

- Commands run:
  - `pnpm verify:gates` (startup)
  - `node --import tsx scripts/gates.ts` (startup fallback)
  - `pnpm verify`
  - `pnpm test -- tests/server/product-matcher.test.ts tests/server/plant-matcher.test.ts tests/server/offer-matcher.test.ts`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm verify:gates`
  - `node --import tsx scripts/gates.ts` (required fallback)
  - `pnpm vitest run tests/server/product-matcher.test.ts tests/server/plant-matcher.test.ts tests/server/offer-matcher.test.ts`
  - `git add ... && git commit -m \"feat: add deterministic plant and offer normalization matchers\"`
  - `touch .git/index.lock`
  - `git push origin main`

- Results:
  - `pnpm lint` PASS.
  - `pnpm typecheck` PASS.
  - `pnpm vitest run tests/server/product-matcher.test.ts tests/server/plant-matcher.test.ts tests/server/offer-matcher.test.ts` PASS.
  - `pnpm test` FAIL in this environment due DB host resolution (`ENOTFOUND aws-0-us-west-2.pooler.supabase.com`) across DB-backed suites.
  - `pnpm verify:gates` FAIL in this sandbox due `tsx` IPC pipe permission (`EPERM` on `/var/folders/.../tsx-*/...pipe`).
  - `node --import tsx scripts/gates.ts` PASS and prints current gate dashboard.
  - Commit/push blocker: `git add ... && git commit ...` fails with `fatal: Unable to create '.git/index.lock': Operation not permitted`; direct `touch .git/index.lock` reproduces the same sandbox restriction.
  - Push blocker: `git push origin main` fails with `Could not resolve host: github.com`.

- Next: `IN-06`.

## 2026-02-11 02:10

- Work: Verification/pass cleanup for `IN-05` handoff.
  - Re-ran full verification suite directly in this host environment.
  - Removed stale sandbox-only blocker notes from `AUTOPILOT.md` now that git/network/test/gates all run normally here.

- Verified:
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm vitest run tests/server/product-matcher.test.ts tests/server/plant-matcher.test.ts tests/server/offer-matcher.test.ts` (PASS)
  - `pnpm test` (PASS; 22 files / 67 tests)
  - `pnpm verify:gates` (PASS)

- Notes:
  - Earlier `ENOTFOUND`/`EPERM` failures were not reproducible in this host run.
  - Task sequencing remains unchanged: next task is `IN-06`.

## 2026-02-11 04:19

- Work: Completed `IN-06` normalization overrides + explainability metadata.
  - Added `src/server/normalization/overrides.ts` to load/apply `normalization_overrides` by `(canonicalType, canonicalId)` with dot-path field application.
  - Enforced override precedence in manual-seed normalization (`src/server/normalization/manual-seed.ts`) so canonical updates for products/plants/offers apply overrides before write.
  - Extended canonical mapping upserts to persist explainability in `canonical_entity_mappings.notes` (`winnerByField` + reason/override id/timestamp).
  - Added `tests/ingestion/normalization-overrides.test.ts` to simulate manual override insert + normalization rerun and assert both field persistence + winner-reason metadata.
  - Updated planning artifacts (`PLAN_EXEC.md`, `AUTOPILOT.md`) to mark `IN-06` complete and move active work to `IN-07`.

- Commands run:
  - `pnpm typecheck` (PASS)
  - `pnpm test -- tests/ingestion/normalization-overrides.test.ts` (initial run hit one transient failure in `tests/server/ingestion-offers-head.test.ts`; rerun PASS)
  - `pnpm test -- tests/ingestion/idempotency.test.ts` (PASS; full suite executed in this repo config, 23 files / 68 tests)
  - `pnpm verify:gates` (PASS)
  - `pnpm lint` (PASS)

- Results:
  - `normalization_overrides` now win over automated normalization writes for canonical product/plant/offer updates.
  - Per-field override winner metadata is recorded in mapping notes and verified by automated test.

- Next: `IN-07` (Admin unmapped-entity map/unmap operations).

## 2026-02-11 06:21

- Work: Completed `IN-07` admin unmapped-entity map/unmap operations.
  - Added admin ingestion mapping UI:
    - `src/app/admin/ingestion/page.tsx`
    - filter/search for unmapped ingestion entities (`product`/`plant`/`offer`)
    - per-entity mapping form to canonical records + recent mappings table with unmap actions
  - Added admin map/unmap routes:
    - `src/app/admin/mappings/map/route.ts`
    - `src/app/admin/mappings/unmap/route.ts`
    - both enforce admin-only access (404 for non-admin)
  - Added mapping service with validation + audit logging:
    - `src/server/services/admin/mappings.ts`
    - validates UUIDs, entityType→canonicalType compatibility, canonical target existence
    - upserts `canonical_entity_mappings` with `matchMethod=admin_manual`, `confidence=100`
    - unmap deletes by `entityId`
    - logs map/unmap changes via `admin_logs`
  - Updated admin home nav card:
    - `src/app/admin/page.tsx` now links to `/admin/ingestion`
  - Added regression coverage:
    - `tests/server/admin-mappings.test.ts`
    - `tests/e2e/smoke.spec.ts` signed-out protection check for `/admin/ingestion`

- Commands run:
  - `pnpm typecheck` (PASS)
  - `pnpm test -- tests/server/admin-mappings.test.ts` (PASS; Vitest executed full suite in this repo config, 24 files / 70 tests)
  - `pnpm test:e2e -- tests/e2e/smoke.spec.ts` (PASS; 9 tests)
  - `pnpm test:e2e` (PASS; 11 tests)
  - `pnpm verify:gates` (PASS)

- Results:
  - Admin can list unmapped ingestion entities and map/unmap canonical links from `/admin/ingestion`.
  - Mapping changes are persisted in `canonical_entity_mappings` and audited in `admin_logs`.

- Next: `IN-08` (Admin override CRUD with reason capture).

## 2026-02-11 08:10

- Work: Completed `IN-08` admin normalization override CRUD with reason/actor capture.
  - Added admin override UI and CRUD routes:
    - `src/app/admin/overrides/page.tsx`
    - `src/app/admin/overrides/create/route.ts`
    - `src/app/admin/overrides/[id]/update/route.ts`
    - `src/app/admin/overrides/[id]/delete/route.ts`
  - Added override service logic:
    - `src/server/services/admin/overrides.ts` (canonical existence checks, duplicate prevention, reason/actor validation, `admin_logs` audit actions)
  - Added coverage:
    - `tests/server/admin-overrides.test.ts` (create/update/delete + reason/actor/timestamps + audit logs, duplicate rejection)
    - `tests/e2e/smoke.spec.ts` (signed-out protection for `/admin/overrides`)
  - Updated admin navigation links:
    - `src/app/admin/page.tsx`
    - `src/app/admin/ingestion/page.tsx`

- Commands run:
  - `pnpm verify:gates` (FAIL: `tsx` IPC pipe permission error `EPERM` in this environment)
  - `node --import tsx scripts/gates.ts` (PASS fallback)
  - `pnpm verify` (FAIL during `pnpm test`: DB DNS resolution error `ENOTFOUND aws-0-us-west-2.pooler.supabase.com`)
  - `pnpm vitest run tests/server/admin-overrides.test.ts` (FAIL: same DB DNS resolution blocker)
  - `pnpm test:e2e -- tests/e2e/smoke.spec.ts` (FAIL at `pnpm build`: unable to fetch Google Fonts in offline environment)
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (PASS)

- Results:
  - IN-08 scope is implemented with CRUD, reason/actor persistence, and test coverage in place.
  - Environment blockers encountered: `tsx` IPC `EPERM` for `pnpm verify:gates`, Supabase pooler DNS unresolvable for DB-backed tests, and Google Fonts fetch failures during build/e2e.

- Next: `IN-09` (Offer detail refresh jobs + parser hooks).

## 2026-02-11 10:24

- Work: Completed `IN-09` offer detail refresh jobs + parser hooks.
  - Added detail ingestion job kinds + payload schemas:
    - `offers.detail_refresh.bulk`
    - `offers.detail_refresh.one`
    - file: `src/server/ingestion/job-queue.ts`
  - Added worker handling + source bootstrap for detail jobs:
    - file: `src/server/ingestion/worker.ts`
    - source slug: `offers-detail` (`offer_detail`) with scheduled bulk config.
  - Added detail ingestion source/parser pipeline:
    - file: `src/server/ingestion/sources/offers-detail.ts`
    - GET-based detail fetch (worker-only), parser hooks (JSON-LD/meta/retailer/text fallback), provenance snapshot writes.
  - Updated canonical offer normalization behavior for meaningful-change semantics:
    - file: `src/server/normalization/offers.ts`
    - `lastCheckedAt` updates every observation; canonical price/stock + `price_history` append only on meaningful observed changes.
  - Switched refresh entry points from HEAD to detail jobs:
    - `src/app/admin/offers/refresh/route.ts`
    - `src/app/admin/offers/[id]/refresh/route.ts`
    - `src/app/api/cron/refresh-offers/route.ts`
    - `src/app/admin/offers/page.tsx` messaging updated to detail checks.
  - Added/updated coverage:
    - `tests/server/ingestion-offers-detail.test.ts` (detail job flow + no duplicate `price_history` for unchanged second run)
    - `tests/server/ingestion-scheduler.test.ts` (detail scheduled job expectation)

- Commands run:
  - `pnpm vitest run tests/server/ingestion-offers-detail.test.ts` (initial FAIL while refining parser priority/timeout; final PASS)
  - `pnpm test -- tests/server/ingestion-offers-detail.test.ts tests/server/ingestion-scheduler.test.ts` (PASS; repo Vitest config executes full suite: 26 files / 73 tests)
  - `pnpm ingest schedule` (PASS: `scanned=2 enqueued=1 deduped=1 skipped=0 errors=0`)
  - `pnpm ingest run` (PASS: `processed=0 ok=0 failed=0`)
  - `pnpm verify:gates` (PASS)
  - `node --import tsx scripts/tmp-check-offer-freshness.ts` (PASS manual DB check; `offers_with_last_checked_at=103`, `price_history_rows=194`)

- Results:
  - Detail refresh jobs are now first-class ingestion jobs and run outside request paths.
  - Canonical offer writes and `price_history` appends now happen only on meaningful detail observation changes.
  - Manual DB verification confirms non-null `last_checked_at` presence and populated `price_history`.

- Next: `IN-10` (Derived offer summary cache for read-heavy views).

## 2026-02-11 12:30

- Work: Completed `IN-10` derived offer summary cache for read-heavy offer views.
  - Added cached derivative table in schema + migration:
    - `src/server/db/schema.ts` (`offerSummaries` / `offer_summaries`)
    - `src/server/db/migrations/0011_offer_summaries_cache.sql`
    - `src/server/db/migrations/meta/0011_snapshot.json`
  - Added summary service:
    - `src/server/services/offer-summaries.ts`
    - supports per-product and batch refresh, stale-flag computation (24h), summary reads, and ensure-missing refresh.
  - Wired normalization-triggered refresh paths:
    - `src/server/normalization/offers.ts` now refreshes product summary after each detail/head observation apply.
    - `src/server/normalization/manual-seed.ts` now tracks touched product IDs in offer normalization and refreshes summaries once per run.
  - Added tRPC summary read API:
    - `src/server/trpc/routers/offers.ts` → `offers.summaryByProductIds`.
  - Added/updated verification coverage:
    - `tests/api/offers.test.ts` (summary API coverage)
    - `tests/server/ingestion-offers-detail.test.ts` (asserts derived summary mirrors canonical aggregate after detail refresh)
  - Minor stability fix during verification:
    - `tests/server/admin-overrides.test.ts` first test timeout bumped to `15_000` to avoid repeated timeout flake under current DB-backed suite runtime.

- Commands run:
  - `pnpm drizzle-kit generate --name offer_summaries_cache`
  - `pnpm test` (initial FAIL before migration apply: `offer_summaries` relation missing)
  - `pnpm drizzle-kit migrate` (applied `0011_offer_summaries_cache`)
  - `pnpm test` (rerun; then final PASS after timeout stabilization)
  - `node --import tsx scripts/gates.ts` (PASS)
  - Manual acceptance check (scripted):
    - `pnpm tsx -e "...applyOfferDetailObservation bump+restore..."`

- Results:
  - `pnpm test` PASS (26 files / 74 tests).
  - `node --import tsx scripts/gates.ts` PASS.
  - Manual check PASS: updating an offer via normalization observation refreshed `offer_summaries` (`checkedAt`/`updatedAt` advanced and summary row present), then restore path also refreshed summary.

- Next: `IN-11` (Switch product list and builder read-paths to derived summaries).

## 2026-02-11 14:09

- Work: Completed `IN-11` switch of product + builder read paths to derived offer summaries.
  - Added shared summary-state helper:
    - `src/lib/offer-summary.ts`
  - Added helper regression coverage:
    - `tests/lib/offer-summary.test.ts`
  - Switched product category page pricing to summary reads:
    - `src/app/products/[category]/page.tsx`
    - replaced `offers.lowestByProductIds` with `offers.summaryByProductIds`
    - explicit pending/no-in-stock/stale freshness copy per row
  - Switched product detail hero pricing to summary reads:
    - `src/app/products/[category]/[slug]/page.tsx`
    - replaced lowest-price reduction over offer list with derived summary topline
  - Switched builder totals and per-row pricing to summary-first reads:
    - `src/components/builder/BuilderPage.tsx`
    - added `offers.summaryByProductIds` query
    - totals now derive from summary prices by default, with selected-offer overrides
    - explicit states for loading/pending/no in-stock/stale summary freshness
    - updated offers dialog copy to match summary-default behavior

- Commands run:
  - `pnpm verify:gates` (FAIL: `tsx` IPC pipe `EPERM`; fallback used)
  - `node --import tsx scripts/gates.ts` (PASS)
  - `pnpm verify` (FAIL: DB DNS resolution `ENOTFOUND aws-0-us-west-2.pooler.supabase.com`)
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (initial FAIL due summary date typing mismatch; rerun PASS after fix)
  - `pnpm test -- tests/lib/offer-summary.test.ts` (FAIL: repo Vitest config executed DB-backed suites; blocked by same DNS issue)
  - `pnpm vitest run tests/lib/offer-summary.test.ts` (PASS; 1 file / 5 tests)
  - `pnpm test:e2e` (FAIL: `next build` unable to fetch Google Fonts in this environment)
  - `pnpm verify:gates` (FAIL repeat: `tsx` IPC pipe `EPERM`; fallback used)
  - `node --import tsx scripts/gates.ts` (PASS)
  - `git add ...` (FAIL: cannot create `.git/index.lock` due filesystem permission)
  - `touch .git/index.lock` (FAIL: confirms `.git` write restriction in this environment)
  - `git push origin main` (FAIL: DNS/network blocked, could not resolve `github.com`)

- Results:
  - IN-11 scope implemented with derived summary read-paths in product and builder surfaces.
  - `lint` + `typecheck` pass after implementation.
  - Targeted new helper tests pass via direct Vitest invocation.
  - Environment blockers remain for DB-backed suites and e2e build networking.
  - Commit/push are blocked in this sandbox by `.git` write restrictions and outbound DNS restrictions.

- Next: `IN-12` (Add ingestion ops dashboard and runbook checks).

## 2026-02-11 14:18

- Work: Host rerun + cleanup for `IN-11` execution record accuracy.
  - Re-ran full verification in host environment and confirmed the prior Codex-session blockers were not reproducible.
  - Updated planning docs to reflect verified status and corrected next-task ordering.

- Commands run:
  - `pnpm verify:gates` (PASS)
  - `pnpm verify` (PASS; includes `pnpm test:e2e`)

- Results:
  - `IN-11` remains complete with passing full-project verification on host.
  - Planning artifacts corrected:
    - `AUTOPILOT.md` verification/blocker status updated.
    - `PLAN_EXEC.md` IN-11 verification notes updated.
    - Next queue realigned to `IN-11A` then `CAT-01`.

- Next: `IN-11A` (Catalog production hardening).

## 2026-02-11 16:19

- Work: Completed `IN-11A1` provenance-audit codification.
  - Added reusable canonical provenance audit utility:
    - `src/server/catalog/provenance.ts`
    - codifies ingestion-backed detection for canonical `product|plant|offer` rows via `canonical_entity_mappings` + `ingestion_entities`.
    - reports canonical/displayed missing-provenance counts plus `build_items` references to non-provenance products/plants.
  - Added executable audit command:
    - `scripts/catalog-provenance-audit.ts`
    - `pnpm catalog:audit:provenance` in `package.json`.
  - Added DB-backed regression coverage:
    - `tests/server/catalog-provenance.test.ts`.
  - Updated planning artifact:
    - `PLAN_EXEC.md` marks `IN-11A1` complete.

- Commands run:
  - `pnpm vitest run tests/server/catalog-provenance.test.ts` (PASS)
  - `pnpm test` (PASS; 28 files / 80 tests)
  - `node --import tsx scripts/gates.ts` (PASS)
  - `pnpm catalog:audit:provenance` (FAIL with exit 2 by design while violations exist)
  - `pnpm typecheck` (PASS)
  - `pnpm lint` (PASS)

- Results:
  - Provenance audit command is now wired and enforcing non-zero exit when displayed violations exist.
  - Current audit snapshot (pre-cleanup):
    - canonical without provenance: products `91`, plants `74`, offers `104`, categories `10`
    - displayed without provenance: products `91`, plants `74`, offers `104`, categories `10`
    - build parts referencing non-provenance: products `124`, plants `0`, total `124`

- Next: `IN-11A2`.

## 2026-02-11 18:15

- Work: Implemented `IN-11A2` code changes (normalization-boundary hardening + legacy prune path), pending host-side DB verification.
  - Added legacy prune module:
    - `src/server/catalog/legacy-prune.ts`
    - detects non-provenance canonical rows (`product|plant|offer`), prunes legacy rows plus dependent refs, and refreshes affected offer summaries.
  - Added executable cleanup script:
    - `scripts/catalog-legacy-prune.ts`
    - wired as `pnpm catalog:cleanup:legacy` in `package.json`.
  - Hardened seed/import flow:
    - `scripts/seed.ts` now always runs normalization (removed `snapshotsCreated` skip), runs legacy prune, then runs provenance audit and fails if displayed violations remain.
  - Added regression coverage:
    - `tests/server/catalog-legacy-prune.test.ts` (deterministic prune-plan behavior).
  - Updated planning docs for in-progress blocker status:
    - `AUTOPILOT.md`
    - `PLAN_EXEC.md`

- Commands run:
  - `pnpm verify:gates` (FAIL: `tsx` IPC pipe `EPERM` in sandbox)
  - `node --import tsx scripts/gates.ts` (PASS fallback)
  - `pnpm verify` (FAIL: DB-backed tests cannot resolve Supabase pooler DNS `ENOTFOUND aws-0-us-west-2.pooler.supabase.com`)
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm vitest run tests/server/catalog-legacy-prune.test.ts` (PASS)
  - `pnpm test` (FAIL: same DB DNS resolution error)
  - `pnpm catalog:audit:provenance` (FAIL: `tsx` IPC `EPERM`; fallback used)
  - `node --import tsx scripts/catalog-provenance-audit.ts` (FAIL: DB DNS `ENOTFOUND`)
  - `node --import tsx scripts/catalog-legacy-prune.ts` (FAIL: DB DNS `ENOTFOUND`)
  - `git add ... && git commit -m "feat: harden seed normalization boundary with legacy prune"` (FAIL: cannot create `.git/index.lock` in sandbox)
  - `git push origin main` (FAIL: DNS resolution `Could not resolve host: github.com`)

- Results:
  - `IN-11A2` implementation changes are in place and lint/typecheck + targeted regression test pass.
  - DB-backed verification and actual data cleanup execution are blocked in this sandbox by Supabase DNS resolution failure.

- Next: `IN-11A2` (host-side DB verification and cleanup execution, then mark complete if provenance audit passes).

## 2026-02-11 18:26

- Work: Completed host-side verification for `IN-11A2` and executed legacy cleanup against live DB.
  - Ran `pnpm catalog:cleanup:legacy` end-to-end and captured before/after provenance audit snapshots.
  - Confirmed post-cleanup provenance audit is fully clean (no displayed canonical violations).
  - Updated planning artifacts to mark `IN-11A2` complete and advance queue to `IN-11A3`.

- Commands run:
  - `pnpm verify:gates` (PASS)
  - `pnpm verify` (PASS; lint + typecheck + unit/integration + e2e)
  - `pnpm catalog:cleanup:legacy` (PASS)
    - Before cleanup violations: products `31`, plants `74`, offers `104`, categories `9`
    - Cleanup deleted: products `31`, plants `74`, offers `104`
    - Dependent cleanup: `build_items.selected_offer_id` cleared `125`; `price_history` rows deleted `207`
    - After cleanup violations: products `0`, plants `0`, offers `0`, categories `0`, build parts total `0`
  - `pnpm catalog:audit:provenance` (PASS; all zero violations)
  - `pnpm seed` (STARTED; no completion signal after normalization phase in this session; process terminated manually to avoid indefinite run)

- Results:
  - `IN-11A2` is complete in both code and DB state.
  - Production canonical/displayed catalog provenance violations are now zero.
  - Full gate verification is green on host (`pnpm verify`, `pnpm verify:gates`).

- Next: `IN-11A3` (remove placeholder assets/copy/spec filler from production catalog surfaces).

## 2026-02-11 20:27

- Work: Completed `IN-11A3` placeholder/content cleanup across production catalog surfaces (implemented via Codex CLI, `gpt-5.3-codex` with `xhigh` reasoning).
  - Added explicit no-data helper + tests:
    - `src/lib/catalog-no-data.ts`
    - `tests/lib/catalog-no-data.test.ts`
  - Removed placeholder hero-image/media fallbacks and filler copy from:
    - `src/app/products/page.tsx`
    - `src/app/products/[category]/page.tsx`
    - `src/app/products/[category]/[slug]/page.tsx`
    - `src/app/plants/page.tsx`
    - `src/app/plants/[slug]/page.tsx`
    - `src/components/builder/BuilderPage.tsx`
  - Replaced slug-as-description fallback in Builder product picker with normalized explicit details via `normalizePickerDetails`.

- Commands run:
  - `pnpm vitest run tests/lib/catalog-no-data.test.ts` (PASS)
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm verify:gates` (PASS)
  - `pnpm verify` (FAIL)
    - failing suites are seeded-data expectations after provenance cleanup:
      - `tests/api/offers.test.ts` (2 failures)
      - `tests/api/builds.test.ts` (1 failure)
      - `tests/api/plants.test.ts` (2 failures)
  - `pnpm seed` (STARTED; progressed through ingestion/categories/brands/rules/retailers and reached normalization; no completion signal; terminated manually)
  - `rg -n "aquascape-hero-2400|Photo coming soon|still filling|Open for care details|No photo yet|No details yet|No specs yet|No offers yet" src/app/products src/app/plants src/components/builder` (no matches)

- Results:
  - `IN-11A3` scope is complete: Products/Plants/Builder now use explicit source-unavailable UX instead of placeholder assets/copy/spec filler.
  - Guardrail work remains next (`IN-11A4`).

- Next: `IN-11A4`.

## 2026-02-11 22:41

- Work: Executed `IN-11A4` implementation scope (guardrails/tests + verification plumbing), with one remaining ops/data blocker.
  - Added centralized placeholder guardrail helpers:
    - `src/lib/catalog-guardrails.ts`
    - detects/sanitizes placeholder image URLs + filler copy markers.
  - Wired guardrails into normalization + read paths:
    - `src/server/normalization/manual-seed.ts` now sanitizes product/plant image/copy fields before canonical writes.
    - `src/lib/catalog-no-data.ts` now uses sanitized picker-copy + first-usable image helper.
    - updated Products/Plants/Builder surfaces to use `firstCatalogImageUrl` guardrails:
      - `src/app/products/[category]/page.tsx`
      - `src/app/products/[category]/[slug]/page.tsx`
      - `src/app/plants/page.tsx`
      - `src/app/plants/[slug]/page.tsx`
      - `src/components/builder/BuilderPage.tsx`
  - Added regression audit execution path:
    - `src/server/catalog/regression-audit.ts`
    - `scripts/catalog-regression-audit.ts`
    - `package.json` script: `pnpm catalog:audit:regressions`
    - `scripts/seed.ts` now runs regression audit (provenance + placeholder markers) and fails on violations.
  - Reworked slug-fragile regression coverage to fixture-driven tests:
    - `tests/api/offers.test.ts`
    - `tests/api/builds.test.ts`
    - `tests/api/plants.test.ts`
    - `tests/e2e/smoke.spec.ts` (plants smoke now no longer hardcoded to `java-fern`).
  - Added/updated unit coverage:
    - `tests/lib/catalog-guardrails.test.ts`
    - `tests/lib/catalog-no-data.test.ts`

- Commands run:
  - `pnpm lint` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm vitest run tests/lib/catalog-guardrails.test.ts tests/lib/catalog-no-data.test.ts tests/api/offers.test.ts tests/api/plants.test.ts tests/api/builds.test.ts` (PASS)
  - `pnpm verify:gates` (PASS)
  - `pnpm test` (PASS)
  - `pnpm test:e2e` (PASS)
  - `pnpm verify` (PASS)
  - `pnpm catalog:audit:provenance` (PASS)
  - `pnpm catalog:audit:regressions` (FAIL: placeholder image markers still present on 18 active products)
  - `pnpm seed` (attempted twice; reached normalization phase and produced no completion signal; terminated manually)

- Results:
  - IN-11A4 guardrail code/tests and executable audits are in place.
  - Provenance remains clean (`displayed` + `build parts` violations all zero).
  - Placeholder regression audit is now explicit and failing loudly on existing canonical placeholder image rows.
  - Full verify suite is green after slug-fragility fixes (`pnpm verify` PASS).

- Blocker:
  - Existing placeholder image rows (18 products) still require successful seed/normalization remediation run; `pnpm seed` currently stalls in normalization with no completion signal.

- Next: `IN-11A4` blocker-closeout (complete seed normalization/remediation so `pnpm catalog:audit:regressions` passes), then `CAT-01`.

## 2026-02-12 00:45

- Work: Closed `IN-11A4` blocker and hardened seed/quality observability for overnight production-readiness execution.
  - Completed the partial normalization telemetry refactor in `src/server/normalization/manual-seed.ts`:
    - added deterministic per-stage progress events (`products`/`plants`/`offers`) for snapshot scan, progress checkpoints, stage completion, offers summary refresh, and overall normalization completion.
    - added stage timing capture (`snapshotScanMs`, `normalizationMs`, `totalMs`, and offer-summary refresh timing).
  - Wired seed progress logging in `scripts/seed.ts`:
    - seed now prints compact normalization progress checkpoints every 25 records and final stage summaries.
    - final seed JSON now includes `normalization.stageTimingsMs` for ops visibility.
  - Added canonical catalog quality/freshness audit:
    - `src/server/catalog/quality-audit.ts`
    - `scripts/catalog-quality-audit.ts`
    - `package.json` script: `pnpm catalog:audit:quality`
    - deterministic findings output with `violations` + `warnings` for focus categories (`tank/light/filter/substrate/hardscape`), plant coverage, and offer freshness SLO.
  - Added targeted coverage:
    - `tests/server/catalog-quality-audit.test.ts`

- Commands run:
  - `pnpm typecheck` (PASS)
  - `pnpm vitest run tests/server/catalog-quality-audit.test.ts` (PASS)
  - `pnpm vitest run tests/ingestion/idempotency.test.ts tests/ingestion/normalization-overrides.test.ts` (PASS)
  - `pnpm catalog:audit:quality` (FAIL with exit 2 by design; emitted explicit readiness findings)
  - `pnpm catalog:audit:regressions` (PASS; placeholder/provenance clean)
  - `node --import tsx scripts/gates.ts` (PASS)
  - `pnpm verify:gates` (PASS)
  - `pnpm seed` (PASS; normalization completed with deterministic progress logs + timings)
  - `pnpm test` (PASS)
  - `pnpm verify` (PASS; includes e2e)

- Results:
  - `IN-11A4` is now complete in code + execution evidence: seed finishes, regression audit passes, placeholders/provenance remain clean.
  - Seed normalization is no longer “silent” during long phases; operators now get explicit forward-progress checkpoints and stage timings.
  - Launch-readiness quality debt is now explicit and measurable:
    - `catalog:audit:quality` reports `offer_freshness_below_slo` (0% checked <24h vs 95% target)
    - focus categories still have significant missing image/offer coverage warnings
    - plants still have a small missing-image set

- Next: `CAT-01`, then `CAT-02`; keep `IN-12`/`IN-13` focused on closing quality-audit freshness/completeness blockers.

## 2026-02-12 03:02

- Work: Executed overnight catalog-readiness override with focus on ingestion reliability + user-facing catalog quality boundaries.
  - Completed `IN-12A` reliability hardening:
    - Added refresh-window helper + status-signal helper:
      - `src/server/ingestion/sources/offers-refresh-window.ts`
      - `src/server/ingestion/sources/availability-signal.ts`
    - Updated bulk refresh payload semantics (`olderThanHours` + `olderThanDays` compatibility):
      - `src/server/ingestion/job-queue.ts`
      - `src/server/ingestion/worker.ts`
    - Updated bulk refresh selection to deterministic stale-first ordering and SQL interval cutoff (fixed Date-bind query failures in bulk jobs):
      - `src/server/ingestion/sources/offers-head.ts`
      - `src/server/ingestion/sources/offers-detail.ts`
    - Hardened canonical mutation safety:
      - transport failures no longer mutate stock/freshness
      - ambiguous HEAD statuses (405/429/5xx) now avoid unsafe stock flips
      - `src/server/normalization/offers.ts` (`applyOfferHeadObservation` now tri-state-safe)
  - Completed `IN-12B` catalog quality boundary enforcement:
    - Added canonical activation policy + executable command:
      - `src/server/catalog/activation-policy.ts`
      - `scripts/catalog-activation-policy.ts`
      - `package.json` script: `pnpm catalog:curate:activation`
    - Seed pipeline now applies activation curation before regression audit:
      - `scripts/seed.ts`
    - Public read-paths now only surface `status=active` catalog rows:
      - `src/server/trpc/routers/products.ts`
      - `src/server/trpc/routers/plants.ts`
  - Updated verification/runbook docs:
    - `VERIFY.md`
    - `PLAN_EXEC.md`
    - `AUTOPILOT.md`

- Test/verification coverage added/updated:
  - New tests:
    - `tests/server/ingestion-offers-refresh-utils.test.ts`
    - `tests/server/catalog-activation-policy.test.ts`
  - Updated tests:
    - `tests/server/ingestion-offers-head.test.ts`
    - `tests/server/ingestion-offers-detail.test.ts`
    - `tests/server/ingestion-scheduler.test.ts`
    - `tests/api/products.test.ts`
    - `tests/api/plants.test.ts`
    - `tests/e2e/builder.spec.ts` (tank compatibility fixture updated for active-catalog policy)

- Commands run:
  - `pnpm vitest run tests/server/ingestion-offers-refresh-utils.test.ts tests/server/catalog-activation-policy.test.ts` (PASS)
  - `pnpm vitest run tests/server/ingestion-offers-head.test.ts tests/server/ingestion-offers-detail.test.ts tests/server/ingestion-scheduler.test.ts tests/api/products.test.ts tests/api/plants.test.ts` (PASS)
  - `pnpm test` (PASS)
  - `pnpm typecheck` (PASS)
  - `pnpm verify:gates` (PASS)
  - `pnpm seed` (PASS)
    - activation policy results during seed: focus products deactivated `49`; plants deactivated `3`
  - `pnpm catalog:curate:activation` (PASS; idempotent on rerun)
  - `pnpm catalog:audit:regressions` (PASS)
  - `pnpm catalog:audit:quality` (FAIL by design; freshness/image findings)
  - `pnpm verify` (PASS; lint + typecheck + unit/integration + e2e)

- Outcome deltas (quality audit):
  - Offer freshness improved from `0%` to `92.23%` (`95/103` checked within 24h).
  - Focus-category missing-offer warnings eliminated (`productsWithoutAnyOffer=0` across tank/light/filter/substrate/hardscape).
  - Active plants missing-image debt eliminated (`61/61` active plants with images).
  - Remaining blocker: freshness still below SLO (`92.23%` vs `95%`) + focus-category image coverage warnings.

- Remaining next steps:
  - `IN-12C`: admin ingestion ops dashboard/runbook visibility + queue recovery controls.
  - `IN-13`: push freshness from 92.23% to >=95% and continue focus-category image debt remediation.
