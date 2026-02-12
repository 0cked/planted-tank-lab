# PLAN_EXEC - Agent-Executable Checklist (Authoritative)

This is the executable implementation checklist.
Use it as the source of truth for what is done, in progress, and next.

## Execution Rules

- Work strictly top-to-bottom by unchecked task.
- Every task must include code changes + verification evidence.
- Mark a task `[x]` only after acceptance criteria and verify steps pass.
- If scope changes, update this file first.

## Completed Baseline (Context)

- [x] BASE-01 Fly.io web deployment + Cloudflare DNS cutover.
- [x] BASE-02 Auth baseline (Google + email magic links via Resend).
- [x] BASE-03 Ingestion foundation tables + worker/scheduler/job queue.
- [x] BASE-04 Request-path fetch removal for ingestion operations.
- [x] BASE-05 Supabase RLS hardening migration applied (`0010_enable_rls`).

---

## Track IN - Production-Grade Data Pipeline (Top Priority #1)

Goal: all catalog and offer data used by product/builder pages must flow through:

`ingestion -> normalization -> canonical tables -> cached derivatives -> presentation`

No direct canonical bypass for import/seed paths.

### Phase ING-1: Seed/Import Through Ingestion

- [x] IN-01 (P0) Add manual-seed ingestion source adapter and entity snapshot writer.
  - Gates: G4, G9
  - Acceptance:
    - `manual_seed` source is upserted in `ingestion_sources`.
    - Seeded records create `ingestion_entities` + `ingestion_entity_snapshots` with stable `content_hash`.
    - Snapshot payload includes per-field trust/provenance structure.
  - Verify:
    - `pnpm seed`
    - SQL check: seeded product/plant/offer each has at least one snapshot row.
  - Dependencies: none
  - Entry points:
    - `src/server/ingestion/sources/manual-seed.ts`
    - `scripts/seed.ts`

- [x] IN-02 (P0) Refactor seed flow to ingest raw data then normalize into canonical tables.
  - Gates: G4, G9
  - Acceptance:
    - `scripts/seed.ts` no longer writes canonical product/plant/offer rows directly from JSON.
    - Normalization stage is the only writer for canonical rows during seed/import.
    - Run summary prints: ingested entities, snapshots created, normalized entities updated/inserted.
  - Verify:
    - `pnpm seed && pnpm seed`
    - Row counts remain stable on second run (idempotent).
  - Dependencies: IN-01
  - Entry points:
    - `scripts/seed.ts`
    - `src/server/normalization/*`

- [x] IN-03 (P0) Add ingestion idempotency regression tests.
  - Gates: G4
  - Acceptance:
    - Tests cover: duplicate seed input, unchanged payload hash dedupe, stable canonical IDs.
    - CI/local tests fail if duplicate canonical rows are produced.
  - Verify:
    - `pnpm test`
  - Dependencies: IN-02
  - Entry points:
    - `tests/ingestion/*`

### Phase ING-2: Deterministic Normalization + Overrides

- [x] IN-04 (P0) Implement deterministic product matching precedence.
  - Gates: G4, G9
  - Acceptance:
    - Precedence order implemented: identifier exact match -> brand/model fingerprint -> new canonical.
    - Match method and confidence stored in `canonical_entity_mappings`.
  - Verify:
    - `pnpm test` (unit tests for precedence paths)
  - Dependencies: IN-02
  - Entry points:
    - `src/server/normalization/matchers/product.ts`

- [x] IN-05 (P0) Implement plant and offer deterministic matchers.
  - Gates: G4, G9
  - Acceptance:
    - Plants: scientific name/slug deterministic matching.
    - Offers: deterministic fingerprint by canonical product, retailer, normalized URL.
  - Verify:
    - `pnpm test`
  - Dependencies: IN-04
  - Entry points:
    - `src/server/normalization/matchers/plant.ts`
    - `src/server/normalization/matchers/offer.ts`

- [x] IN-06 (P0) Apply normalization overrides with explainability metadata.
  - Gates: G4, G9
  - Acceptance:
    - `normalization_overrides` always win over automated values.
    - Canonical metadata records `winner` reason per overridden field.
  - Verify:
    - `pnpm test`
    - Manual: create override, rerun normalization, confirm override persists.
  - Dependencies: IN-05
  - Entry points:
    - `src/server/normalization/*`

### Phase ING-3: Admin Operations for Mapping/Overrides

- [x] IN-07 (P0) Add admin view for unmapped entities + map/unmap actions.
  - Gates: G2, G7
  - Acceptance:
    - Admin can list unmapped entities and map them to canonical records.
    - Mapping changes are logged in `admin_logs`.
  - Verify:
    - `pnpm test:e2e` (admin smoke)
    - Manual: map entity and confirm canonical linkage.
  - Dependencies: IN-05
  - Entry points:
    - `src/app/admin/ingestion/*`
    - `src/app/admin/mappings/*`

- [x] IN-08 (P0) Add admin override CRUD (field-level) with reason capture.
  - Gates: G2, G4, G7
  - Acceptance:
    - Admin can create/update/delete overrides.
    - Each override stores reason + actor + timestamps.
  - Verify:
    - `pnpm test:e2e`
    - Manual: override then rerun normalization; field remains overridden.
  - Dependencies: IN-06
  - Entry points:
    - `src/app/admin/overrides/*`
    - `src/server/services/admin/*`
  - Notes (2026-02-11):
    - Added `/admin/overrides` CRUD UI + admin-only create/update/delete routes.
    - Added admin override service with reason/actor validation + `admin_logs` audit entries.
    - Added regression coverage in `tests/server/admin-overrides.test.ts` and signed-out route protection in `tests/e2e/smoke.spec.ts`.

### Phase ING-4: Offer Freshness and Derived Read Cache

- [x] IN-09 (P0) Add offer detail refresh jobs (`one` + `bulk`) and parser hooks.
  - Gates: G0, G4, G7
  - Acceptance:
    - New job kinds process detail checks outside request paths.
    - Canonical offers and `price_history` update on meaningful changes.
  - Verify:
    - `pnpm ingest schedule`
    - `pnpm ingest run`
    - Manual DB check for updated `last_checked_at` and appended `price_history`.
  - Dependencies: IN-05
  - Entry points:
    - `src/server/ingestion/job-queue.ts`
    - `src/server/ingestion/sources/offers-*.ts`
    - `src/server/normalization/offers.ts`
  - Notes (2026-02-11):
    - Added `offers.detail_refresh.bulk|one` job kinds + payload schemas and worker handling.
    - Added detail ingestion source/parser pipeline in `src/server/ingestion/sources/offers-detail.ts` with provenance snapshot writes.
    - Added meaningful-change normalization semantics in `src/server/normalization/offers.ts` (`lastCheckedAt` always updates; `price_history` appends only on meaningful price/stock changes).
    - Switched admin+cron refresh routes to enqueue detail-refresh jobs and updated scheduler coverage + new detail worker regression test.

- [x] IN-10 (P0) Add derived offer summary cache for read-heavy catalog/builder views.
  - Gates: G0, G8
  - Acceptance:
    - Derived summary table/service exists (`min_price`, `in_stock_count`, `stale_flag`, `checked_at`).
    - Invalidation/refresh runs on normalization updates.
  - Verify:
    - `pnpm test`
    - Manual: update offer, confirm summary refreshes.
  - Dependencies: IN-09
  - Entry points:
    - `src/server/db/schema.ts`
    - `src/server/services/*`
    - `src/server/trpc/routers/offers.ts`
  - Notes (2026-02-11):
    - Added `offer_summaries` cached-derivative table + migration (`0011_offer_summaries_cache`) with `min_price_cents`, `in_stock_count`, `stale_flag`, `checked_at`.
    - Added `src/server/services/offer-summaries.ts` for deterministic aggregate refresh/upsert/delete-by-product and summary reads.
    - Wired summary refresh into normalization updates in both observation path (`src/server/normalization/offers.ts`) and manual-seed offer normalization (`src/server/normalization/manual-seed.ts`).
    - Added `offers.summaryByProductIds` tRPC read API and coverage updates in `tests/api/offers.test.ts` + `tests/server/ingestion-offers-detail.test.ts`.

- [x] IN-11 (P0) Switch product list and builder read-paths to derived summaries.
  - Gates: G0, G8
  - Acceptance:
    - Product/category pages and builder totals consume derived summaries by default.
    - Empty/unknown states remain explicit and user-friendly.
  - Verify:
    - `pnpm test:e2e`
    - Manual: Products and Builder show consistent price/freshness behavior.
  - Dependencies: IN-10
  - Entry points:
    - `src/app/products/*`
    - `src/app/builder/*`
  - Notes (2026-02-11):
    - Switched product category and product detail price read-paths from offer scans/lowest-offer query to `offers.summaryByProductIds`, including explicit pending/no-stock/stale freshness copy.
    - Updated builder pricing/totals to be summary-first by default, with selected-offer overrides preserved, stale summary messaging, and explicit unknown states when summaries are missing.
    - Added `src/lib/offer-summary.ts` + `tests/lib/offer-summary.test.ts` for deterministic summary-state handling and regression coverage.
    - Verification (host rerun):
      - `pnpm lint` PASS
      - `pnpm typecheck` PASS
      - `pnpm vitest run tests/lib/offer-summary.test.ts` PASS
      - `pnpm verify:gates` PASS
      - `pnpm verify` PASS

- [x] IN-11A (P0) Catalog production hardening: remove pre-ingestion legacy rows + all placeholders.
  - Gates: G0, G4, G8, G9
  - Subtasks (execute in order):
    - [x] IN-11A1 Codify legacy/pre-ingestion detection + provenance audit checks (products/plants/offers/categories/parts).
    - [x] IN-11A2 Harden seed/import normalization boundary and archive/prune legacy rows so production surfaces only show ingestion-backed canonical data.
    - [x] IN-11A3 Remove placeholder assets/copy/spec filler from production catalog surfaces (Products/Plants/Builder) with explicit no-data UX.
    - [x] IN-11A4 Add guardrails/tests to prevent placeholder/provenance regressions.
      - [x] IN-11A4a Add centralized placeholder marker guardrails (image URL + filler-copy tokens) used by normalization/read helpers.
      - [x] IN-11A4b Add regression tests that enforce placeholder guard behavior and verify API/router tests do not rely on pre-ingestion seeded slugs.
      - [x] IN-11A4c Add executable verification guardrail command(s) for provenance + placeholder audits and wire into seed/import verification flow.
  - Notes (2026-02-11):
    - Added `src/server/catalog/provenance.ts` with canonical/displayed/build-part provenance audits.
    - Added `scripts/catalog-provenance-audit.ts` + `pnpm catalog:audit:provenance`.
    - Added regression coverage: `tests/server/catalog-provenance.test.ts`.
    - Baseline audit snapshot before cleanup: products=91, plants=74, offers=104, categories=10, build parts total=124.
  - Notes (2026-02-11, IN-11A2 complete):
    - Added `src/server/catalog/legacy-prune.ts`:
      - detects canonical rows missing ingestion provenance (`product|plant|offer`)
      - prunes legacy canonical rows plus dependent references (`build_items`, `user_favorites`, `price_history`, overrides/mappings)
      - refreshes affected `offer_summaries` after offer pruning
    - Added executable cleanup command:
      - `scripts/catalog-legacy-prune.ts`
      - `pnpm catalog:cleanup:legacy`
    - Hardened `scripts/seed.ts` boundary:
      - normalization now always runs (no `snapshotsCreated` skip path)
      - legacy prune runs after normalization
      - provenance audit runs after prune and throws if displayed violations remain
    - Added regression coverage:
      - `tests/server/catalog-legacy-prune.test.ts` (deterministic cleanup-plan behavior)
    - Host verification + cleanup run:
      - `pnpm catalog:cleanup:legacy` PASS
      - `pnpm catalog:audit:provenance` PASS (`products=0, plants=0, offers=0, categories=0, build parts total=0`)
      - Cleanup removed 31 products, 74 plants, 104 offers and deleted dependent price history + stale offer references.
  - Notes (2026-02-11, IN-11A3 complete):
    - Added explicit no-data copy helpers:
      - `src/lib/catalog-no-data.ts`
      - `tests/lib/catalog-no-data.test.ts`
    - Removed placeholder hero-image fallbacks from production catalog surfaces:
      - `src/app/products/page.tsx`
      - `src/app/products/[category]/page.tsx`
      - `src/app/products/[category]/[slug]/page.tsx`
      - `src/app/plants/page.tsx`
      - `src/app/plants/[slug]/page.tsx`
      - `src/components/builder/BuilderPage.tsx`
    - Replaced placeholder/filler copy with explicit source-unavailable wording (photos/specs/offers/details).
    - Verification:
      - `pnpm vitest run tests/lib/catalog-no-data.test.ts` PASS
      - `pnpm lint` PASS
      - `pnpm typecheck` PASS
      - `pnpm verify:gates` PASS
      - `pnpm verify` FAIL (pre-existing seeded-data expectations after provenance cleanup: `tests/api/offers.test.ts`, `tests/api/builds.test.ts`, `tests/api/plants.test.ts`)
      - `pnpm seed` STARTED for data refresh, reached normalization phase, no completion signal (terminated manually).
  - Notes (2026-02-11/12, IN-11A4 complete):
    - Added centralized placeholder guardrails:
      - `src/lib/catalog-guardrails.ts`
      - sanitizers wired into `src/server/normalization/manual-seed.ts` and catalog read helpers (`src/lib/catalog-no-data.ts`, Products/Plants/Builder surfaces).
    - Added executable regression audit + seed wiring:
      - `src/server/catalog/regression-audit.ts`
      - `scripts/catalog-regression-audit.ts`
      - `pnpm catalog:audit:regressions`
      - `scripts/seed.ts` now runs regression audit (provenance + placeholder markers) and fails on violations.
    - Removed hardcoded legacy slug assumptions from API/e2e regression coverage:
      - `tests/api/offers.test.ts`
      - `tests/api/builds.test.ts`
      - `tests/api/plants.test.ts`
      - `tests/e2e/smoke.spec.ts` (plants smoke test now fixture-safe).
    - Added guardrail unit coverage:
      - `tests/lib/catalog-guardrails.test.ts`
      - updated `tests/lib/catalog-no-data.test.ts`.
    - Added normalization observability telemetry for long-running seed runs:
      - `src/server/normalization/manual-seed.ts` now emits deterministic per-stage progress/timing events.
      - `scripts/seed.ts` now logs stage snapshots/progress/summary-refresh/overall timings and emits `stageTimingsMs` in seed summary output.
    - Added canonical quality/freshness audit for launch-readiness triage:
      - `src/server/catalog/quality-audit.ts`
      - `scripts/catalog-quality-audit.ts`
      - `pnpm catalog:audit:quality`
      - `tests/server/catalog-quality-audit.test.ts`
    - Verification (host):
      - `pnpm typecheck` PASS
      - `pnpm vitest run tests/server/catalog-quality-audit.test.ts` PASS
      - `pnpm vitest run tests/ingestion/idempotency.test.ts tests/ingestion/normalization-overrides.test.ts` PASS
      - `pnpm test` PASS
      - `pnpm verify` PASS
      - `pnpm verify:gates` PASS
      - `node --import tsx scripts/gates.ts` PASS
      - `pnpm seed` PASS (normalization completed with deterministic progress logs)
      - `pnpm catalog:audit:regressions` PASS (`placeholder.products=0`, provenance clean)
      - `pnpm catalog:audit:quality` FAIL (expected launch-readiness blocker: offer freshness 0% in <24h window + large image/offer coverage gaps in focus categories)
    - Remaining blocker for later phases (IN-12/IN-13):
      - catalog quality/freshness audit now explicitly reports unresolved freshness/completeness debt (focus categories + plants imagery).
  - Acceptance:
    - Define and codify "legacy/pre-ingestion" detection (products/plants/offers/categories/parts lacking ingestion provenance or canonical mapping consistency).
    - Remove or archive legacy pre-ingestion catalog rows so production surfaces only show ingestion-backed canonical data.
    - Remove all placeholder content from production catalog surfaces (placeholder images/copy/spec filler/seed-only stand-ins).
    - Add guardrails/tests so new placeholder rows cannot be reintroduced unnoticed.
    - Update seed/import tooling so every displayed catalog row is ingestion-normalized and provenance-backed.
  - Verify:
    - `pnpm test`
    - `pnpm verify:gates`
    - Manual SQL audit: zero placeholder markers; zero displayed catalog rows without ingestion/canonical provenance.
    - Manual UI audit: Products, Plants, Builder show no placeholder assets/copy.
  - Dependencies: IN-11
  - Entry points:
    - `scripts/seed.ts`
    - `src/server/normalization/*`
    - `src/server/db/schema.ts`
    - `src/app/products/*`
    - `src/app/plants/*`
    - `src/components/builder/*`

### Phase ING-5: Operations + Launch Gate Closeout

### Phase CAT-1: Baseline "Aquascape in a Box" Builds

- [ ] CAT-01 (P0) Define 3 baseline curated builds (Budget / Mid / Premium) with exact BOM + plant quantities.
  - Gates: G0, G8, G9
  - Acceptance:
    - Three canonical templates exist with explicit tank size/style goals and full compatible BOM.
    - Each template includes exact plant species + quantities (stems/pots/tissue cups) and required hardscape/substrate quantities.
    - Compatibility evaluation for each template returns no blocking errors.
    - Price bands are intentional and documented (e.g., budget / mid / premium rationale).
  - Verify:
    - `pnpm test`
    - Manual: load each template in Builder and confirm complete+compatible state.
  - Dependencies: IN-11A
  - Entry points:
    - `src/server/db/schema.ts`
    - `src/server/trpc/routers/builds.ts`
    - `src/components/builder/*`
    - `src/app/builds/*`

- [ ] CAT-02 (P0) Add one-click "Start from template" UX in Builder/Builds.
  - Gates: G0, G8
  - Acceptance:
    - User can start from Budget/Mid/Premium baseline templates in one click.
    - Template snapshot includes parts, quantities, and selected offers/variants where applicable.
    - Empty-state and loading UX are clear and production-friendly.
  - Verify:
    - `pnpm test:e2e`
    - Manual: create build from each template and share successfully.
  - Dependencies: CAT-01
  - Entry points:
    - `src/app/builds/*`
    - `src/app/builder/*`
    - `src/components/builder/*`


- [ ] IN-12 (P0) Add ingestion ops dashboard and runbook checks.
  - Gates: G7, G11
  - Acceptance:
    - Admin can see run status, queue depth, failures, stale offers, and unmapped entity counts.
    - Recovery steps documented in `VERIFY.md`.
  - Verify:
    - `pnpm verify:gates`
    - Manual: simulate failure and confirm visibility.
  - Dependencies: IN-07, IN-09
  - Entry points:
    - `src/app/admin/ingestion/page.tsx`
    - `VERIFY.md`
    - `config/gates.json`

- [ ] IN-13 (P0) Final gate check for data-pipeline readiness.
  - Gates: G0, G4, G7, G8, G9
  - Acceptance:
    - `pnpm verify` passes.
    - `pnpm verify:gates` has no `fail`.
    - Data quality metrics meet baseline:
      - curated core products have offers and specs
      - freshness SLO: 95% of core offers checked < 24h
  - Verify:
    - `pnpm verify && pnpm verify:gates`
    - Manual SQL checks for freshness/reporting metrics.
  - Dependencies: IN-01..IN-12

---

## Next Task

Start with `CAT-01`, then continue to `CAT-02`.
