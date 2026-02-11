# AUTOPILOT - PlantedTankLab (Single Source Of Truth)

Last updated: 2026-02-10

This file is the single source of truth for: current status, what's next, and how to resume.

If anything disagrees with chat history or archived docs, **this file wins**.

## Current Milestone

- Milestone: F - Fly.io Migration (Web + Workers)
- Day: 1
- Current objective: move production hosting from Vercel to Fly.io (ADR 0004) to support long-running ingestion workers and scheduling, while keeping the trust-first architecture contract intact (ADR 0003).

## Launch Gates (G0-G11)

Source: `config/gates.json` (run: `pnpm verify:gates`)

- Current focus gates: G0 (Core Value Works), G4 (Data Integrity), G9 (Trust & Compliance)

## What Changed Last

- Added Fly.io deployment artifacts: `Dockerfile`, `.dockerignore`, `fly.toml`.
- Added long-running ingestion ops:
  - `pnpm ingest daemon` (worker loop)
  - `pnpm ingest schedule --loop` (scheduler loop that enqueues periodic ingestion jobs)
- Updated agent contract + docs for Fly hosting (ADR 0004): `AGENTS.md`, `README.md`.
- Added optional CI deploy workflow: `.github/workflows/fly-deploy.yml` (requires `FLY_API_TOKEN`).
- Hardened verification: Playwright now runs against a production build (`pnpm test:e2e` builds then runs tests); `pnpm verify` PASS.

## Next 3 Tasks (do these in order)

1. F-04 (P0) Provision Fly app + deploy (web + worker + scheduler), verify basic health.
   Entry points: `fly.toml`, `Dockerfile`, `README.md` (Fly deploy steps).
2. F-05 (P0) Cut DNS from Vercel → Fly (Cloudflare), verify certs + auth callbacks.
   Entry points: Cloudflare DNS + `fly certs add` / `fly ips list` runbook.
3. E-04 (P0) Seed/import flows through ingestion → normalization (no bypass).
   Entry points: `scripts/seed.ts`, `src/server/ingestion/*`, `src/server/normalization/*`.

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
- Sentry is wired in code but requires `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in production environment and basic alert rules configured in Sentry UI (manual gate check).
- Required-specs gating is now enforced; next risk is filling missing specs/images/offers so curated picks remain usable.
- Fly.io migration requires `fly auth login` on the machine running deploys. Until Fly is deployed and DNS is cut over, production remains on Vercel.
- Google OAuth redirect URIs are configured for `https://plantedtanklab.com/api/auth/callback/google`; this will work once the domain is serving from Fly.

## How To Resume (target: <2 minutes)

1. Read: `AUTOPILOT.md`, then `PLAN_EXEC.md`, then `TODO.md`, then `PROGRESS.md`.
2. Run quick health checks:
   - `pnpm verify:gates`
   - `pnpm verify`
3. Start work on the top unchecked item in `TODO.md`.

## Admin Access (prod)

- `/admin/*` intentionally returns **404** unless `session.user.role === "admin"` (see `src/app/admin/layout.tsx`).
- Admins are bootstrapped by env: set `ADMIN_EMAILS` (production secrets) to a comma-separated list of allowed emails (see `src/server/auth.ts`).
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
