# PlantedTankLab — Agent Instructions

## Operating System (Single Source Of Truth)

This repo is run via a small set of tracking artifacts so work is resumable across
sessions without relying on chat history.

Authoritative status + next actions:
- `AUTOPILOT.md`

Supporting artifacts:
- `PLAN_EXEC.md` (execution checklist; tasks link to launch gates)
- `TODO.md` (ready-now queue derived from `PLAN_EXEC.md`)
- `PROGRESS.md` (append-only work log; every session must append)
- `VERIFY.md` (verification playbook + definition of done)
- Gate dashboard: `config/gates.json` + `scripts/gates.ts` (run `pnpm verify:gates`)
- ADRs: `decisions/*`
- Historical planning: `archive/planning/*` (not authoritative)

### Session Startup Ritual (required)

1. Read: `AUTOPILOT.md`, `PLAN_EXEC.md`, `TODO.md`, `PROGRESS.md`.
2. Run:
   - `pnpm verify:gates`
   - `pnpm verify`
3. Start work on the top item in `TODO.md`.

### Execution Loop (required)

1. Implement the task end-to-end (code + tests).
2. Verify with `pnpm verify` (or the closest applicable subset if blocked).
3. Update tracking artifacts:
   - `AUTOPILOT.md` (status, "what changed last", next 3 tasks)
   - `PROGRESS.md` (append a dated entry)
   - `TODO.md` (if ready-now queue changes)
   - `config/gates.json` (if gate status changes; set `lastVerifiedAt`)
   - `decisions/*` (if a high-impact decision was made)
4. Commit with a conventional commit message.

### No-Conflicts Rule (strict)

Do not create new planning/checkpoint/roadmap files outside the Autopilot system.
If a new doc is needed, it must be linked from `AUTOPILOT.md` and must not duplicate
task tracking.

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
The system has these CLIs pre-authenticated and ready to use:
- **Vercel CLI** (`vercel`) — logged in. Use `--yes` flag to skip interactive prompts.
- **GitHub CLI** (`gh`) — authenticated via `gh auth login`. Use for repo creation and management.
- **pnpm** — available globally.

## Platform Setup (Must Be Done First)

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

### Step 4: Vercel Project Setup
```bash
# Create and link Vercel project
vercel --yes
# Set environment variables for all environments (production, preview, development)
# Use: echo "<value>" | vercel env add <NAME> production preview development
# Set these:
#   DATABASE_URL
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   NEXTAUTH_SECRET
#   NEXTAUTH_URL=https://plantedtanklab.com  (for production)
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

# 4. Create new CNAME records (DNS-only mode, NOT proxied)
# Root (@):
curl -X POST -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records" \
  -d '{"type":"CNAME","name":"plantedtanklab.com","content":"cname.vercel-dns.com","ttl":1,"proxied":false}'

# www:
curl -X POST -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records" \
  -d '{"type":"CNAME","name":"www","content":"cname.vercel-dns.com","ttl":1,"proxied":false}'
```

**Critical Cloudflare notes:**
- `proxied: false` (DNS-only / gray cloud) is REQUIRED for Vercel. Vercel manages its own SSL via Let's Encrypt and will fail certificate validation if Cloudflare proxy is enabled.
- Delete ALL conflicting records before creating new ones. Previous attempts may have left A records, AAAA records, or proxied CNAMEs.
- Also check for and clean up any stale Page Rules or Workers Routes from previous attempts.
- TTL of 1 means "auto" in Cloudflare's system.

### Step 6: Vercel Custom Domain
```bash
vercel domains add plantedtanklab.com --yes
vercel domains add www.plantedtanklab.com --yes
```
Vercel will verify DNS is pointing correctly. If verification fails, re-check that Cloudflare records are DNS-only and pointing to `cname.vercel-dns.com`.

### Step 7: Connect Vercel to GitHub
```bash
vercel git connect
```
This enables automatic deployments: push to `main` → production deploy, push to branch → preview deploy.

### Step 8: Verify Infrastructure
After setup is complete, verify:
- [ ] `gh repo view planted-tank-lab` shows the repo
- [ ] `vercel ls` shows the project
- [ ] `vercel domains ls` shows plantedtanklab.com configured
- [ ] `curl -I https://plantedtanklab.com` returns a response (even if 404 — proves DNS + Vercel work)
- [ ] Database connection works: can connect to Supabase via the pooler URL

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + Radix UI primitives for accessible components
- **State**: Zustand for builder state, TanStack Query (React Query) for server data
- **Backend**: Next.js API Routes with tRPC for type-safe API layer
- **Database**: PostgreSQL via Supabase (use Drizzle ORM, never raw SQL)
- **Auth**: NextAuth.js (Auth.js) — Google OAuth + email magic links
- **Search**: PostgreSQL full-text search (MVP), upgrade to Meilisearch later
- **Hosting**: Vercel (frontend + API) + Supabase (DB + storage)
- **DNS**: Cloudflare (DNS-only mode, pointing to Vercel)
- **Testing**: Vitest for unit tests, Playwright for e2e
- **Package manager**: pnpm (always use pnpm, never npm or yarn)

## Repository Structure

```
planted-tank-lab/
├── AGENTS.md                 ← You are here
├── AUTOPILOT.md              ← Single source of truth (status + next actions)
├── PLAN_EXEC.md              ← Execution checklist (tasks + launch gates)
├── TODO.md                   ← Ready-now queue (derived from PLAN_EXEC)
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

# Push schema to DB (dev only)
pnpm drizzle-kit push

# Run seed scripts
pnpm seed

# Format code
pnpm format

# Deploy to Vercel (production)
vercel --prod --yes

# Deploy preview
vercel --yes
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
- Push to `main` → Vercel auto-deploys to production via GitHub integration
- Push to any other branch → Vercel creates a preview deployment
- Domain: plantedtanklab.com (DNS via Cloudflare DNS-only → Vercel)

## Planning / Tracking

- Use `AUTOPILOT.md` for status and next actions.
- Use `PLAN_EXEC.md` as the execution checklist.
- Use `TODO.md` as the ready-now queue (derived from `PLAN_EXEC.md`).
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
- Do not set Cloudflare proxy to orange cloud (proxied) for Vercel CNAME records — use DNS-only (gray cloud)
- Do not hardcode any credentials anywhere — always read from `.env.local` or `.secrets/`
