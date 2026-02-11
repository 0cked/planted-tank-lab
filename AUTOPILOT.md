# AUTOPILOT - PlantedTankLab (Single Source Of Truth)

Last updated: 2026-02-11

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

Current phase: `ING-4` (Offer freshness and derived cache) — `IN-10` complete, `IN-11` active next.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).

Remaining critical gap:
- read-path adoption for derived offer summaries in product/builder surfaces remains pending (`IN-11+`).

## What Changed Last

- Completed `IN-10` derived offer summary cache.
- Added cached derivative table + migration:
  - `offer_summaries` in `src/server/db/schema.ts`
  - `src/server/db/migrations/0011_offer_summaries_cache.sql`
- Added summary refresh/read service:
  - `src/server/services/offer-summaries.ts`
- Wired invalidation/refresh from normalization update paths:
  - `src/server/normalization/offers.ts`
  - `src/server/normalization/manual-seed.ts`
- Added summary query endpoint:
  - `offers.summaryByProductIds` in `src/server/trpc/routers/offers.ts`
- Added/updated coverage:
  - `tests/api/offers.test.ts`
  - `tests/server/ingestion-offers-detail.test.ts`

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `IN-11` Switch product list and builder read-paths to derived summaries.
2. `IN-12` Ingestion ops dashboard and runbook checks.
3. `IN-13` Final gate check for data-pipeline readiness.

## Known Risks / Blockers

- Offer data completeness still depends on source coverage and parser quality.
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
