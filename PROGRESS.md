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

## 2026-02-09 23:00

- Work: Completed B-05 data quality dashboard at `/admin/quality` (curated products missing images/offers/required specs; plants missing images/sources) (`5487f7f`).
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Next: C-01, C-02, C-03 (see `TODO.md`).

## 2026-02-10

- Work: Updated execution plan to align with the public-launch UX overhaul proposal (Phase A/B/C), with Phase A folded into C-03. Updated `AUTOPILOT.md` + `TODO.md` accordingly.
- Verified: pending (run `pnpm verify` after implementing C-03 changes).
- Next: C-03 (Phase A builder UX: drawer/bottom sheet picker + compatibility-first flow).

## 2026-02-10 20:30

- Work: Completed C-03 Phase A builder UX. Pickers are now a drawer/bottom sheet with sticky search; builder shows a strong “Next recommended” CTA; row actions have correct hover cursor affordances. Updated plant list/detail to use `SmartImage` so remote images never crash Next/Image in production/tests. (`9818700`)
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: C-04, C-05, C-06.

## 2026-02-10 21:15

- Work: Completed C-04 auth entrypoint. Added a prominent top-nav “Sign up” CTA + “Sign in” link (stable, never 404). `/sign-up` and `/sign-in` redirect to `/login` with mode hints. Added friendly error messaging on `/login`. Fixed Google OAuth env on Vercel Production (removed newline from `NEXTAUTH_URL`, set `GOOGLE_CLIENT_SECRET`) and redeployed.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`. Manual: POST to `/api/auth/signin/google` returns Google auth URL.
- Next: C-05, C-06, D-01.

## 2026-02-09

- Work: Completed C-01 curated catalog completeness for core builder categories (tank/light/filter/substrate). Added `scripts/catalog-check.ts` + `pnpm catalog:check`; seeded placeholder `image_url` for curated core items and filled required substrate/filter spec keys for compatibility rules.
- Verified: `pnpm catalog:check`; `pnpm verify`.
- Next: C-02, C-03 (see `TODO.md`).

- Work: Completed C-02 plant content baseline for the top 30 plants in `data/plants.json` by adding missing citations (`sources`) and filling missing `image_url` where absent.
- Verified: spot-check list integrity (first 30 have sources + image_url); `pnpm verify`.
- Next: C-03 (see `TODO.md`).

## 2026-02-09 10:45

- Work: Began C-03 builder UX cleanup:
  - Removed confusing “+ Choose a X” non-clickable label; replaced empty selection state with a clickable “Choose a X” link.
  - Button label logic now uses `hasSelection` instead of string prefix checks.
  - Added stable `data-testid="category-row-*-action"` for the row action button; updated builder Playwright tests.
  - Stabilized local DB usage against Supabase pooler by disabling prepared statements when `DATABASE_URL` is the pooler (`prepare: false`) + conservative pooling.
- Verified: `pnpm verify`.
- Next: continue C-03 (completion panel + offers-empty UX).

## 2026-02-09 12:15

- Work: Daily visual QA walkthrough on plantedtanklab.com (Home → Builder → Products → Plants → Builds → Sign-in).
  Findings:
  - Builder: grammar bug “Choose a Accessories”.
  - Plants: curated list is pitched as image-forward but many cards render without images; plant detail “Photo” section is an empty header.
  - Plant data: enum formatting leak (`Water_column`), and several fields show raw `—` (Origin/Family).
  - Products/hardscape: many items show missing price/offers; detail pages rely on “No offers yet” messaging.
- Verified: manual walkthrough in a fresh browser session.
- Next: fold fixes into C-03 (empty states + copy) and C-06 (images/offers/content completeness).

## 2026-02-09 16:05

- Work: Fixed builder picker dialog title grammar for plural category names (e.g. “Choose Accessories” instead of “Choose a Accessories”) (`5808a1c`).
- Verified: `pnpm verify:gates`; `pnpm test`.
- Next: continue C-03 (completion panel + offers-empty UX + intentional Photo empty states).

## 2026-02-09 21:30

- Work: Completed C-05 shared build snapshot polish:
  - Added active top-nav highlighting via `aria-current="page"` (new `SiteNav` component).
  - Clarified “Open in builder” behavior and added product links on the snapshot page.
  - Updated Playwright smoke tests to cover share → snapshot → open-in-builder flow.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.
- Next: C-06, C-07, D-01.

## 2026-02-09 21:45

- Work: Fixed `pnpm build` failing on `/login` by wrapping `LoginPanel` (uses `useSearchParams`) in a Suspense boundary.
- Verified: `pnpm build`.
- Next: C-06, C-07, D-01.

## 2026-02-09 22:10

- Work: Completed C-06 content + imagery baseline:
  - Plants: filled missing images and sources in `data/plants.json` (added helper scripts to keep this repeatable) and reseeded.
  - Plants detail: made Plant info rows hide missing fields and humanize enum labels (no more `water_column` underscore leak).
  - Products: made category browsing more image-forward and ensured lists/details show a graceful photo fallback when product photos are missing.
- Verified: `pnpm seed`; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Next: C-07, C-08, D-01.
