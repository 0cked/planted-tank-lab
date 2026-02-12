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

Current phase: `ING-5 / IN-13` (gate closeout) — `IN-12` is now complete; `IN-13A` freshness correctness/SLO is complete; `IN-13B` image coverage debt remains before resuming template-build work.

## Current State Snapshot

Completed prerequisites:
- Fly.io web deployment is live with Cloudflare DNS pointed to Fly.
- Auth paths are functional (Google + email magic links via Resend).
- Supabase RLS hardening migration applied (`0010_enable_rls`).
- Ingestion foundation exists (jobs, runs, sources, entities, snapshots, mapping tables).
- `IN-11A` complete: provenance clean + placeholder regressions cleared in canonical/displayed catalog paths.
- `IN-12` complete:
  - offer refresh reliability semantics and stale-first deterministic scheduling remain in place.
  - active-only public catalog read paths are enforced.
  - new ingestion ops dashboard + recovery controls are live at `/admin/ingestion`.
  - queue recovery runbook is documented in `VERIFY.md`.
- Seed fixture placeholder marker cleanup complete:
  - removed `/images/aquascape-hero-2400.jpg` references from product fixtures.
  - regression guard added (`tests/server/catalog-fixture-guardrails.test.ts`).

Current quality/freshness posture (`pnpm catalog:audit:quality`):
- **Freshness SLO is met** for active catalog offers: **100%** (`103/103` checked within 24h).
- quality audit now scores freshness against active-catalog offers and reports active/inactive context explicitly.
- focus-category offer completeness remains strong (`productsWithoutAnyOffer=0` across focus categories).
- active plants media/source/description completeness remains clean.
- focus-category image warnings remain (tank/light/filter/substrate/hardscape).

Remaining critical gaps:
- `IN-13B` focus-category image coverage debt remains unresolved.
- ingestion queue has accumulated historical failed jobs; dashboard recovery controls exist but ongoing cleanup/tuning is still needed.

## What Changed Last

- Completed `IN-12C` admin ingestion ops surface + recovery controls:
  - `src/server/services/admin/ingestion-ops.ts`
  - `src/app/admin/ingestion/recover/route.ts`
  - expanded `/admin/ingestion` dashboard with queue depth, stale/stuck indicators, recent failed jobs/runs, stale-offer snapshot, and one-click recovery actions.
  - added helper coverage: `tests/server/admin-ingestion-ops.test.ts`.
- Improved `IN-13A` freshness correctness semantics:
  - `src/server/catalog/quality-audit.ts` now scores freshness on active-catalog offers and includes active/inactive offer context.
  - updated quality-audit tests: `tests/server/catalog-quality-audit.test.ts`.
- Removed lingering placeholder fixture artifacts + guardrail:
  - `data/products/{tanks,lights,filters,substrates}.json` cleaned of blocked placeholder image marker.
  - `tests/server/catalog-fixture-guardrails.test.ts` added.
- Runbook updates:
  - `VERIFY.md` now includes explicit ingestion queue recovery workflow tied to `/admin/ingestion` controls.

Verification highlights (this run):
- `pnpm vitest run tests/server/admin-ingestion-ops.test.ts tests/server/catalog-fixture-guardrails.test.ts tests/server/catalog-quality-audit.test.ts` PASS
- `pnpm test` PASS
- `pnpm verify:gates` PASS
- `pnpm seed` PASS
- `pnpm catalog:audit:regressions` PASS
- `pnpm catalog:audit:quality` PASS (no violations; image warnings remain)
- `pnpm verify` PASS

## Active Task Queue (from `PLAN_EXEC.md`)

Execute in this order:
1. `IN-13B` reduce focus-category image coverage warnings without reintroducing placeholders.
2. `CAT-01` define baseline curated builds (Budget/Mid/Premium) with exact BOM + plant counts.
3. `CAT-02` add one-click "Start from template" UX.

## Known Risks / Blockers

- Focus-category image coverage remains uneven (especially non-tank gear categories).
- Historical ingestion failure backlog exists; recovery controls are now available but may require periodic operator intervention.
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
