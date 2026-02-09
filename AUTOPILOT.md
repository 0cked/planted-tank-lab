# AUTOPILOT - PlantedTankLab (Single Source Of Truth)

Last updated: 2026-02-09

This file is the single source of truth for: current status, what's next, and how to resume.

If anything disagrees with chat history or archived docs, **this file wins**.

## Current Milestone (14-day v1 plan)

- Milestone: B (Days 4-7) - Trust & Ops
- Day: 4
- Current objective: tighten data integrity + admin ops so the builder feels trustworthy and maintainable.

## Launch Gates (G0-G11)

Source: `config/gates.json` (run: `pnpm verify:gates`)

- Current focus gates: G4 (Data Integrity), G2 (Admin Access Control), G9 (Trust & Compliance)

## What Changed Last

- Repository operating system created (AUTOPILOT/PLAN_EXEC/VERIFY/TODO/PROGRESS + gates dashboard). (`3d56cf5`)
- Route error boundaries + not-found pages added (root + core segments). (`e71605f`)
- Typecheck stabilized with `next typegen` for typed routes. (`ae3f8ea`)
- Baseline security headers added (HSTS in prod + nosniff/referrer/permissions/x-frame-options). (`aa7f24a`)
- Rate limiting added for `/api/trpc/*` and `/go/*` via `src/proxy.ts` (ADR 0001). (`0400772`)
- Request IDs + structured server logs added for `/api/trpc/*` and `/go/*`. (`ed8e558`)
- Sentry error reporting wired (server + client + instrumentation hooks). (`621d635`)
- Required-specs contracts + missing-data UX added (engine emits insufficient-data notes; curated mode fails closed; picker UI distinguishes incompatible vs missing data). (`e50f638`)
- Admin categories CRUD + reorder added at `/admin/categories`; builder stepper now follows `categories.display_order` for core/extras ordering. (`c27e483`)
- Admin CSV exports added for products/plants/offers with audit logging + unit tests. (`b37bd37`)
- Expanded admin audit logging coverage for product/plant saves and uploads. (`7533133`)

## Next 3 Tasks (do these in order)

1. B-05 (P1) Data quality dashboard (missing images/offers/specs).
   Entry points: `src/app/admin/*`, `src/server/services/admin/*`.
2. C-01 (P0) Curated catalog completeness pass (core flow).
   Entry points: `scripts/*`, `src/app/admin/*`, `data/*`.
3. C-02 (P0) Plant content baseline for top 30 plants.
   Entry points: `data/*`, `scripts/*`, `src/app/admin/plants/*`.

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
