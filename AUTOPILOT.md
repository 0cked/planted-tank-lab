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

Current phase: `ING-5/CAT-1` (ops closeout + template-build curation) — `IN-11A1` complete; `IN-11A2` (legacy row purge + normalization-boundary hardening) is the active priority before `CAT-01`/`IN-12`.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).

Remaining critical gap:
- catalog still contains non-provenance legacy rows; provenance audit is now codified and currently failing until `IN-11A2` cleanup lands.
- ingestion ops dashboard/runbook and final gate closeout remain pending (`IN-12`, `IN-13`).

## What Changed Last

- Completed `IN-11A1` provenance-audit codification for legacy/pre-ingestion detection.
- Added reusable provenance utility:
  - `src/server/catalog/provenance.ts`
  - codifies ingestion-backed checks for canonical `product|plant|offer`
  - reports canonical/displayed/builder-part violations by entity type
- Added executable audit command:
  - `scripts/catalog-provenance-audit.ts`
  - `pnpm catalog:audit:provenance`
- Added DB-backed regression coverage:
  - `tests/server/catalog-provenance.test.ts`
- Updated execution checklist:
  - `PLAN_EXEC.md` marks `IN-11A1` complete.
- Verification notes:
  - `pnpm test` PASS
  - `node --import tsx scripts/gates.ts` PASS
  - `pnpm catalog:audit:provenance` FAIL (expected pre-cleanup; reports active violations to clear in `IN-11A2`)

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `IN-11A2` Harden seed/import normalization boundary and archive/prune legacy rows so production surfaces show ingestion-backed canonical data only.
2. `IN-11A3` Remove placeholder assets/copy/spec filler from Products/Plants/Builder.
3. `IN-11A4` Add guardrails/tests to prevent placeholder/provenance regressions.
4. `CAT-01` Define baseline curated builds (Budget/Mid/Premium) with exact BOM + plant counts.
5. `CAT-02` Add one-click "Start from template" UX.
6. `IN-12` Ingestion ops dashboard and runbook checks.
7. `IN-13` Final gate check for data-pipeline readiness.

## Known Risks / Blockers

- Offer data completeness still depends on source coverage and parser quality.
- In-memory rate limit implementation is acceptable now but not horizontally durable.
- Sentry alerting still requires ongoing production tuning.
- Provenance audit currently reports active legacy violations (`products=91`, `plants=74`, `offers=104`, `categories=10`, build parts `total=124`) until `IN-11A2` cleanup is completed.

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
