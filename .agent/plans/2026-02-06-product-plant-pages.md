# Product + Plant Pages (Browse, Filter, Detail)

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Ship SEO-friendly browsing and detail pages for products and plants:

- Users can browse product categories at `/products`, then browse a category at `/products/:category` with query-param filters, and open product detail pages at `/products/:category/:slug`.
- Users can browse plants at `/plants` with filters, and open plant detail pages at `/plants/:slug`.
- All data is read from Supabase via the existing tRPC layer (server-side callers for Server Components).

This makes the site useful beyond the builder by enabling direct discovery and indexing by search engines.

## Progress

- [x] (2026-02-06) Milestone 1: Expand tRPC APIs for product/plant browse + detail.
- [ ] (2026-02-06) Milestone 2: Product category browser + category pages with query-param filters.
- [ ] (2026-02-06) Milestone 3: Product detail page with specs table + offers section.
- [ ] (2026-02-06) Milestone 4: Plant browser with filters + plant detail care card.
- [ ] (2026-02-06) Milestone 5: Playwright smoke tests + final validation + deploy.

## Surprises & Discoveries

- Observation: Seeded product specs live in `products.specs` JSONB (category-specific keys), so DB-side parametric filters would require JSONB querying.
  Evidence: `data/products/tanks.json`, `data/products/lights.json`, `src/server/db/schema.ts`.
- Observation: Vitest did not resolve the `@/*` path alias by default; added a `vitest.config.ts` alias mapping so tRPC integration tests can import server modules.
  Evidence: `Error: Failed to load url @/server/db` from `pnpm test` before config.

## Decision Log

- Decision: Implement category-specific “parametric” filters for the currently seeded categories (tanks + lights) by filtering in-process after a limited DB fetch.
  Rationale: The dataset is small today (seeded lists), and this avoids brittle JSONB SQL while still delivering user-visible parametric filtering. DB-side JSONB filtering can be added later when data volume demands it.
  Date: 2026-02-06

- Decision: Use Server Components with server-side tRPC callers (`appRouter.createCaller(...)`) for SEO-friendly list + detail pages.
  Rationale: Meets the “SEO-friendly Server Components” requirement while keeping the data access path consistently “via tRPC.”
  Date: 2026-02-06

## Outcomes & Retrospective

- Target outcome: `/products` and `/plants` become real browsing experiences, and seeded items have working detail pages with shareable URLs.

## Context and Orientation

- Data model: `src/server/db/schema.ts`
  - Products: `products` table with `specs` JSONB. Categories in `categories`. Optional brand in `brands`.
  - Plants: `plants` table has filterable columns: `difficulty`, `lightDemand`, `co2Demand`, `placement`, `beginnerFriendly`, `shrimpSafe`, plus water parameter ranges.
  - Offers: `offers` table exists but may be unseeded, so price display must be “best effort.”

- tRPC routers:
  - `src/server/trpc/routers/products.ts` already has `categoriesList` and `listByCategorySlug`.
  - `src/server/trpc/routers/plants.ts` currently has only `list`.
  - `src/server/trpc/routers/offers.ts` has `lowestByProductIds`.

- Pages:
  - `src/app/products/page.tsx` and `src/app/plants/page.tsx` are placeholders.
  - Builder exists at `/builder` and uses client-side tRPC hooks.

Definitions:
- “Parametric filters”: filters derived from structured specs (numbers/booleans/enums), represented as query parameters, not free-text only.
- “SEO-friendly Server Components”: Next.js App Router pages that render on the server (no required client JS to see content), with metadata via `generateMetadata`.

## Plan of Work

1. Extend tRPC routers to support list + detail for products and plants, plus optional filter inputs (Zod-validated).
2. Implement product browsing routes:
   - `/products` category browser
   - `/products/[category]` list page with query-param filter form
   - `/products/[category]/[slug]` detail page with specs + offers
3. Implement plant browsing routes:
   - `/plants` list page with filters
   - `/plants/[slug]` detail page with care card
4. Add Playwright smoke tests to ensure pages render and main seeded entities are reachable.
5. Validate with `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`, then push to `main` for Vercel deploy.

## Milestones

### Milestone 1: tRPC Browse + Detail APIs

Scope:
- Products: category lookup, product detail by slug, search/list with optional filters.
- Plants: search/list with filters, plant detail by slug.
- Offers: detail page helper endpoint for all offers for a product (best effort).

Steps:
1. Update `src/server/trpc/routers/products.ts`:
   - Add `categoryBySlug({ slug })`.
   - Add `getBySlug({ slug })` returning product + category + brand.
   - Add `search({ categorySlug, q, brandSlug, limit })` returning products (with brand) for list pages.
   - Add `brandsByCategorySlug({ categorySlug })` for filter dropdowns.
2. Update `src/server/trpc/routers/plants.ts`:
   - Add `search({ q, difficulty, lightDemand, co2Demand, placement, beginnerFriendly, shrimpSafe, limit })`.
   - Add `getBySlug({ slug })`.
3. Update `src/server/trpc/routers/offers.ts`:
   - Add `listByProductId({ productId, limit })` returning offers (include retailer via join when available).
4. Add minimal integration tests that call these procedures against the seeded DB:
   - `tests/api/products.test.ts`
   - `tests/api/plants.test.ts`

Validation:
- `pnpm test` passes.
- A quick node-free check via `pnpm typecheck` and `pnpm lint` passes.

### Milestone 2: Product Category Browser + Category List Pages

Scope:
- `/products` shows categories (from DB) and links to `/products/[category]`.
- `/products/[category]` renders a list of products and a filter form (query params).

Steps:
1. Implement `/products` in `src/app/products/page.tsx` using a server-side tRPC caller to fetch categories.
2. Add `src/app/products/[category]/page.tsx`:
   - Parse `searchParams` into a typed filter object.
   - Fetch category + products via tRPC.
   - For seeded categories:
     - `tank`: volume range, rimless, material, brand, q
     - `light`: PAR range, tank length fit range, dimmable, app-controlled, brand, q
   - Render product rows with name, a few key specs, and best-effort lowest price.

Validation:
- `pnpm dev` renders `/products` and `/products/tank` without client JS required.
- Filters update results via query params (e.g. `?q=uns`, `?rimless=1`, `?parMin=80`).

### Milestone 3: Product Detail Pages

Scope:
- `src/app/products/[category]/[slug]/page.tsx` shows:
  - Product name, brand, description
  - Specs table (from JSONB)
  - Offers section (best-effort; may show “No offers yet”)
  - Metadata via `generateMetadata`

Steps:
1. Add `src/app/products/[category]/[slug]/page.tsx` and implement data fetching via tRPC.
2. Add lightweight formatting helpers for specs (label/unit/value formatting) in `src/lib/specs.ts`.

Validation:
- Visiting `/products/tank/uns-60u` works.
- If the category in the URL doesn’t match the product’s category, return 404.

### Milestone 4: Plant Browser + Plant Detail Care Cards

Scope:
- `/plants` list with filters: difficulty, light demand, CO2 demand, placement, beginner-friendly, shrimp-safe, and q.
- `/plants/[slug]` detail page with a care card:
  - Difficulty/light/CO2 tags
  - Temp range, pH range, GH/KH ranges
  - Placement, growth rate, max height, substrate type, propagation
  - Metadata via `generateMetadata`

Steps:
1. Implement `/plants` in `src/app/plants/page.tsx` using `plants.search`.
2. Add `src/app/plants/[slug]/page.tsx` using `plants.getBySlug`.
3. Add plant UI helpers in `src/components/plants/` as needed.

Validation:
- `/plants` renders seeded list and filters work via query params.
- `/plants/java-fern` renders care card.

### Milestone 5: Smoke Tests + Final Validation + Deploy

Scope:
- Basic Playwright tests for the new pages.

Steps:
1. Add `playwright.config.ts` with a `webServer` that starts `pnpm dev`.
2. Add `tests/e2e/smoke.spec.ts`:
   - Home renders
   - `/products` renders and links work
   - `/plants` renders and detail works
3. Run full validation suite and push to `main`.

Validation:
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` all pass.
- Production loads the new pages after Vercel deploy.

## Validation and Acceptance

Acceptance behaviors:
- `/products` shows categories including Tank and Light.
- `/products/tank` lists seeded tanks and filters via query string.
- `/products/tank/uns-60u` renders a specs table.
- `/plants` lists seeded plants and filters by difficulty/light/CO2/placement.
- `/plants/java-fern` renders a care card with temp/pH ranges.
- No secrets are added to git; `.env.local` and `.secrets/` remain ignored.

## Idempotence and Recovery

- tRPC API changes are additive; re-running `pnpm dev` is safe.
- If Playwright server port is occupied, set `PORT=3000` consistently in config (single place).
- If seeded data changes, update tests to target at least one known slug per dataset.

## Interfaces and Dependencies

- Use existing dependencies only: Next.js App Router, Drizzle via tRPC routers, Tailwind, Playwright.
- New tRPC procedures must use Zod for inputs and return typed objects (no `any`).
- Server Components must fetch via tRPC caller for consistency with the project rules.
