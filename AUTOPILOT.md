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

## Next 3 Tasks (do these in order)

1. A-02 (P0) Add baseline security headers (non-breaking).
   Entry points: `src/middleware.ts` (preferred) or `next.config.ts` headers.
2. A-03 (P0) Add rate limiting for hot endpoints (`/go/*`, `/api/trpc`, share/build routes).
   Entry points: `src/middleware.ts`, `src/app/go/[offerId]/route.ts`, `src/app/api/trpc/[trpc]/route.ts`, plus ADR.
3. A-04 (P0) Structured server logging + request IDs.
   Entry points: `src/app/api/trpc/[trpc]/route.ts`, `src/app/go/[offerId]/route.ts`, plus shared logger helper.

## Known Risks / Blockers

- Rate limiting store choice (KV vs DB vs edge-in-memory) is undecided; requires an ADR before implementation.
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
