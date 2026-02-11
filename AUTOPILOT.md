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

Current phase: `ING-4` (Offer freshness and derived cache) — `IN-09` complete, `IN-10` active next.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).

Remaining critical gap:
- derived offer read-cache + read-path adoption remain pending (`IN-10+`).

## What Changed Last

- Completed `IN-09` offer detail refresh pipeline + parser hooks.
- Added new ingestion job kinds and worker handling:
  - `offers.detail_refresh.bulk`
  - `offers.detail_refresh.one`
- Added detail ingestion source/parser implementation:
  - `src/server/ingestion/sources/offers-detail.ts`
  - provenance snapshots now capture parser metadata + extracted price/stock signals.
- Updated normalization semantics for meaningful-change writes:
  - `src/server/normalization/offers.ts`
  - `lastCheckedAt` updates every observation, while canonical price/stock + `price_history` only update on meaningful changes.
- Switched refresh entry points to detail jobs:
  - `src/app/admin/offers/refresh/route.ts`
  - `src/app/admin/offers/[id]/refresh/route.ts`
  - `src/app/api/cron/refresh-offers/route.ts`
- Added/updated coverage:
  - `tests/server/ingestion-offers-detail.test.ts`
  - `tests/server/ingestion-scheduler.test.ts`

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `IN-10` Derived offer summary cache for read-heavy views.
2. `IN-11` Switch product list and builder read-paths to derived summaries.
3. `IN-12` Ingestion ops dashboard and runbook checks.

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
