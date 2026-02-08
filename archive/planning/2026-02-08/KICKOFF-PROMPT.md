# PlantedTankLab — Initial Codex Kickoff Prompt

Copy and paste the prompt below into Codex as your first task. Use **high reasoning effort** since this sets the foundation for everything.

---

## The Prompt

```
Read PLAN.md, AGENTS.md, and .agent/PLANS.md completely before doing anything.

This is a greenfield project. Your job is to implement the full foundation: infrastructure setup + project scaffolding + data model + seed data. Create an ExecPlan first at .agent/plans/2026-02-05-foundation-and-infra.md, then implement it milestone by milestone.

Here is exactly what needs to exist when you're done:

MILESTONE 0: INFRASTRUCTURE BOOTSTRAP

Follow the "Platform Setup" section in AGENTS.md step-by-step:

0a. Create the GitHub repo:
    - gh repo create planted-tank-lab --public --description "PCPartPicker for planted aquariums" --source=. --remote=origin
    - Create .gitignore FIRST (must ignore: node_modules, .next, .env.local, .env*.local, .secrets/, .vercel/, *.tsbuildinfo)
    - Initial commit with PLAN.md, AGENTS.md, .agent/PLANS.md, .gitignore

0b. Parse secrets and build .env.local:
    - Read .secrets/supabase/supabaseinfo.txt, extract all values
    - Construct the DATABASE_URL by substituting the real password into the pooler connection string
    - Generate NEXTAUTH_SECRET with: openssl rand -base64 32
    - Write .env.local with all required env vars
    - Create .env.example with placeholder values (no real secrets)

0c. Set up Vercel:
    - Run: vercel --yes (creates project, links to directory)
    - Set all environment variables via vercel env add (pipe values via echo to avoid interactive prompts)
    - For NEXTAUTH_URL, set production to https://plantedtanklab.com and development to http://localhost:3000

0d. Configure Cloudflare DNS:
    - Read .secrets/cloudflare/api-token.txt and .secrets/cloudflare/account-id.txt
    - Use Cloudflare API to get zone ID for plantedtanklab.com
    - LIST all existing DNS records — delete ANY stale A/AAAA/CNAME records for @ and www
    - Also check for and delete any stale Page Rules or Workers Routes from previous attempts
    - Create CNAME: plantedtanklab.com → cname.vercel-dns.com (proxied: false, ttl: 1)
    - Create CNAME: www → cname.vercel-dns.com (proxied: false, ttl: 1)
    - CRITICAL: proxied must be false (DNS-only/gray cloud). Vercel handles SSL itself.

0e. Connect custom domain in Vercel:
    - vercel domains add plantedtanklab.com --yes
    - vercel domains add www.plantedtanklab.com --yes

0f. Connect Vercel to GitHub:
    - vercel git connect

0g. Verify infrastructure:
    - gh repo view shows the repo
    - vercel ls shows the project
    - vercel domains ls shows both domains
    - Test DATABASE_URL can connect (a simple psql or node script that connects and runs SELECT 1)

Commit: "chore: bootstrap infrastructure — GitHub, Vercel, Cloudflare, Supabase"

MILESTONE 1: PROJECT SCAFFOLDING

1a. Initialize Next.js project with App Router, TypeScript strict, Tailwind CSS v4, pnpm:
    - pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
    - (If project files already exist, adapt accordingly — don't overwrite PLAN.md etc.)

1b. Install production dependencies:
    - drizzle-orm, postgres (node-postgres driver), @trpc/server, @trpc/client, @trpc/react-query, @tanstack/react-query, zod, zustand, nanoid, next-auth, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-tooltip, @radix-ui/react-select

1c. Install dev dependencies:
    - drizzle-kit, vitest, @testing-library/react, playwright, @types/node, prettier

1d. Configure:
    - tsconfig.json: strict mode, path aliases (@/ → src/)
    - drizzle.config.ts: pointing to src/server/db/schema.ts, using DATABASE_URL from env
    - next.config.ts: any needed configuration
    - Set up the complete folder structure as specified in AGENTS.md

Commit: "chore: scaffold Next.js project with dependencies"

MILESTONE 2: DATABASE SCHEMA

Implement the COMPLETE schema from PLAN.md Section 3.3 in src/server/db/schema.ts using Drizzle ORM. Tables:
- categories, brands, products, spec_definitions, retailers, offers, price_history
- plants (with all care parameters: difficulty, light_demand, co2_demand, growth_rate, placement, temp ranges, pH/GH/KH ranges, etc.)
- builds, build_items (with CHECK constraint: either product_id or plant_id, not both)
- build_evaluations, compatibility_rules
- users, user_favorites

Include all indexes from the plan. Create the DB connection file at src/server/db/index.ts.
Push schema to Supabase: pnpm drizzle-kit push
Verify by connecting to DB and confirming tables exist.

Commit: "feat: complete database schema with all tables and indexes"

MILESTONE 3: tRPC SETUP

- src/server/trpc/context.ts — tRPC context with DB connection and optional session
- src/server/trpc/router.ts — root router merging all sub-routers
- Stub routers in src/server/trpc/routers/ for: products, plants, builds, offers, rules, users
  (each with at least one working query, e.g., products.list that returns all products)
- Wire up API handler at src/app/api/trpc/[trpc]/route.ts
- Create client-side tRPC provider wrapper component

Commit: "feat: tRPC setup with stub routers"

MILESTONE 4: SEED DATA

Create seed JSON files in data/ directory:
- data/categories.json — 12 categories (tank, stand, light, filter, co2, substrate, hardscape, plants, fertilizer, heater, test_kit, accessories) with display_order and builder_required
- data/products/tanks.json — 5 tanks with realistic specs (UNS 60U, Waterbox Clear 10, standard 10gal, standard 20gal long, Fluval Flex 15)
- data/products/lights.json — 5 lights with PAR data (Fluval Plant 3.0 24", Chihiros WRGB II 60, Nicrew ClassicLED, Finnex Planted+ 24/7, ONF Flat One+)
- data/plants.json — 10 plants with all care params (Java Fern, Anubias Nana, Amazon Sword, Dwarf Sag, Monte Carlo, Rotala Rotundifolia, Crypt Wendtii, Java Moss, Water Wisteria, Buce Green Wavy)
- data/rules.json — first 10 compatibility rules from PLAN.md Section 3.2

Create seed script at scripts/seed.ts that reads JSON files and upserts into DB via Drizzle.
Add "seed" script to package.json.
Run the seed: pnpm seed
Verify data exists in DB.

Commit: "feat: seed data — categories, products, plants, rules"

MILESTONE 5: BASIC PAGES

- src/app/layout.tsx — root layout with HTML structure, font, Tailwind, tRPC provider
- src/app/page.tsx — home page: project name, tagline "Build your perfect planted tank", "Start Building →" link
- src/app/builder/page.tsx — reads categories from DB via tRPC, displays as list of rows (category name + "Choose a ___")
- src/app/products/page.tsx — placeholder products page
- src/app/plants/page.tsx — placeholder plants page

These are functional Server Components proving the full data pipeline works (DB → tRPC → UI). Styling is minimal but clean.

Commit: "feat: basic pages — home, builder, products, plants"

MILESTONE 6: VERIFY EVERYTHING + DEPLOY

- pnpm dev starts without errors
- pnpm build compiles successfully
- pnpm lint passes
- pnpm typecheck passes
- Home page renders at localhost:3000
- Builder page renders categories from DB
- Push to main: git push origin main
- Vercel auto-deploys to production
- https://plantedtanklab.com loads and shows the home page

Commit: "chore: verify build and deploy to production"

Write the ExecPlan FIRST, then implement it milestone by milestone. Commit after each milestone with conventional commit messages. Push to main after all milestones are complete.
```

---

## Follow-Up Tasks

After the foundation task completes and you've reviewed the PR, queue these as separate Codex tasks:

**Task 2: Builder Core**
```
Read PLAN.md Sections 3.2 and 5.2. Implement the builder page with: product selection per category, Zustand state management, the client-side compatibility engine with the 10 seeded rules, warning display (inline + summary banner), running price total, and shareable build links via nanoid share_slug. Create an ExecPlan first.
```

**Task 3: Product + Plant Pages**
```
Read PLAN.md Sections 5.1 and 5.3. Implement product list pages with parametric filtering, product detail pages with specs tables and offer/price display, plant browser with filters (difficulty, light, CO2, placement), and plant detail care card pages. All data comes from the seeded DB via tRPC. Pages must be SEO-friendly Server Components. Create an ExecPlan first.
```

**Task 4: Affiliate + Polish**
```
Read PLAN.md Sections 7 and 8. Implement the affiliate redirect endpoint at /go/[offerId] with click tracking, add retailer and offer seed data for Amazon, wire up price display in the builder and product pages, build out the home page with real content and CTAs, and add SEO meta tags + OG images + sitemap generation. Create an ExecPlan first.
```

**Task 5: Expand Seed Data (parallelizable)**
```
Expand the seed data to match the "Proposed First Dataset" in PLAN.md Appendix B. Add all remaining products and plants with realistic specs. Research actual specs from manufacturer websites. Target: 194 products and 70 plants total. Create an ExecPlan first.
```

## Tips

1. **Use high reasoning effort** for the initial task — it's foundational.
2. **Make sure Codex has internet access** enabled — it needs to install packages, hit the Cloudflare API, push to GitHub, and deploy to Vercel.
3. **Keep tasks scoped.** Each task maps to roughly one milestone from PLAN.md Section 10.
4. **Review every PR** before merging. Check that secrets weren't accidentally committed, env vars are correct, and DNS resolves properly.
