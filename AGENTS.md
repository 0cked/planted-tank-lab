# PlantedTankLab — Agent Instructions

## Operating System (Single Source Of Truth)

This repo is run via a small set of tracking artifacts so work is resumable across
sessions without relying on chat history.

Authoritative status + next actions:
- `AUTOPILOT.md`

Supporting artifacts:
- `PLAN_EXEC.md` (execution checklist; tasks link to launch gates)
- `PROGRESS.md` (append-only work log; every session must append)
- `VERIFY.md` (verification playbook + definition of done)
- Gate dashboard: `config/gates.json` + `scripts/gates.ts` (run `pnpm verify:gates`)
- ADRs: `decisions/*`
- Historical planning: `archive/planning/*` (not authoritative)

### Session Startup Ritual (required)

1. Read: `AUTOPILOT.md`, `PLAN_EXEC.md`, `PROGRESS.md`.
2. Run:
   - `pnpm verify:gates`
   - `pnpm verify`
3. Start work on the first unchecked `[ ]` task in `PLAN_EXEC.md`.

### Execution Loop (required)

1. Implement the task end-to-end (code + tests).
2. Verify with `pnpm verify` (or the closest applicable subset if blocked).
3. Update tracking artifacts:
   - `AUTOPILOT.md` (status, "what changed last", next 3 tasks)
   - `PROGRESS.md` (append a dated entry)
   - `config/gates.json` (if gate status changes; set `lastVerifiedAt`)
   - `decisions/*` (if a high-impact decision was made)
4. Commit with a conventional commit message.

### No-Conflicts Rule (strict)

Do not create new planning/checkpoint/roadmap files outside the Autopilot system.
If a new doc is needed, it must be linked from `AUTOPILOT.md` and must not duplicate
task tracking.

Allowed planning artifacts:
- `AUTOPILOT.md`
- `PLAN_EXEC.md`
- `PROGRESS.md`
- `VERIFY.md`

## Architecture Contract (Non-Negotiable)

PlantedTankLab is a **trust-first** platform. Correctness, determinism, provenance,
and long-term maintainability come before speed or novelty.

### Mandatory System Boundaries

Architecture flow (structural, not “by convention”):

Raw ingestion → Normalization → Canonical storage → Cached derivatives → Presentation

Rules:
- **Ingestion/scraping must be backend-only and must not run in request/response paths.**
  API routes may enqueue jobs, but may not fetch external sources.
- **No UI/tRPC/API code may fetch external sources.** Presentation consumes only canonical
  DB data and cached derivatives.
- **No reconciliation/duplicate-resolution logic outside normalization.**
  Presentation must never “guess” or merge entities.

Code ownership:
- Ingestion sources + job runner: `src/server/ingestion/*` + `scripts/ingest.ts`
- Normalization + matching + overrides: `src/server/normalization/*`
- Canonical entities live in `src/server/db/schema.ts` (Drizzle) and are the only tables
  used by the app UI.
- Cached derivatives are implemented via `src/server/cache/*` and/or explicit cached tables.

### Provenance + Trust Requirements

- Every ingested field must record:
  - source (and source entity identifier)
  - timestamp(s)
  - trust level (per-field, not just per-record)
- Raw source payloads must be preserved (HTML/JSON) and linked to canonical outcomes.
- Conflicts are resolved deterministically via explicit precedence rules and recorded decisions.
- Manual corrections/overrides must be supported and must win over automated data.

### Caching & SSR Defaults

- Assume read-heavy usage.
- Cache aggressively at safe boundaries with explicit:
  - cache keys
  - TTLs
  - invalidation rules (triggered by ingestion/normalization updates)
- Prefer Server Components/SSR for data-heavy views (catalog, details, comparisons).
  Use client JS only for progressive enhancement. The builder may remain client-driven,
  but should still SSR a deterministic shell and rely only on canonical data.

## Project Overview

PlantedTankLab is "PCPartPicker for planted aquariums." Users build a planted aquarium setup by selecting compatible equipment (tank, light, filter, CO2, substrate, plants, ferts, heater, etc.) with real-time compatibility checking, price comparison, and affiliate monetization.

Product specification:
- `PLAN.md` (spec only; not authoritative for current progress)

## Secrets & Credentials

All credentials live in `.secrets/` at the repo root. This folder is gitignored and must NEVER be committed.

```
.secrets/
├── cloudflare/
│   ├── account-id.txt        ← Cloudflare account ID (plain text, trimmed)
│   └── api-token.txt         ← Cloudflare API token (plain text, trimmed)
├── supabase/
│   └── supabaseinfo.txt      ← Contains: Project URL, anon/publishable key,
│                                 service_role/secret key, DB password,
│                                 and pooler connection string
```

When reading secrets from these files, always `trim()` the contents to remove trailing newlines or whitespace.

### Cloudflare Token Scopes
The API token has these permissions:
- Account-level: D1:Edit, Cloudflare Pages:Edit, Workers R2 Storage:Edit, Workers KV Storage:Edit, Workers Scripts:Edit, Account Settings:Read
- Zone-level (plantedtanklab.com): Zone:Read, Workers Routes:Edit, Cache Purge:Purge, Page Rules:Edit, DNS:Edit

### Supabase Info File Format
The `supabaseinfo.txt` file contains the following values. Parse the file to extract each one:
- Project URL (https://xxxxx.supabase.co) → use as `NEXT_PUBLIC_SUPABASE_URL`
- Publishable/anon key → use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Secret/service_role key → use as `SUPABASE_SERVICE_ROLE_KEY`
- DB password → substitute into the pooler connection string where it says `[YOUR-PASSWORD]`
- Pooler connection string (postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres) → after password substitution, use as `DATABASE_URL`

### Authenticated CLIs Available
The system has these CLIs available:
- **Fly.io CLI** (`fly`) — may require `fly auth login` on first use.
- **GitHub CLI** (`gh`) — authenticated via `gh auth login`. Use for repo creation and management.
- **pnpm** — available globally.

Legacy (do not use for production): **Vercel CLI** (`vercel`).

## Platform Setup (Must Be Done First)

Production hosting is **Fly.io** (ADR 0004), with Supabase Postgres for storage and Cloudflare for DNS.

This repo’s infrastructure is already bootstrapped. The steps below are retained as a runbook for re-provisioning a new environment, but **do not change production DNS** unless you intend to cut traffic over.

Before any application code is written, the full infrastructure must be bootstrapped. This is Milestone 0.

### Step 1: GitHub Repository
```bash
# Create the repo on GitHub and initialize locally
gh repo create planted-tank-lab --public --description "PCPartPicker for planted aquariums" --clone
cd planted-tank-lab
# OR if already in the project directory:
git init
gh repo create planted-tank-lab --public --source=. --remote=origin --push
```

### Step 2: Create .gitignore Immediately
Before any other files are committed, create `.gitignore` with:
```
node_modules/
.next/
.env.local
.env*.local
.secrets/
.vercel/
*.tsbuildinfo
```

### Step 3: Parse Secrets and Build .env.local
Write a script or manually read the files in `.secrets/` to construct `.env.local`:
```bash
# Read Supabase info
cat .secrets/supabase/supabaseinfo.txt
# Extract values and construct:
```
The resulting `.env.local` should contain:
```
DATABASE_URL=postgresql://postgres.xxxxx:<actual-password>@aws-0-us-west-2.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

### Step 4: Fly.io App Setup
```bash
# Install + login
brew install flyctl
fly auth login

# Create app (name must be globally unique)
fly apps create plantedtanklab-web

# Set required secrets (plus Google + optional email magic links)
fly secrets set DATABASE_URL="..." NEXTAUTH_SECRET="..." NEXTAUTH_URL="https://plantedtanklab.com"

# Deploy web + worker image
fly deploy

# Ensure long-running processes are enabled (web + ingestion worker + scheduler)
fly scale count app=1 worker=1 scheduler=1
```

### Step 5: Cloudflare DNS Configuration
Use the Cloudflare API directly. The domain may have stale records from previous project attempts — clean them up.

```bash
CF_TOKEN=$(cat .secrets/cloudflare/api-token.txt | tr -d '[:space:]')
CF_ACCOUNT=$(cat .secrets/cloudflare/account-id.txt | tr -d '[:space:]')

# 1. Get the zone ID for plantedtanklab.com
curl -s -H "Authorization: Bearer $CF_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=plantedtanklab.com" | jq '.result[0].id'

# 2. List ALL existing DNS records
curl -s -H "Authorization: Bearer $CF_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records" | jq '.result'

# 3. DELETE any stale A, AAAA, or CNAME records for @ and www
#    (loop through results and delete by record ID)

# 4. Configure DNS for Fly.io (DNS-only mode recommended initially)
#
# Add certs in Fly:
#   fly certs add plantedtanklab.com
#   fly certs add www.plantedtanklab.com
#
# Then get Fly IPs:
#   fly ips list
#
# Root (@) should point to the Fly anycast IP(s) via A/AAAA records.
# www can be a CNAME to `plantedtanklab-web.fly.dev` (or A/AAAA as well).
```

**Critical Cloudflare notes:**
- Prefer `proxied: false` (DNS-only / gray cloud) during initial cutover and certificate validation.
- Delete ALL conflicting records before creating new ones. Previous attempts may have left A records, AAAA records, or proxied CNAMEs.
- Also check for and clean up any stale Page Rules or Workers Routes from previous attempts.
- TTL of 1 means "auto" in Cloudflare's system.

### Step 6: Verify Infrastructure
After setup is complete, verify:
- [ ] `gh repo view planted-tank-lab` shows the repo
- [ ] `fly status` shows the app is healthy
- [ ] `fly logs` shows app + worker processes starting cleanly
- [ ] `curl -I https://plantedtanklab.com` returns a response (even if 404 — proves DNS + Fly work)
- [ ] Database connection works: can connect to Supabase via the pooler URL

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + Radix UI primitives for accessible components
- **State**: Zustand for builder state, TanStack Query (React Query) for server data
- **Backend**: Next.js API Routes with tRPC for type-safe API layer
- **Database**: PostgreSQL via Supabase (use Drizzle ORM, never raw SQL)
- **Auth**: NextAuth.js (Auth.js) — Google OAuth + email magic links
- **Search**: PostgreSQL full-text search (MVP), upgrade to Meilisearch later
- **Hosting**: Fly.io (web + workers) + Supabase (DB + storage)
- **DNS**: Cloudflare (DNS-only mode, pointing to Fly)
- **Testing**: Vitest for unit tests, Playwright for e2e
- **Package manager**: pnpm (always use pnpm, never npm or yarn)

## Repository Structure

```
planted-tank-lab/
├── AGENTS.md                 ← You are here
├── AUTOPILOT.md              ← Single source of truth (status + next actions)
├── PLAN_EXEC.md              ← Execution checklist (tasks + launch gates)
├── PROGRESS.md               ← Append-only work log
├── VERIFY.md                 ← Verification playbook
├── PLAN.md                   ← Product specification (not progress tracking)
├── config/
│   └── gates.json            ← Launch gate status (read by scripts/gates.ts)
├── decisions/                ← Architecture Decision Records (ADRs)
├── archive/planning/         ← Historical planning artifacts (non-authoritative)
├── .secrets/                 ← GITIGNORED — credentials (never commit)
│   ├── cloudflare/
│   │   ├── account-id.txt
│   │   └── api-token.txt
│   └── supabase/
│       └── supabaseinfo.txt
├── .env.local                ← GITIGNORED — local environment variables
├── .env.example              ← Template showing required env vars (no real values)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── public/
│   └── images/
├── src/
│   ├── app/                  ← Next.js App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx          ← Home
│   │   ├── builder/          ← Builder page (core product)
│   │   ├── products/         ← Product browsing
│   │   ├── plants/           ← Plant database
│   │   ├── builds/           ← Community builds
│   │   ├── compare/          ← Product comparison
│   │   ├── guides/           ← Editorial guides
│   │   ├── profile/          ← User profile
│   │   ├── go/               ← Affiliate redirect endpoint
│   │   ├── admin/            ← Admin panel
│   │   └── api/
│   │       ├── trpc/         ← tRPC handler
│   │       └── auth/         ← NextAuth handler
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts      ← DB connection (Drizzle + Supabase pooler)
│   │   │   ├── schema.ts     ← ALL Drizzle table definitions
│   │   │   └── migrations/
│   │   ├── trpc/
│   │   │   ├── router.ts     ← Root tRPC router
│   │   │   ├── context.ts
│   │   │   └── routers/      ← Per-domain routers (products, plants, builds, etc.)
│   │   ├── services/         ← Business logic (compatibility, pricing, affiliate, search)
│   │   └── jobs/             ← Background jobs (cron-triggered)
│   ├── engine/               ← Client-side compatibility rule engine
│   │   ├── rules.ts
│   │   ├── evaluate.ts
│   │   └── types.ts
│   ├── stores/               ← Zustand stores
│   │   └── builder-store.ts
│   ├── components/
│   │   ├── ui/               ← Base primitives (button, input, card, dialog, etc.)
│   │   ├── layout/           ← Header, Footer, Nav
│   │   ├── builder/          ← Builder-specific components
│   │   ├── products/         ← Product list/card/detail
│   │   ├── plants/           ← Plant list/card/care-card
│   │   └── admin/            ← Admin forms
│   ├── lib/                  ← Shared utils, constants, types
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── validators.ts    ← Zod schemas (shared between client/server)
│   └── hooks/                ← Custom React hooks
├── scripts/                  ← Seed scripts, data import
│   ├── seed.ts
│   └── gates.ts
├── data/                     ← Raw seed data (JSON)
│   ├── categories.json
│   ├── products/
│   ├── plants.json
│   └── rules.json
└── tests/
    ├── engine/               ← Compatibility engine unit tests
    ├── api/                  ← tRPC router tests
    └── e2e/                  ← Playwright tests
```

## Coding Conventions

### TypeScript
- Strict mode always (`"strict": true` in tsconfig)
- Prefer `type` over `interface` unless extending is needed
- Use explicit return types on exported functions
- No `any` — use `unknown` and narrow with type guards
- Zod for all runtime validation (API inputs, form data, seed data)
- Prefer `const` over `let`; never use `var`

### React / Next.js
- Functional components only, no class components
- Use Server Components by default; add `"use client"` only when needed (interactivity, hooks, browser APIs)
- Colocate component files: `ComponentName.tsx` alongside any component-specific utils
- Use `async` Server Components for data fetching where possible
- Prefer server actions for mutations; fall back to tRPC for complex queries
- Error boundaries at route segment level

### Styling
- Tailwind CSS utility classes for all styling — no CSS modules, no styled-components
- Use Tailwind `@apply` sparingly, only in `globals.css` for base element resets
- Use CSS variables (via Tailwind config) for the design token palette
- Radix UI for accessible primitives (Dialog, Dropdown, Tooltip, etc.)
- Responsive: mobile-first approach, breakpoints at `sm:`, `md:`, `lg:`

### File Naming
- React components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utils, services, stores: `kebab-case.ts`
- Route files: follow Next.js App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`)

### Database
- All queries go through Drizzle ORM — never write raw SQL strings
- Schema changes: create a Drizzle migration (`pnpm drizzle-kit generate`)
- Use `gen_random_uuid()` for all primary keys (UUID)
- Use JSONB for flexible/parametric specs (the `specs` column on products)
- Always include `created_at` and `updated_at` timestamps on tables
- Foreign keys with appropriate `ON DELETE` behavior
- Connection: always use the Supabase transaction pooler URL (port 5432, the one in .secrets)

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
- One logical change per commit
- NEVER commit `.secrets/`, `.env.local`, or any file containing real credentials

## Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Run unit tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Run full verification (lint + typecheck + unit + e2e + build)
pnpm verify

# Print launch gates (pass/fail/unknown) from config
pnpm verify:gates

# Generate Drizzle migration
pnpm drizzle-kit generate

# Apply migrations to DB (dev/prod)
pnpm drizzle-kit migrate

# Run seed scripts
pnpm seed

# Run ingestion worker (backend-only)
pnpm ingest run

# Format code
pnpm format

# Deploy to Fly.io (production)
fly deploy

# Scale processes (web + worker + scheduler)
fly scale count app=1 worker=1 scheduler=1
```

## Testing Requirements

- Run `pnpm lint && pnpm typecheck` before any commit
- Run `pnpm test` after modifying any `.ts`/`.tsx` files
- The compatibility engine (`src/engine/`) must have unit tests for every rule
- API routers (`src/server/trpc/routers/`) should have integration tests
- New pages should have basic Playwright smoke tests
- Tests must pass before any PR is opened

## Key Implementation Notes

### The Builder (core product — most important page)
The builder at `/builder` is the heart of the app. Read `PLAN.md` Section 5.2 for detailed interaction design. Key points:
- Builder state lives in a Zustand store (`src/stores/builder-store.ts`)
- Adding/removing/swapping items triggers compatibility re-evaluation
- The compatibility engine runs client-side for instant feedback
- Rules are loaded from the server once and cached
- Build can be saved to localStorage (anonymous) or DB (authenticated)
- Share links use a short `share_slug` (nanoid, 10 chars)

### Compatibility Engine
- Rules are defined as structured data (not hardcoded if/else)
- Rule definitions live in DB (`compatibility_rules` table) and are synced to client
- Engine is in `src/engine/` — pure TypeScript, no React dependencies, fully testable
- See `PLAN.md` Section 3.2 for rule types, examples, and schema

### Affiliate Links
- Never expose affiliate tags in client-side code
- All affiliate clicks go through `/go/[offerId]` server-side redirect
- The redirect logs the click, then 302s to the retailer's affiliate URL
- Affiliate disclosure must appear on every page with purchase links

### Product Data Model
- Products have a `category_id` and a `specs` JSONB column
- The shape of `specs` varies by category (light specs ≠ filter specs)
- `spec_definitions` table defines what keys exist per category (for filters/admin forms)
- See `PLAN.md` Section 3.3 for the complete schema

### Deployment Pipeline
- Production deploys are done via Fly:
  - `fly deploy`
  - `fly scale count app=1 worker=1 scheduler=1`
- Domain: plantedtanklab.com (DNS via Cloudflare DNS-only → Fly)

## Planning / Tracking

- Use `AUTOPILOT.md` for status and next actions.
- Use `PLAN_EXEC.md` as the execution checklist.
- Record decisions in `decisions/*` (ADRs) and progress in `PROGRESS.md`.

## What NOT To Do

- Do not add dependencies without checking if an existing dep or built-in API covers the need
- Do not use `getServerSideProps` or `getStaticProps` (Pages Router) — this is App Router only
- Do not create API routes when a Server Component or server action would suffice
- Do not store sensitive data (affiliate tags, API keys) in client-accessible code
- Do not use `console.log` in production code — use a structured logger if needed
- Do not skip TypeScript types or use `as any` casts to silence errors
- Do not bypass the Drizzle ORM with raw SQL
- Do not commit `.env.local`, `.secrets/`, or any file containing secrets
- Do not use Supabase CLI for migrations — use Drizzle Kit directly
- Prefer Cloudflare DNS-only (not proxied) during initial Fly cutover and certificate validation
- Do not hardcode any credentials anywhere — always read from `.env.local` or `.secrets/`
