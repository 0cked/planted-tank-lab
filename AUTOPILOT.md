# AUTOPILOT - PlantedTankLab (Single Source Of Truth)

Last updated: 2026-02-08

This file is the single source of truth for: current status, what's next, and how to resume.

If anything disagrees with chat history or archived docs, **this file wins**.

## Current Milestone (14-day v1 plan)

- Milestone: A (Days 1-3) - Safe To Be Public
- Day: 1
- Current objective: baseline reliability + security + observability so we can safely invite users.

## Launch Gates (G0-G11)

Source: `config/gates.json` (run: `pnpm verify:gates`)

- Current focus gates: G5 (Failure UX), G7 (Observability), G6 (Abuse Protection)

## What Changed Last

- Repository operating system created (AUTOPILOT/PLAN_EXEC/VERIFY/TODO/PROGRESS + gates dashboard). (`3d56cf5`)
- Route error boundaries + not-found pages added (root + core segments). (`e71605f`)
- Typecheck stabilized with `next typegen` for typed routes. (`ae3f8ea`)
- Baseline security headers added (HSTS in prod + nosniff/referrer/permissions/x-frame-options). (`aa7f24a`)
- Rate limiting added for `/api/trpc/*` and `/go/*` via `src/proxy.ts` (ADR 0001). (`0400772`)
- Request IDs + structured server logs added for `/api/trpc/*` and `/go/*`. (`ed8e558`)

## Next 3 Tasks (do these in order)

1. A-05 (P0) Error reporting + alerting.
   Entry points: vendor SDK wiring + server/client capture hooks, plus ADR.
2. B-01 (P0) Required-specs contracts + missing-data UX for compatibility rules.
   Entry points: `src/engine/evaluate.ts`, `src/engine/types.ts`, `src/components/builder/BuilderPage.tsx`, plus unit tests in `tests/engine/*`.
3. B-02 (P0) Admin categories CRUD + reorder.
   Entry points: `src/app/admin/*` and tRPC admin routers for categories.

## Known Risks / Blockers

- Rate limiting is best-effort in-memory. If traffic warrants, migrate to Redis/KV (see `decisions/0001-rate-limiting-store.md`).
- Error reporting vendor choice (Sentry vs Vercel only) is undecided; requires an ADR before wiring alerts.
- Data completeness can silently undermine trust; must fail closed for curated picks and surface missing-data states.

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
