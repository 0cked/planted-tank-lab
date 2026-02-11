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

Current phase: `ING-5/CAT-1` (ops closeout + template-build curation) — `IN-11` complete, `IN-12` and `CAT-01` are next priorities.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).

Remaining critical gap:
- ingestion ops dashboard/runbook and final gate closeout remain pending (`IN-12`, `IN-13`).

## What Changed Last

- Completed `IN-11` read-path switch to derived summaries.
- Product pages now default to derived offer summaries:
  - `src/app/products/[category]/page.tsx`
  - `src/app/products/[category]/[slug]/page.tsx`
- Builder totals now default to derived summaries with explicit freshness/unknown states:
  - `src/components/builder/BuilderPage.tsx`
- Added shared summary-state helper + tests:
  - `src/lib/offer-summary.ts`
  - `tests/lib/offer-summary.test.ts`
- Verification notes:
  - `pnpm lint` PASS
  - `pnpm typecheck` PASS
  - `pnpm vitest run tests/lib/offer-summary.test.ts` PASS
  - `pnpm test:e2e` blocked in this environment due Google Fonts fetch failures during `next build`

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `IN-12` Ingestion ops dashboard and runbook checks.
2. `CAT-01` Define baseline curated builds (Budget/Mid/Premium) with exact BOM + plant counts.
3. `CAT-02` Add one-click "Start from template" UX.
4. `IN-13` Final gate check for data-pipeline readiness.

## Known Risks / Blockers

- Offer data completeness still depends on source coverage and parser quality.
- In-memory rate limit implementation is acceptable now but not horizontally durable.
- Sentry alerting still requires ongoing production tuning.
- Environment verification blockers persist in this sandbox:
  - `pnpm verify:gates` fails via `tsx` IPC pipe `EPERM` (fallback command works: `node --import tsx scripts/gates.ts`).
  - DB-backed tests fail when Supabase pooler DNS is unreachable (`ENOTFOUND aws-0-us-west-2.pooler.supabase.com`).
  - `pnpm test:e2e` fails when Google Fonts cannot be fetched during `next build`.
  - Git operations requiring `.git` writes are blocked (`.git/index.lock` cannot be created), and `git push` cannot resolve `github.com`.

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
