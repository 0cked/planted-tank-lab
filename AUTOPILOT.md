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

Current phase: `ING-5 / IN-13` (gate closeout) — `IN-12` remains complete; `IN-13A` remains complete; `IN-13B` is in active closeout with image-warning debt reduced but not yet zero.

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

Current quality/freshness posture (`pnpm catalog:audit:quality`, 2026-02-12T11:32:06Z):
- **Freshness SLO is met** for active catalog offers: **100%** (`103/103` checked within 24h).
- focus-category image warnings have been reduced from **27** to **12** missing-image rows after ingestion-driven detail refresh hydration.
  - tank: `6 -> 4`
  - light: `6 -> 1`
  - filter: `5 -> 2`
  - substrate: `5 -> 3`
  - hardscape: `5 -> 2`
- offer completeness remains strong (`productsWithoutAnyOffer=0` across focus categories).
- active plants media/source/description completeness remains clean.

Remaining critical gaps:
- `IN-13B` image coverage is improved but unresolved (12 focus-category missing-image warnings remain).
- ingestion queue has accumulated historical queued/failed backlog from prior manual bulk attempts; `/admin/ingestion` recovery controls remain the source of truth for cleanup.

## What Changed Last

- Added offer-detail image extraction + provenance wiring:
  - `src/server/ingestion/sources/offers-detail.ts`
  - parses image candidates from JSON-LD + meta tags (+ amazon DOM fallback), sanitizes via catalog guardrails, stores image parser/confidence/source in snapshot metadata, and emits `product_image_url` extracted field when present.
- Added normalization-side product image hydration safeguards:
  - `src/server/normalization/offers.ts`
  - hydrates canonical product image only when currently missing, skips when image overrides exist, and never clobbers existing curated images.
- Added non-production artifact deactivation guard in activation policy:
  - `src/server/catalog/activation-policy.ts`
  - explicit `isNonProductionCatalogSlug` helper (`vitest/test/e2e/playwright` patterns) now prevents those rows from being active catalog inventory.
- Expanded regression coverage:
  - `tests/server/ingestion-offers-detail.test.ts`
  - `tests/server/catalog-activation-policy.test.ts`

Verification highlights (this run):
- `pnpm lint` PASS
- `pnpm typecheck` PASS
- `pnpm vitest run tests/server/ingestion-offers-detail.test.ts tests/server/catalog-activation-policy.test.ts` PASS
- `pnpm verify:gates` PASS
- `pnpm catalog:audit:regressions` PASS
- `pnpm catalog:audit:quality` PASS (no violations; warnings reduced to 12)
- `pnpm verify` PASS
- direct offer-detail hydration execution (`runOffersDetailRefresh` bulk, `limit=30`, `timeoutMs=2500`) => `{ scanned: 30, updated: 17, failed: 0 }`

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
