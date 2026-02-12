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

Primary objective: complete **Top Priority #1** to production-grade quality:
- trusted ingestion + normalization + canonical data freshness pipeline.

Current phase: `CAT-1 / ING-5` (template-build curation + ops closeout) — `IN-11A` is complete end-to-end; focus has shifted to template builds plus explicit catalog quality/freshness remediation ahead of final readiness gates.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).
- `IN-11A` complete: provenance clean + placeholder regressions cleared in canonical/displayed catalog paths.

Remaining critical gaps:
- Catalog quality/freshness debt is now explicitly measurable via `pnpm catalog:audit:quality` and currently fails readiness expectations:
  - offer freshness in the last 24h window is below SLO (0% vs 95% target)
  - significant image/offer coverage gaps remain in focus categories (tank/light/filter/substrate/hardscape)
  - a small set of active plants still have missing images
- ingestion ops dashboard/runbook and final gate closeout remain pending (`IN-12`, `IN-13`).

## What Changed Last

- Closed `IN-11A4` blocker with deterministic seed observability + data-state verification:
  - `src/server/normalization/manual-seed.ts` now emits per-stage snapshot/progress/completion timing events.
  - `scripts/seed.ts` now logs normalization progress in long-running runs and includes `stageTimingsMs` in final summary output.
  - `pnpm seed` now completes reliably with explicit forward progress in logs (products/plants/offers + summary refresh timings).
- Added canonical launch-readiness quality audit:
  - `src/server/catalog/quality-audit.ts`
  - `scripts/catalog-quality-audit.ts`
  - `pnpm catalog:audit:quality`
  - `tests/server/catalog-quality-audit.test.ts`
- Verification notes:
  - `pnpm typecheck` PASS
  - `pnpm vitest run tests/server/catalog-quality-audit.test.ts` PASS
  - `pnpm vitest run tests/ingestion/idempotency.test.ts tests/ingestion/normalization-overrides.test.ts` PASS
  - `pnpm test` PASS
  - `pnpm verify` PASS
  - `pnpm verify:gates` PASS
  - `node --import tsx scripts/gates.ts` PASS
  - `pnpm seed` PASS (with stage telemetry)
  - `pnpm catalog:audit:regressions` PASS (placeholder/provenance clean)
  - `pnpm catalog:audit:quality` FAIL (expected blocker report for freshness/completeness remediation)

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `CAT-01` Define baseline curated builds (Budget/Mid/Premium) with exact BOM + plant counts.
2. `CAT-02` Add one-click "Start from template" UX.
3. `IN-12` Ingestion ops dashboard and runbook checks.
4. `IN-13` Final gate check for data-pipeline readiness (using `catalog:audit:quality` + freshness/completeness remediation output).

## Known Risks / Blockers

- Offer freshness SLO is currently unmet (`catalog:audit:quality`: 0% checked within 24h).
- Core focus-category media/offer completeness remains uneven (especially missing product imagery in non-tank gear categories).
- In-memory rate limit implementation is acceptable now but not horizontally durable.
- Sentry alerting still requires ongoing production tuning.

## Resume In <2 Minutes

1. Read `AUTOPILOT.md`.
2. Open `PLAN_EXEC.md` and find the first unchecked `[ ]` task.
3. Read last 1-3 entries in `PROGRESS.md`.
4. Run:
   - `pnpm verify:gates`
   - targeted checks for the active task (from `PLAN_EXEC.md` verify section)
5. Implement task end-to-end.
6. Update `PLAN_EXEC.md`, `AUTOPILOT.md`, and append to `PROGRESS.md`.

## No-Conflicts Rule (strict)

Do not create new planning/checkpoint files outside this system.
If a new doc is necessary, link it from this file and ensure it does not duplicate task tracking already in `PLAN_EXEC.md`.
