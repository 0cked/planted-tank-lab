# Plant Sources (Citations) + Curated Plant Media

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Make plant pages feel “real” and trustworthy by adding first-class citations and photos:

- Add a `plants.sources` column in Postgres (JSONB array of source URLs).
- Seed and display sources as citations on plant detail pages.
- Enrich a curated set of top plants with:
  - stable external image URL(s)
  - at least 1 reliable source URL each

This sets us up to progressively improve accuracy and visual richness without redesigning the UI each time.

## Progress

- [x] Milestone 1: Add DB column + plumbing (schema, migration, seed, tRPC) and render citations on plant detail page.
- [x] Milestone 2: Enrich top ~20 plants in `data/plants.json` with `image_url` + `sources` and reseed.
- [ ] Milestone 3: Validation (lint, typecheck, unit, e2e, build) + commit(s) + push.

## Surprises & Discoveries

- (none yet)

## Decision Log

- Decision: Store sources as `jsonb[]` (JSONB array) on `plants.sources`.
  Rationale: Multiple citations per plant, flexible over time, no join table needed for MVP.
  Date: 2026-02-06

- Decision: Keep “citations” UI on plant detail page only for now.
  Rationale: Avoid clutter in list views; detail page is where trust matters most.
  Date: 2026-02-06

## Context and Orientation

Key files:

- DB schema: `src/server/db/schema.ts`
- Drizzle config: `drizzle.config.ts` (migrations output: `src/server/db/migrations/`)
- Seed script: `scripts/seed.ts` reads `data/plants.json`
- Plant seeds: `data/plants.json`
- Plant detail page: `src/app/plants/[slug]/page.tsx`
- tRPC plants router: `src/server/trpc/routers/plants.ts` (currently selects `plants.*`)

Terminology:

- “Citation” / “source”: a URL to a reliable reference for the plant’s care parameters and description.

## Plan of Work

1. Add `plants.sources` to Drizzle schema and generate a migration.
2. Apply schema to Supabase:
   - Generate: `pnpm drizzle-kit generate`
   - Apply (dev): `pnpm drizzle-kit push`
3. Update `scripts/seed.ts` to upsert `plants.sources` from seed JSON.
4. Update `src/app/plants/[slug]/page.tsx` to display citations:
   - Render a “Sources” section when `sources.length > 0`
   - Each source is an external link (`rel="noreferrer nofollow"`, `target="_blank"`)
5. Enrich top plants in `data/plants.json`:
   - Add `image_url` and `sources` entries
   - Prefer stable manufacturer/library pages (Tropica is a good default)
6. Reseed (`pnpm seed`) and validate.

## Milestones

### Milestone 1: Plant Sources Column + Citations UI

Scope:

- Postgres has `plants.sources` (JSONB array) with default `[]`.
- Seed script upserts `sources`.
- Plant detail page renders citations.

Validation:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
pnpm seed
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
```

Expected: commands succeed. Visiting `/plants/marimo-moss-ball` shows a Sources section.

### Milestone 2: Curated Plant Media Enrichment

Scope:

- Top ~20 plants have `image_url` and `sources` populated in `data/plants.json`.
- After reseed, plant list and detail pages show images for those plants.

Validation:

```bash
pnpm seed
pnpm test:e2e
```

Manual check: `/plants` shows multiple plant thumbnails; detail pages show “Photo” and “Sources”.

### Milestone 3: Build + Ship

Validation:

```bash
pnpm build
git status --porcelain
```

Expected: build succeeds; worktree clean after commits.

## Validation and Acceptance

- `plants.sources` exists in DB and is non-null (defaults to `[]`).
- `scripts/seed.ts` writes sources to DB.
- Plant detail page shows citations when present.
- At least ~20 plants are enriched with sources + images and visibly look better.

## Idempotence and Recovery

- `pnpm seed` is idempotent (upserts).
- If a source/image URL is bad, remove it from `data/plants.json` and rerun `pnpm seed`.

## Interfaces and Dependencies

- No new npm deps.
- Schema change via Drizzle migration.
