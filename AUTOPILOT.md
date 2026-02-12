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

Current phase: `ING-5/CAT-1` (ops closeout + template-build curation) — `IN-11A1`, `IN-11A2`, and `IN-11A3` are complete; `IN-11A4` guardrails are implemented in code/tests but final data cleanup is blocked on a seed normalization run that does not complete.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).

Remaining critical gap:
- finish `IN-11A4` data-state remediation by completing a successful seed normalization run and clearing existing placeholder image markers detected by `pnpm catalog:audit:regressions`.
- ingestion ops dashboard/runbook and final gate closeout remain pending (`IN-12`, `IN-13`).

## What Changed Last

- Implemented `IN-11A4` code/test guardrails:
  - Added centralized placeholder sanitization/detection module: `src/lib/catalog-guardrails.ts`.
  - Wired sanitization into normalization boundary: `src/server/normalization/manual-seed.ts`.
  - Wired read-path helpers to suppress placeholder media/copy: Products/Plants/Builder + `src/lib/catalog-no-data.ts`.
  - Added regression audit service + CLI: `src/server/catalog/regression-audit.ts`, `scripts/catalog-regression-audit.ts`, `pnpm catalog:audit:regressions`.
  - Hardened regression tests to avoid hardcoded legacy slugs (`tests/api/offers.test.ts`, `tests/api/builds.test.ts`, `tests/api/plants.test.ts`, `tests/e2e/smoke.spec.ts`).
  - Added unit coverage: `tests/lib/catalog-guardrails.test.ts` + updated `tests/lib/catalog-no-data.test.ts`.
- Verification notes:
  - `pnpm lint` PASS
  - `pnpm typecheck` PASS
  - `pnpm test` PASS
  - `pnpm test:e2e` PASS
  - `pnpm verify` PASS
  - `pnpm verify:gates` PASS
  - `pnpm catalog:audit:provenance` PASS
  - `pnpm catalog:audit:regressions` FAIL (`placeholder.products=18`, provenance clean)
  - `pnpm seed` attempted twice; reaches normalization phase and does not emit completion signal (terminated manually).

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `IN-11A4` Close remaining blocker: complete seed normalization run and clear existing placeholder image markers so `pnpm catalog:audit:regressions` passes.
2. `CAT-01` Define baseline curated builds (Budget/Mid/Premium) with exact BOM + plant counts.
3. `CAT-02` Add one-click "Start from template" UX.
4. `IN-12` Ingestion ops dashboard and runbook checks.
5. `IN-13` Final gate check for data-pipeline readiness.

## Known Risks / Blockers

- Offer data completeness still depends on source coverage and parser quality.
- In-memory rate limit implementation is acceptable now but not horizontally durable.
- Sentry alerting still requires ongoing production tuning.
- Provenance baseline is clean and anti-regression guardrail code/tests are in place, but existing placeholder image rows remain in canonical products until a successful seed normalization/remediation run completes.

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
