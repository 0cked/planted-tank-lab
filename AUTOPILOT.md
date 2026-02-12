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
- trusted ingestion + normalization + canonical freshness + user-facing catalog quality boundaries.

Current phase: `ING-5 / IN-12` (reliability hardening + ops closeout) — `IN-11A` remains clean; `IN-12A` + `IN-12B` are now complete; `IN-12C` + `IN-13` remain before resuming template-build work.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).
- `IN-11A` complete: provenance clean + placeholder regressions cleared in canonical/displayed catalog paths.
- `IN-12A` complete:
  - bulk refresh jobs now support `olderThanHours` (with `olderThanDays` compatibility fallback).
  - bulk offer selection is stale-first deterministic.
  - transport failures no longer mutate canonical stock/freshness.
  - bulk selection query now uses SQL interval math (`now() - interval`) to avoid Date-bind failures.
- `IN-12B` complete:
  - public products/plants read paths enforce `status=active`.
  - seed now applies activation policy curation (focus products require in-stock priced offers; plants require image+sources+description).
  - executable curation command added: `pnpm catalog:curate:activation`.

Current quality/freshness posture (`pnpm catalog:audit:quality`):
- offer freshness improved from **0%** to **92.23%** (95/103 checked <24h), but still below 95% SLO.
- focus-category offer completeness warnings for missing offers are eliminated (`productsWithoutAnyOffer=0` across focus categories).
- active plants missing-image debt is eliminated (61/61 active plants have images).
- focus-category image debt remains (tank/light/filter/substrate/hardscape).

Remaining critical gaps:
- freshness SLO still short by 8 stale offers (mostly tank category).
- focus-category image coverage remains incomplete.
- `IN-12C` admin ingestion ops dashboard/runbook UX remains pending.

## What Changed Last

- Added and wired catalog activation policy:
  - `src/server/catalog/activation-policy.ts`
  - `scripts/catalog-activation-policy.ts`
  - `pnpm catalog:curate:activation`
  - seed integration in `scripts/seed.ts`.
- Hardened offer refresh reliability semantics:
  - `src/server/ingestion/sources/offers-refresh-window.ts`
  - `src/server/ingestion/sources/availability-signal.ts`
  - updated `offers-head` + `offers-detail` bulk refresh selection and failure handling.
  - scheduler/worker defaults now target 24h freshness SLO windows (`olderThanHours: 20`).
- Enforced active-only catalog on public APIs:
  - `src/server/trpc/routers/products.ts`
  - `src/server/trpc/routers/plants.ts`.
- Verification highlights:
  - `pnpm test` PASS
  - `pnpm verify` PASS
  - `pnpm verify:gates` PASS
  - `pnpm seed` PASS
  - `pnpm catalog:audit:regressions` PASS
  - `pnpm catalog:curate:activation` PASS
  - `pnpm catalog:audit:quality` FAIL (expected remaining blocker: freshness 92.23% < 95% + image debt warnings)

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `IN-12C` Admin ingestion ops dashboard surface + explicit queue recovery runbook.
2. `IN-13` Final gate closeout (`catalog:audit:quality` freshness/image blockers to acceptable threshold).
3. `CAT-01` Define baseline curated builds (Budget/Mid/Premium) with exact BOM + plant counts.
4. `CAT-02` Add one-click "Start from template" UX.

## Known Risks / Blockers

- Freshness remains below SLO (`catalog:audit:quality`: 92.23% vs 95% target).
- Focus-category image coverage remains uneven (especially non-tank gear categories).
- Some older queued ingestion jobs were created before the interval-query fix and may need operational cleanup/retry handling via `IN-12C` dashboard/runbook.
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
