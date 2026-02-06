# Bootstrap Infrastructure and Deliver Foundation Stack

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Establish fully working project infrastructure and baseline application foundation for PlantedTankLab: GitHub repo wiring, environment/secrets setup, Vercel + Cloudflare + Supabase integration, Next.js + TypeScript scaffold, complete Drizzle schema, tRPC plumbing, initial seed data, baseline pages, and production verification. At the end, the app should run locally, deploy from `main`, resolve at `https://plantedtanklab.com`, and render builder categories from database data via tRPC.

## Progress

- [x] (2026-02-06) Read `PLAN.md`, `AGENTS.md`, and `.agent/PLANS.md` completely.
- [x] (2026-02-06) Authored this ExecPlan before implementation work.
- [x] (2026-02-06) Initialized git repo, created GitHub repo, and made initial docs commit.
- [x] (2026-02-06) Generated `.env.local` and `.env.example` from `.secrets/` (with URL-encoded DB password).
- [x] (2026-02-06) Linked Vercel project and set env vars for production/preview/development.
- [x] (2026-02-06) Cleaned Cloudflare DNS and created DNS-only CNAMEs for apex + `www`.
- [x] (2026-02-06) Verified `curl -I https://plantedtanklab.com` reaches Vercel (404 acceptable at this stage).
- [x] (2026-02-06) Verified DB connectivity via `SELECT 1` (Python `psycopg`).
- [ ] (pending) Milestone 0 commit + push.
- [ ] Milestone 1: Next.js scaffold and dependencies complete.
- [ ] Milestone 2: Full database schema implemented and pushed.
- [ ] Milestone 3: tRPC context/router/handlers/provider wired.
- [ ] Milestone 4: Seed data + seeding script created and executed.
- [ ] Milestone 5: Basic pages implemented with data pipeline proof.
- [ ] Milestone 6: Full verification, deploy, and production smoke checks complete.
- [ ] Milestone commit series complete and pushed to `main`.

## Surprises & Discoveries

- Observation: Cloudflare secret filenames are uppercase (`.secrets/cloudflare/API_TOKEN.txt`, `.secrets/cloudflare/ACCOUNT_ID.txt`) rather than the lowercase names in `AGENTS.md`.
  Evidence: `find .secrets -maxdepth 3 -type f` showed uppercase filenames.
- Observation: Supabase DB password contains `@` and must be URL-encoded inside `DATABASE_URL` or PostgreSQL clients mis-parse the host/userinfo.
  Evidence: Initial connection attempt failed; URL-encoding fixed connection and `SELECT 1` returned successfully.
- Observation: `vercel domains inspect plantedtanklab.com` reports association with an older project name even though aliases point to the deployment created by this repo-linked project.
  Evidence: `vercel alias list` shows `plantedtanklab.com` and `www.plantedtanklab.com` aliased to the `planted-tank-lab` production deployment URL.

## Decision Log

- Decision: Use the schema and rule/table names from `PLAN.md` Section 3.3 as source of truth for Milestone 2.
  Rationale: The user explicitly requested the complete schema from that section.
  Date: 2026-02-06
- Decision: Keep secrets in `.env.local` only and generate `.env.example` with placeholders.
  Rationale: Required by `AGENTS.md` and security constraints.
  Date: 2026-02-06

## Outcomes & Retrospective

- Pending implementation.

## Context and Orientation

Current repository currently contains planning docs and secrets directory:
- `PLAN.md` defines product behavior, schema, rules, and milestone expectations.
- `AGENTS.md` defines required infra sequence, coding conventions, and operational constraints.
- `.agent/PLANS.md` defines ExecPlan quality bar and maintenance expectations.
- `.secrets/cloudflare/*` and `.secrets/supabase/supabaseinfo.txt` hold credentials for infra setup.

Key target files that will be created/updated:
- Infra/config: `.gitignore`, `.env.local`, `.env.example`, `package.json`, `next.config.ts`, `drizzle.config.ts`, `tsconfig.json`
- App: `src/app/**`
- DB: `src/server/db/index.ts`, `src/server/db/schema.ts`
- tRPC: `src/server/trpc/**`, `src/app/api/trpc/[trpc]/route.ts`, provider in `src/components`
- Seed: `data/**`, `scripts/seed.ts`

Definitions:
- Transaction pooler URL: Supabase pooled PostgreSQL connection string on port `5432`.
- DNS-only (Cloudflare gray cloud): `proxied: false`; required for Vercel-managed SSL.
- Hard/soft compatibility semantics: rule severities represented in `compatibility_rules` and surfaced in UI.

## Plan of Work

1. Establish repository/infrastructure baseline before writing app code.
2. Generate `.env.local` from `.secrets`, then mirror placeholders in `.env.example`.
3. Create/link Vercel project; add all required env vars for production/preview/development.
4. Normalize Cloudflare DNS for apex and `www` with DNS-only CNAMEs to `cname.vercel-dns.com`; clear stale records/rules/routes.
5. Attach custom domains in Vercel and connect Git integration.
6. Scaffold Next.js App Router project with TypeScript + Tailwind and install all required dependencies.
7. Implement complete Drizzle schema and DB connection; push schema to Supabase.
8. Implement tRPC context/root/subrouters/handler/provider.
9. Create seed JSON datasets and idempotent upsert seed script; run seed.
10. Build minimal home/builder/products/plants pages proving DB → tRPC → UI flow.
11. Run lint/typecheck/tests/build/dev checks; push to `main`; verify production URL.

## Milestones

### Milestone 0: Infrastructure Bootstrap

Scope: GitHub repo configured, env files prepared, Vercel/Cloudflare/domain wired, DB connectivity verified.

Steps:
1. Initialize/verify git repo and remote via `gh repo create ... --source=. --remote=origin`.
2. Create `.gitignore` immediately with required ignores.
3. Commit baseline docs + `.gitignore`.
4. Parse `.secrets/supabase/supabaseinfo.txt`; generate `NEXTAUTH_SECRET`; write `.env.local` and `.env.example`.
5. Run `vercel --yes`, then `vercel env add` for required variables in all target environments.
6. Use Cloudflare API to find zone, list records, delete stale apex/www A/AAAA/CNAME, clear stale Page Rules and Workers Routes.
7. Create DNS-only CNAME records for apex and `www` to `cname.vercel-dns.com`.
8. Add domains in Vercel and run `vercel git connect`.
9. Verify via `gh repo view`, `vercel ls`, `vercel domains ls`, `curl -I https://plantedtanklab.com`, and a DB `SELECT 1`.

Validation:
- All verification commands succeed.
- Domain resolves over HTTPS.
- Supabase pooler connection returns `1`.

### Milestone 1: Project Scaffolding

Scope: Next.js 14+ App Router workspace with required dependencies and directory skeleton.

Steps:
1. Run Next.js initialization command with pnpm and src-dir.
2. Install production and dev dependencies from the prompt.
3. Ensure strict TypeScript and alias config.
4. Create `drizzle.config.ts` and missing directory skeleton from `AGENTS.md`.

Validation:
- `pnpm install` clean.
- `pnpm lint && pnpm typecheck` pass.

### Milestone 2: Database Schema

Scope: Complete Drizzle schema from `PLAN.md` Section 3.3 plus DB connector.

Steps:
1. Implement all requested tables, constraints, enums/checks, and indexes in `src/server/db/schema.ts`.
2. Add `src/server/db/index.ts` using `postgres` + Drizzle with `DATABASE_URL`.
3. Push schema with Drizzle Kit to Supabase.
4. Confirm table presence through introspection query.

Validation:
- `pnpm drizzle-kit push` succeeds.
- Query confirms all tables exist.

### Milestone 3: tRPC Setup

Scope: Backend API wiring with root router + stub routers and client provider.

Steps:
1. Create tRPC context containing DB and optional session placeholder.
2. Create subrouters for products/plants/builds/offers/rules/users with at least one list query.
3. Merge into root router and expose route handler at `src/app/api/trpc/[trpc]/route.ts`.
4. Add client-side provider wrapper and include it in app layout.

Validation:
- Typecheck passes.
- A page can call at least one tRPC query successfully.

### Milestone 4: Seed Data

Scope: JSON seed files and idempotent upsert seed script inserting categories/products/plants/rules.

Steps:
1. Create required JSON files (`data/categories.json`, `data/products/tanks.json`, `data/products/lights.json`, `data/plants.json`, `data/rules.json`).
2. Implement `scripts/seed.ts` with validated parsing and upsert logic.
3. Add `seed` script in `package.json` and run `pnpm seed`.
4. Verify row counts in DB.

Validation:
- `pnpm seed` succeeds repeatedly without duplication.
- Expected records present.

### Milestone 5: Basic Pages

Scope: Minimal clean pages for home, builder, products, plants with working data fetch path.

Steps:
1. Implement root layout with global styles and tRPC provider.
2. Implement home page CTA/link to `/builder`.
3. Implement `/builder` page rendering categories from DB/tRPC.
4. Add placeholder `/products` and `/plants` pages.

Validation:
- `pnpm dev` renders all pages.
- Builder visibly lists seeded categories.

### Milestone 6: Verify Everything + Deploy

Scope: Full local verification, push `main`, and production accessibility check.

Steps:
1. Run `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
2. Commit final verification/deploy milestone.
3. Push to `origin main`.
4. Confirm Vercel production deployment and live domain response.

Validation:
- All quality gates pass.
- `https://plantedtanklab.com` loads.

## Validation and Acceptance

Acceptance checklist:
- Infrastructure checks from Milestone 0 all pass.
- Database schema and seed data exist in Supabase.
- Builder page pulls categories from DB-backed API pipeline.
- Local build/lint/type/test commands pass.
- Main branch deployment auto-publishes and domain responds over HTTPS.

## Idempotence and Recovery

- Cloudflare cleanup and record creation scripts are written to be rerunnable; stale entries are deleted before creation.
- Seed script uses upsert semantics for safe re-runs.
- If `vercel env add` duplicates are attempted, remove and re-add values explicitly.
- If schema push fails, fix schema then rerun `pnpm drizzle-kit push`.
- If deployment fails, use `vercel --prod --yes` to force a known-good deploy after fixing issues.

## Interfaces and Dependencies

Required libraries/services at end state:
- Runtime: `next`, `react`, `react-dom`, `drizzle-orm`, `postgres`, `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`, `zod`, `zustand`, `nanoid`, `next-auth`, Radix primitives.
- Dev: `drizzle-kit`, `vitest`, `@testing-library/react`, `playwright`, `prettier`, `typescript`.
- External services: GitHub repo via `gh`, Vercel project+domains, Cloudflare DNS config, Supabase PostgreSQL via pooler.

Target interfaces:
- `createTRPCContext(): { db, session? }`
- `appRouter` exporting merged routers in `src/server/trpc/router.ts`
- `products.list`, `plants.list`, `builds.list`, `offers.list`, `rules.list`, `users.list` queries
- `db` export from `src/server/db/index.ts` ready for server-side usage
