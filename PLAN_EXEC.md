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

- [ ] IN-11 (P0) Switch product list and builder read-paths to derived summaries.
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

- [ ] IN-11A (P0) Catalog production hardening: remove pre-ingestion legacy rows + all placeholders.
  - Gates: G0, G4, G8, G9
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

Start with `IN-11`, then execute `IN-11A` immediately after.
