# Curated Picks Toggle For Builder Product Selection

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Reduce “choice overload” in the builder by defaulting each product picker to a short list of curated, recommended products, while still allowing users to toggle “show everything”. This keeps the MVP usable while we continue to research and expand the full dataset.

User-visible behavior:

- On `/builder`, product picker dialogs show a small curated list by default.
- A “Curated picks” toggle in Builder Options switches between curated-only and full catalog.
- Compatibility gating still applies (when “Compatibility” is enabled): incompatible items are hidden.

## Progress

- [x] (2026-02-06) Add `curated_rank` to product seed schema and persist it into `products.meta.curated_rank`.
- [x] (2026-02-06) Add `curatedOnly` toggle to Zustand builder store, persisted to localStorage.
- [x] (2026-02-06) Update product picker logic to filter/sort by `curated_rank` when enabled, falling back to full list if none are curated.
- [x] (2026-02-06) Assign `curated_rank` values to initial product seed JSON files across core categories.
- [x] (2026-02-06) Reseed DB and validate UI + tests.

## Surprises & Discoveries

- Observation: Some categories may temporarily have no curated products; the picker must gracefully fall back to the full list.
  Evidence: `ProductPicker` uses curated rows only if at least one row has a valid `curated_rank`.

## Decision Log

- Decision: Store curation rank in `products.meta.curated_rank` rather than adding a new SQL column.
  Rationale: Avoids a schema migration and keeps iteration on curation purely data-driven.
  Date: 2026-02-06

- Decision: Use numeric “rank” rather than boolean “curated”.
  Rationale: Enables deterministic ordering (rank 1..N) and easy expansion later (add more items at lower priority).
  Date: 2026-02-06

## Outcomes & Retrospective

This enables an opinionated, usable builder flow immediately without deleting or hiding non-curated products from the database. Next work is to refine curated lists (via research) and add product/plant images so the curated list “feels real”.

## Context and Orientation

Key code paths:

- Builder state (persisted): `src/stores/builder-store.ts`
  - Adds `curatedOnly` toggle and persists it under the existing `ptl-builder-v1` store key.
- Seed script: `scripts/seed.ts`
  - Adds optional `curated_rank` to product seed parsing and writes it into `products.meta.curated_rank`.
- Builder UI / product picker: `src/components/builder/BuilderPage.tsx`
  - Adds “Curated picks” toggle in the Options panel.
  - `ProductPicker` filters/sorts by `curated_rank` when enabled.
- Seed data: `data/products/*.json`
  - Adds `curated_rank` for a subset of products across core categories.

Definitions:

- “Curated picks”: A small subset of products the site recommends by default for MVP usability.
- “curated_rank”: A positive integer indicating recommendation ordering (1 is top pick).

## Plan of Work

1. Extend seed schema to accept `curated_rank` and write to product meta.
2. Add a persisted `curatedOnly` toggle to the builder store.
3. Update `ProductPicker`:
   - When `curatedOnly` is on, show only products with valid `curated_rank`, sorted ascending.
   - If no curated products exist for a category, fall back to the full filtered list.
4. Annotate seed JSON for core categories with `curated_rank` values.
5. Rerun seed and validate behavior in `/builder`.

## Milestones

### Milestone 1: Seed + Store Support

Scope:

- Seed script can accept and store `curated_rank`.
- Builder store persists `curatedOnly`.

Validation:

```bash
pnpm seed
```

Expected: seed completes successfully.

### Milestone 2: Builder Picker Behavior

Scope:

- `/builder` has a “Curated picks” option.
- Product pickers show curated lists by default (when curated items exist).

Validation:

1. Start dev server: `pnpm dev`
2. Visit `http://localhost:3000/builder`
3. Open a product category picker (e.g. Tank, Light)
4. Confirm list is shorter with “Curated picks” enabled and expands when disabled.

### Milestone 3: Regression Validation

Validation:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
```

Expected: all commands succeed.

## Validation and Acceptance

Acceptance criteria:

- With “Curated picks” on, at least Tank and Light pickers show a small ranked list.
- With “Curated picks” off, the full product list is available.
- Compatibility gating still hides incompatible products when “Compatibility” is enabled.
- Seed script continues to succeed; tests pass.

## Idempotence and Recovery

- Reseeding (`pnpm seed`) is idempotent (upserts).
- If curated data is missing or incorrect, remove/fix `curated_rank` in `data/products/*.json` and rerun `pnpm seed`.

## Interfaces and Dependencies

- No new dependencies.
- Seed format change is backward compatible: `curated_rank` is optional.

