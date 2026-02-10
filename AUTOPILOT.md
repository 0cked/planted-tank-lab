# AUTOPILOT - PlantedTankLab (Single Source Of Truth)

Last updated: 2026-02-10

This file is the single source of truth for: current status, what's next, and how to resume.

If anything disagrees with chat history or archived docs, **this file wins**.

## Current Milestone

- Milestone: E - Ingestion + Normalization Foundation (Trust-First Architecture)
- Day: 1
- Current objective: implement a dedicated ingestion → normalization → canonical → cached-derivatives pipeline (ADR 0003) and refactor any request-path external fetching out of API/admin routes.

## Launch Gates (G0-G11)

Source: `config/gates.json` (run: `pnpm verify:gates`)

- Current focus gates: G0 (Core Value Works), G4 (Data Integrity), G9 (Trust & Compliance)

## What Changed Last

- D-04 QA kickoff: ran full automated verification suite.
- Verified: `pnpm verify` PASS; `pnpm verify:gates` shows no FAIL gates.
- Architecture contract updated: ingestion/scraping is a dedicated subsystem (ADR 0003) and prohibited in request paths.
- Ingestion foundations added:
  - DB schema + migrations for sources/runs/entities/snapshots/job queue/mappings/overrides.
  - Backend-only ingestion runner: `pnpm ingest run`.
  - Offer refresh endpoints now enqueue ingestion jobs (no request-path external fetch).

## Next 3 Tasks (do these in order)

1. E-04 (P0) Seed/import flows through ingestion → normalization (no bypass).
   Entry points: `scripts/seed.ts`, `src/server/ingestion/*`, `src/server/normalization/*`.
2. E-05 (P0) Canonical mapping + duplicate resolution foundations.
   Entry points: `src/server/normalization/*`, admin tooling.
3. E-06 (P0) Cache boundaries for read-heavy views (keys/TTL/invalidation).
   Entry points: `src/server/cache/*`, catalog queries, normalization invalidation hooks.

## Daily Visual QA Notes (2026-02-09)

Observed from a fresh-session walkthrough (Home → Builder → Products → Plants → Builds → Sign-in):

- Builder: copy bug: “Choose a Accessories” (should be “Choose Accessories” / “Choose an accessory”).
- Plants list: page positions itself as “image-forward”, but many curated picks render with no image.
- Plant detail pages: “Photo” section is an empty header (no image, no placeholder copy). Feels broken.
- Plant specs formatting: `Type` shows `Water_column` (underscore leak). Also several fields show `—` (Origin/Family), which reads like missing data rather than intentional.
- Products: category landing has no imagery per category (feels text-only), and many hardscape items show no price and product detail pages show “No offers yet” (fine, but needs a more intentional UX + sourcing plan).

## Daily Visual QA Notes (2026-02-10)

Observed from a fresh-session walkthrough (Home → Builder → Products → Plants → Builds → Sign-in → Profile):

- ✅ No broken links encountered in the primary nav + footer (About/Privacy/Terms/Report/Contact all load).
- Products → Hardscape list: some items show price as `—` (no offers) which reads a bit like missing/broken pricing.
  - Backlog: consider showing an explicit “No offers yet” state in lists (or hide the price column when offer count is 0).
- Product detail specs (e.g. Hardscape): spec keys render as raw snake_case (e.g. `hardscape_type`, `raises_gh`).
  - Backlog: humanize spec labels (Title Case + spaces) for product specs tables.
- Plants detail (spot-check): “Photo” section renders properly with the external image + disclaimer; plant info looks clean (no underscore leaks observed).
- Builds page: empty state copy/CTAs feel intentional.
- Profile (`/profile`): unauthenticated state is a clean sign-in prompt (no 404 / dead end).

## Known Risks / Blockers

- Rate limiting is best-effort in-memory. If traffic warrants, migrate to Redis/KV (see `decisions/0001-rate-limiting-store.md`).
- Sentry is wired in code but requires `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in Vercel and basic alert rules configured in Sentry UI (manual gate check).
- Required-specs gating is now enforced; next risk is filling missing specs/images/offers so curated picks remain usable.
- Ingestion runner is backend-only and must be scheduled outside request paths (Milestone E / E-07).

## How To Resume (target: <2 minutes)

1. Read: `AUTOPILOT.md`, then `PLAN_EXEC.md`, then `TODO.md`, then `PROGRESS.md`.
2. Run quick health checks:
   - `pnpm verify:gates`
   - `pnpm verify`
3. Start work on the top unchecked item in `TODO.md`.

## Admin Access (prod)

- `/admin/*` intentionally returns **404** unless `session.user.role === "admin"` (see `src/app/admin/layout.tsx`).
- Admins are bootstrapped by env: set Vercel `ADMIN_EMAILS` (Production) to a comma-separated list of allowed emails (see `src/server/auth.ts`).
- After changing `ADMIN_EMAILS`, trigger a new deploy and sign out/in to refresh the JWT role.

## No-Conflicts Rule (strict)

- Do not create new planning/checkpoint/roadmap files outside this system.
- Allowed tracking artifacts are:
  - `AUTOPILOT.md` (authoritative status + next actions)
  - `PLAN_EXEC.md` (execution checklist)
  - `TODO.md` (ready-now queue derived from PLAN_EXEC)
  - `PROGRESS.md` (append-only work log)
  - `VERIFY.md` (verification playbook)
  - `config/gates.json` + `scripts/gates.ts` (gate dashboard)
  - `decisions/*` (ADRs)
- If a new doc is needed, link it from `AUTOPILOT.md` and ensure it does not duplicate task tracking.
