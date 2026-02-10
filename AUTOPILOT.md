# AUTOPILOT - PlantedTankLab (Single Source Of Truth)

Last updated: 2026-02-10

This file is the single source of truth for: current status, what's next, and how to resume.

If anything disagrees with chat history or archived docs, **this file wins**.

## Current Milestone (14-day v1 plan)

- Milestone: D (Days 11-14) - Launchable
- Day: 11
- Current objective: finish the remaining launchable P0s (terms/legal copy sweep) and then run final QA (D-04).

## Launch Gates (G0-G11)

Source: `config/gates.json` (run: `pnpm verify:gates`)

- Current focus gates: G0 (Core Value Works), G4 (Data Integrity), G9 (Trust & Compliance)

## What Changed Last

- D-02 report-a-problem intake shipped: `/report` form → `problem_reports` DB table + admin triage at `/admin/reports` with resolve/dismiss actions.
- Report-a-problem link added to the site footer.
- Verified: `pnpm verify`.

## Next 3 Tasks (do these in order)

1. D-03 (P0) Terms page + final copy/legal sweep.
   Entry points: `/terms` page, privacy + affiliate disclosure copy pass.
2. D-04 (P0) Final QA + performance checks + "go/no-go" gate verification.
   Entry points: `pnpm verify`, `pnpm verify:gates`, manual QA checklist.
3. (Stretch) G0/G1/G9 manual verification pass in production (core flow + auth + compliance spot-checks).

## Daily Visual QA Notes (2026-02-09)

Observed from a fresh-session walkthrough (Home → Builder → Products → Plants → Builds → Sign-in):

- Builder: copy bug: “Choose a Accessories” (should be “Choose Accessories” / “Choose an accessory”).
- Plants list: page positions itself as “image-forward”, but many curated picks render with no image.
- Plant detail pages: “Photo” section is an empty header (no image, no placeholder copy). Feels broken.
- Plant specs formatting: `Type` shows `Water_column` (underscore leak). Also several fields show `—` (Origin/Family), which reads like missing data rather than intentional.
- Products: category landing has no imagery per category (feels text-only), and many hardscape items show no price and product detail pages show “No offers yet” (fine, but needs a more intentional UX + sourcing plan).

## Known Risks / Blockers

- Rate limiting is best-effort in-memory. If traffic warrants, migrate to Redis/KV (see `decisions/0001-rate-limiting-store.md`).
- Sentry is wired in code but requires `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in Vercel and basic alert rules configured in Sentry UI (manual gate check).
- Required-specs gating is now enforced; next risk is filling missing specs/images/offers so curated picks remain usable.

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
