# PROGRESS (Append-only)

This file is an append-only changelog of work completed.

Each work session must add a new dated entry that includes:
- what changed
- what was verified
- what's next (by `PLAN_EXEC.md` task ID)

---

## 2026-02-08

- Work: repo audit + planning-system cleanup started; new Autopilot tracking system added (see `AUTOPILOT.md`).
- Verified: pending (run `pnpm verify` after commits).
- Next: OPS-01..OPS-06 then A-01 (see `TODO.md`).

## 2026-02-08 18:00

- Work: Completed repo operating system (Autopilot tracking + gates dashboard) and archived legacy planning (`3d56cf5`). Added route error boundaries + not-found UX (root + builder/products/plants/builds) and e2e coverage (`e71605f`). Stabilized typecheck by generating typed routes before `tsc` (`ae3f8ea`).
- Verified: `pnpm verify` (lint + typecheck + unit + e2e + build) passed. `pnpm verify:gates` prints gates dashboard.
- Next: A-02, A-03, A-04 (see `TODO.md`).

## 2026-02-08 18:50

- Work: Added baseline security headers via `next.config.ts` (`aa7f24a`).
- Verified: `curl -I http://localhost:3000` shows nosniff/referrer/permissions/x-frame-options in dev. `pnpm verify` passed.
- Next: A-03, A-04, A-05 (see `TODO.md`).

## 2026-02-08 19:10

- Work: Added best-effort rate limiting for `/api/trpc/*` and `/go/*` via `src/proxy.ts` (`0400772`). Added ADR `decisions/0001-rate-limiting-store.md`.
- Verified: `pnpm verify` passed. Manual local loop returned 429s after exceeding the per-minute limit.
- Next: A-04, A-05 (see `TODO.md`).

## 2026-02-08 19:20

- Work: Verified rate limiting in production and marked Gate G6 as PASS in `config/gates.json`.
- Verified: `pnpm verify:gates` prints G6 as PASS.
- Next: A-04, A-05 (see `TODO.md`).

## 2026-02-08 19:40

- Work: Added request IDs and structured server logs for `/api/trpc/*` and `/go/*` (`ed8e558`).
- Verified: `pnpm verify` passed.
- Next: A-05, B-01 (see `TODO.md`).

## 2026-02-09 20:05

- Work: Wired Sentry error reporting for server + client (Next instrumentation hooks + route/global error boundaries) and added ADR 0002 (`621d635`).
- Verified: `pnpm verify` passed (lint + typecheck + unit + e2e + build).
- Next: B-01, B-02, B-03 (see `TODO.md`).

## 2026-02-09 20:55

- Work: Completed B-01 required-specs contracts + missing-data UX. Added `src/engine/required-specs.ts`, surfaced "insufficient data" notes in the engine, and updated builder pickers to distinguish incompatible vs missing-data with a "Show hidden" toggle (`e50f638`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: B-02, B-03, B-04 (see `TODO.md`).

## 2026-02-09 21:25

- Work: Completed B-02 admin categories CRUD + reorder at `/admin/categories` (create, edit, move up/down) and wired builder stepper ordering to follow `categories.display_order` for core/extras grouping (`c27e483`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: B-03, B-04, B-05 (see `TODO.md`).

## 2026-02-09 22:05

- Work: Completed B-03 CSV exports for products/plants/offers via `/admin/exports/*` and added CSV formatting utilities + unit tests (`b37bd37`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: B-04, B-05, C-01 (see `TODO.md`).

## 2026-02-09 22:30

- Work: Completed B-04 audit logging expansion for product + plant save/upload routes (actions now visible in `/admin/logs`) (`7533133`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Next: B-05, C-01, C-02 (see `TODO.md`).
