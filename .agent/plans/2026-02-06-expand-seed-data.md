# Expand Seed Data to Appendix B Targets (124 equipment, 70 plants)

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Expand the seed dataset to match `PLAN.md` Appendix B “Proposed First Dataset”:

- Equipment products: 124 total across the existing equipment categories (tanks, stands, lights, filters, CO2, substrates, hardscape, fertilizers, heaters, test kits).
- Plants: 70 total across difficulties and placements.

This makes browsing, filtering, and building meaningfully representative of the early product.

## Progress

- [x] (2026-02-06) Milestone 1: Seed format upgrade (sources/provenance) + seed script supports many product files.
- [x] (2026-02-06) Milestone 2: Add equipment JSON for all categories to reach 124 products total; run `pnpm seed`.
- [x] (2026-02-06) Milestone 3: Expand plants to 70; run `pnpm seed`.
- [ ] (2026-02-06) Milestone 4: Validate and spot-check pages (builder pickers, product lists/details, plant lists/details).

## Surprises & Discoveries

- Observation: This repo currently stores category-specific specs in `products.specs` JSONB; spec definitions are not seeded yet, so browse filters are currently implemented only for tanks/lights and run “in-process” in the server component.
  Evidence: `src/server/db/schema.ts`, `src/app/products/[category]/page.tsx`.

## Decision Log

- Decision: Store provenance for products in `products.meta.sources` (array of URLs) and a short `products.meta.source_notes` string, rather than introducing a separate sources table.
  Rationale: Avoids schema bloat while keeping an auditable trail for seeded specs.
  Date: 2026-02-06

- Decision: For plants (no `meta` column), store provenance in `plants.notes` as plain text: `Sources: ...`.
  Rationale: Keep schema stable; still records sources for later cleanup/migration.
  Date: 2026-02-06

## Context and Orientation

- Seed script: `scripts/seed.ts`
  - Currently seeds: categories, brands, products (tanks/lights only), plants (10), rules, retailers, offers.
- Seed inputs:
  - Categories: `data/categories.json`
  - Products (current): `data/products/tanks.json`, `data/products/lights.json`
  - Plants: `data/plants.json`
  - Rules: `data/rules.json`

Appendix B targets live in `PLAN.md` under `## B. Proposed First Dataset`.

## Plan of Work

1. Upgrade seed JSON schemas:
   - Allow optional `image_url`, `website_url`, and provenance fields (`sources`, `source_notes`).
   - Keep backward compatibility with existing seed files.
2. Split products into per-category JSON files under `data/products/` and update the seed script to load all of them.
3. Populate the required items by category to hit the equipment total (124) and plant total (70).
4. Run `pnpm seed` and verify counts with the seed script output.
5. Spot-check a few pages and ensure builder pickers can list the new categories.

## Milestones

### Milestone 1: Seed Format Upgrade

Scope:
- Seed JSONs can optionally include provenance and richer fields.
- `scripts/seed.ts` can seed multiple product category files.

Steps:
1. Update `scripts/seed.ts` Zod schemas:
   - Products: accept optional `image_url`, `image_urls`, `meta`, `sources`, `source_notes`, and `verified`.
   - Plants: accept optional `notes`, `native_region`, `family`.
2. Ensure `products.meta` is populated with `sources` and `source_notes` when present.
3. Update the `productFiles` list to include all `data/products/*.json` present.

Validation:
- `pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm seed` still works with existing files.

### Milestone 2: Equipment Expansion (124 Products Total)

Scope:
- Add the missing equipment categories from Appendix B:
  - `data/products/stands.json` (10)
  - `data/products/filters.json` (18)
  - `data/products/co2.json` (12)
  - `data/products/substrates.json` (12)
  - `data/products/hardscape.json` (8)
  - `data/products/fertilizers.json` (10)
  - `data/products/heaters.json` (10)
  - `data/products/test-kits.json` (6)
  - Expand tanks to 18 and lights to 20.

Validation:
- `pnpm seed` prints equipment product count `124`.

### Milestone 3: Plants Expansion (70 Plants Total)

Scope:
- Expand `data/plants.json` to 70 plants with all required care params.

Validation:
- `pnpm seed` prints plant count `70`.

### Milestone 4: Spot Checks

Scope:
- `/products/tank` lists more tanks.
- `/products/filter` lists filters (even if parametric filters are “coming soon”).
- `/plants` lists 70 plants and filtering still works.
- `/builder` pickers show larger lists for categories.

Validation:
- `pnpm test:e2e` passes.
- Manual spot checks:
  - `/products/tank/uns-60u` still works and shows offers.
  - At least one new product detail page renders.
  - At least one new plant detail page renders.

## Validation and Acceptance

Acceptance:
- Seed totals match Appendix B: 124 equipment products + 70 plants.
- Seed script is idempotent (re-run doesn’t duplicate).
- No secrets committed.

## Idempotence and Recovery

- If a seed file is invalid, the script fails fast via Zod with a path to the bad field.
- If `.next/` route typing gets stale after file additions, remove `.next/` and rerun `pnpm typecheck`.

## Interfaces and Dependencies

- No new runtime deps required.
- All DB writes via Drizzle ORM in `scripts/seed.ts`.
