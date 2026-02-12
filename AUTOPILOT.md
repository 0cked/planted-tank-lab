# AUTOPILOT - PlantedTankLab (Single Source Of Truth)

Last updated: 2026-02-12

This file is the only authoritative status board for active execution.
If chat history or older docs conflict with this file, this file wins.

## Planning System (Consolidated)

Only these four planning artifacts are active:

1. `AUTOPILOT.md` - current status, active task, next actions, resume protocol.
2. `PLAN_EXEC.md` - full executable checklist with acceptance criteria and verify steps.
3. `PROGRESS.md` - append-only session log.
4. `VERIFY.md` - launch-readiness verification playbook and gate checks.

Deprecated and archived:
- `TODO.md` (archived at `archive/planning/2026-02-11/TODO.deprecated.md`).

## Current Mission

Primary objective: keep Top Priority #1 (trusted ingestion + normalization + canonical quality boundaries) stable while moving into **CAT-01/CAT-02**.

Current phase: `CAT-1` baseline templates.

Pipeline closeout status:
- `IN-12` complete.
- `IN-13` complete.
- focus-category image/freshness readiness closeout is complete for active catalog scope.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).
- `IN-11A` complete: provenance clean + placeholder regressions cleared in canonical/displayed catalog paths.
- `IN-12` complete:
  - offer refresh reliability semantics + stale-first deterministic scheduling in place.
  - active-only public catalog read paths are enforced.
  - ingestion ops dashboard + queue recovery controls are live at `/admin/ingestion`.
- `IN-13` complete:
  - detail-observation trust boundary now blocks unsafe canonical price/stock mutations from search URLs + anti-bot pages.
  - manual-seed normalization now preserves existing canonical product images when seed snapshots omit image fields.
  - activation policy now requires images/specs/in-stock priced offers for active focus products.

Current quality/freshness posture (`pnpm catalog:audit:quality`, 2026-02-12T13:27:30Z):
- **Freshness SLO is met** for active catalog offers: **100%** (`102/102` checked within 24h).
- focus categories (`tank/light/filter/substrate/hardscape`) are active-catalog complete for image/spec/offer coverage.
- quality audit warnings/violations: **0**.
- pricing drift introduced by prior search-page parsing was corrected via reseed + refresh.

Regression posture (`pnpm catalog:audit:regressions`, 2026-02-12T13:28:00Z):
- provenance violations: **0**
- placeholder violations: **0**

## What Changed Last

- Hardened ingestion reliability and canonical mutation boundaries:
  - `src/server/ingestion/sources/offers-detail.ts`
    - blocks canonical offer-state writes for search-result URLs + anti-bot pages
    - keeps ingestion snapshot provenance while suppressing unsafe mutations
  - `src/server/normalization/offers.ts`
    - added `allowOfferStateUpdate` so ingestion can hydrate product images without mutating offer freshness/price when observations are untrusted

- Hardened normalization reliability:
  - `src/server/normalization/manual-seed.ts`
    - preserves existing canonical product images when seed payload omits image fields

- Tightened user-facing catalog quality boundaries:
  - `src/server/catalog/activation-policy.ts`
    - focus products must have image + specs + in-stock priced offers to remain active

- Added/updated regression coverage:
  - `tests/server/ingestion-offers-detail.test.ts`
  - `tests/server/catalog-activation-policy.test.ts`
  - `tests/ingestion/manual-seed-image-preservation.test.ts`

- Reconciled live data state after reliability hardening:
  - `pnpm seed` (realigned canonical pricing/offers to ingestion-normalized baseline)
  - high-priority `offers.head_refresh.bulk` run restored freshness window to 100%

Verification highlights (this run):
- `pnpm lint` PASS
- `pnpm typecheck` PASS
- `pnpm vitest run tests/server/ingestion-offers-detail.test.ts tests/server/catalog-activation-policy.test.ts tests/ingestion/manual-seed-image-preservation.test.ts` PASS
- `pnpm seed` PASS
- `pnpm catalog:curate:activation` PASS (idempotent on rerun)
- `pnpm catalog:audit:regressions` PASS
- `pnpm catalog:audit:quality` PASS (no warnings/violations)
- `pnpm verify:gates` PASS (no fail gates)
- `pnpm verify` PASS

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `CAT-01` define baseline curated builds (Budget/Mid/Premium) with exact BOM + plant quantities.
2. `CAT-02` add one-click "Start from template" UX.
3. Continue ingestion queue hygiene via `/admin/ingestion` recovery controls when stale locks appear.

## Known Risks / Blockers

- Some ingestion runs can remain `running` if external worker processes terminate mid-job; continue using `/admin/ingestion` recovery controls.
- In-memory rate limiting remains acceptable for now but not horizontally durable.
- Sentry alerting still requires ongoing production tuning.

## Resume In <2 Minutes

1. Read `AUTOPILOT.md`.
2. Open `PLAN_EXEC.md` and find the first unchecked `[ ]` task (`CAT-01`).
3. Read last 1-3 entries in `PROGRESS.md`.
4. Run:
   - `pnpm verify:gates`
   - targeted checks for the active task (from `PLAN_EXEC.md` verify section)
5. Implement task end-to-end.
6. Update `PLAN_EXEC.md`, `AUTOPILOT.md`, and append to `PROGRESS.md`.

## No-Conflicts Rule (strict)

Do not create new planning/checkpoint files outside this system.
If a new doc is necessary, link it from this file and ensure it does not duplicate task tracking already in `PLAN_EXEC.md`.
