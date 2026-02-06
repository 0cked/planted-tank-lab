# Affiliate Redirect + Pricing + SEO Polish

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Add affiliate monetization and polish:

- Product pages show “Buy” buttons that go through `/go/[offerId]` (server-side redirect) so affiliate tags are never exposed in client code.
- Redirect endpoint logs clicks in the DB (basic click tracking) and then 302 redirects to the final URL.
- Seed Amazon (retailer + offers) so prices and offers actually show up.
- Improve home page content and add SEO primitives: metadata defaults, OpenGraph image, and a dynamic sitemap.

## Progress

- [x] (2026-02-06) Milestone 1: DB click tracking table + `/go/[offerId]` redirect endpoint.
- [ ] (2026-02-06) Milestone 2: Retailer + offer seed data (Amazon) and seed script updates.
- [ ] (2026-02-06) Milestone 3: Wire “Buy” buttons to `/go` and add affiliate disclosure.
- [ ] (2026-02-06) Milestone 4: SEO polish (metadata defaults, OG image, sitemap, robots).
- [ ] (2026-02-06) Milestone 5: Verify end-to-end + deploy.

## Surprises & Discoveries

- Observation: `offersRouter.listByProductId` currently returns raw offer URLs and retailer rows; we should avoid returning any affiliate tags/URLs to any client-rendered surfaces.
  Evidence: `src/server/trpc/routers/offers.ts`, `src/app/products/[category]/[slug]/page.tsx`.

## Decision Log

- Decision: Store only a hashed IP (sha256) for click tracking, salted with `NEXTAUTH_SECRET` when available.
  Rationale: Enables basic fraud/anomaly detection without storing raw IPs.
  Date: 2026-02-06

- Decision: Seed offers with `affiliate_url = null` and generate affiliate-tagged URLs at redirect time based on the retailer’s `affiliate_tag`.
  Rationale: Centralizes link construction server-side and ensures tags never leak into rendered HTML.
  Date: 2026-02-06

## Context and Orientation

Relevant schema and modules:
- DB schema: `src/server/db/schema.ts`
- DB access: `src/server/db/index.ts`
- Offer procedures: `src/server/trpc/routers/offers.ts`
- Product detail page offers section: `src/app/products/[category]/[slug]/page.tsx`
- Seed script: `scripts/seed.ts`

Key constraints from `AGENTS.md` / `PLAN.md`:
- Never expose affiliate tags client-side.
- Affiliate clicks go through `/go/[offerId]` and are logged server-side.
- Use Drizzle ORM (no raw SQL strings).
- Keep TypeScript strict (no `any`).

## Plan of Work

1. Add a click log table to the schema and push it to Supabase.
2. Implement `/go/[offerId]`:
   - Fetch offer + retailer from DB
   - Insert click log row
   - 302 redirect to tagged URL (computed server-side)
3. Seed Amazon retailer + offers and extend `scripts/seed.ts` to upsert them.
4. Update product detail offers UI to link to `/go/[offerId]`, and add a site-wide affiliate disclosure footer.
5. Add SEO primitives: `robots.ts`, `sitemap.ts`, and `opengraph-image.tsx`, and update metadata defaults.
6. Validate with `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`, run seed, and confirm `/go` works via curl.

## Milestones

### Milestone 1: Click Tracking + Redirect Endpoint

Scope:
- New table `offer_clicks` in `src/server/db/schema.ts`.
- New route handler `src/app/go/[offerId]/route.ts` (Node runtime).

Steps:
1. Add `offer_clicks` table and indexes in `src/server/db/schema.ts`.
2. `pnpm drizzle-kit push` to apply schema changes.
3. Implement `src/app/go/[offerId]/route.ts`:
   - Validate UUID
   - Load offer + retailer
   - Insert click (hash IP)
   - Redirect to computed destination URL (http/https only)

Validation:
- `pnpm typecheck` passes.
- `curl -I http://localhost:3000/go/<offer-uuid>` returns `302` when offer exists.

### Milestone 2: Seed Amazon Retailer + Offers

Scope:
- Add `data/retailers.json` and `data/offers.json`.
- Extend `scripts/seed.ts` to upsert retailers + offers by slug mapping.

Validation:
- `pnpm seed` completes successfully.
- `offers` table has at least one in-stock offer per seeded tank/light (best effort).

### Milestone 3: Wire Buy Links + Disclosure

Scope:
- Product detail offers list uses `/go/[offerId]` for outgoing clicks.
- Add affiliate disclosure in layout footer.
- Ensure tRPC `offers.listByProductId` returns a safe shape (no urls/tags).

Validation:
- Product detail page shows offers and “Buy” buttons.
- Clicking “Buy” hits `/go/...` (302).

### Milestone 4: SEO Polish

Scope:
- `src/app/robots.ts`
- `src/app/sitemap.ts` listing product + plant detail URLs
- `src/app/opengraph-image.tsx` (global OG image)
- Update `src/app/layout.tsx` metadata defaults (`metadataBase`, `openGraph`)

Validation:
- `GET /sitemap.xml` returns a sitemap with product + plant URLs.
- Social cards render a non-empty OG image (manual check is fine).

### Milestone 5: Verify + Deploy

Scope:
- All validation commands pass.
- Push to `main` triggers Vercel production deploy.
- Production `/products/tank/uns-60u` shows offers and uses `/go/...`.

Validation:
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` all pass locally.
- `curl -I https://plantedtanklab.com/products/tank` returns 200.
- `curl -I https://plantedtanklab.com/go/<offer-uuid>` returns 302 after deploy.

## Validation and Acceptance

Acceptance behaviors:
- Prices show up (from seeded offers) on product list and product detail pages.
- Product detail “Buy” buttons use `/go/[offerId]` and do not reveal affiliate tags in rendered HTML.
- Clicking “Buy” logs a row in `offer_clicks`.
- `/sitemap.xml` includes product and plant detail URLs.
- Site has an affiliate disclosure visible (footer).

## Idempotence and Recovery

- Seed uses upserts: re-running `pnpm seed` is safe.
- If `.next` route typing gets stale, remove `.next/` and rerun `pnpm typecheck`.

## Interfaces and Dependencies

- New DB table: `offer_clicks`.
- New server route handler: `/go/[offerId]`.
- No new runtime dependencies beyond what’s already in the project.
