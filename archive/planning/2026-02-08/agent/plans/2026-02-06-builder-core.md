# Implement Builder Core (Selection, State, Rules, Warnings, Share Links)

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Deliver a functional PCPartPicker-like builder at `/builder`:
- Users can pick a product per equipment category (tank/light/etc.) and add multiple plants.
- Builder state is managed client-side via Zustand.
- Compatibility is evaluated client-side using the 10 seeded rules from `compatibility_rules`.
- Warnings/errors are shown inline per category and as a summary banner.
- A running price total is displayed (best-effort from offers; falls back gracefully when no offers exist).
- Builds can be saved anonymously to the DB and shared via a short `share_slug` (nanoid, 10 chars). Visiting `/builder/[shareSlug]` hydrates the builder.

## Progress

- [x] (2026-02-06) Read `PLAN.md` sections 3.2 and 5.2 (rules + builder UX).
- [x] (2026-02-06) Milestone 1: Builder store (Zustand) + compatibility engine + unit tests.
- [x] (2026-02-06) Milestone 2: tRPC endpoints for builder data (categories/products/plants/rules) and build persistence (create/update/get by share_slug).
- [ ] Milestone 3: Builder UI (pickers, summary bar, warnings) wired to state + tRPC.
- [ ] Milestone 4: Share links (save + copy URL) and `/builder/[shareSlug]` hydration.
- [ ] Milestone 5: Verification (lint/type/test/build/dev + production smoke) and commits pushed.

## Surprises & Discoveries

- None yet.

## Decision Log

- Decision: Evaluate rules using the structured `condition_logic.type` keys from seeded `data/rules.json`.
  Rationale: Seeded rules are structured JSON already; implementing a small evaluator for these types keeps the engine data-driven.
  Date: 2026-02-06

## Outcomes & Retrospective

- Pending implementation.

## Context and Orientation

Relevant existing files:
- DB schema: `src/server/db/schema.ts`
- DB connection: `src/server/db/index.ts`
- tRPC root/router: `src/server/trpc/router.ts`, `src/server/trpc/routers/*`
- tRPC handler: `src/app/api/trpc/[trpc]/route.ts`
- Client provider: `src/components/TRPCProvider.tsx`
- Current builder page: `src/app/builder/page.tsx` (server component list)

New/updated areas for this task:
- Zustand store: `src/stores/builder-store.ts`
- Compatibility engine: `src/engine/types.ts`, `src/engine/evaluate.ts`
- Engine tests: `tests/engine/*` (Vitest)
- Builder UI components: `src/components/builder/*`
- Builder routes: `src/app/builder/page.tsx`, `src/app/builder/[shareSlug]/page.tsx`

Terminology:
- “Selection”: chosen product for a category slug (single) or plant list (multi).
- “Evaluation”: a triggered rule result (severity + rendered message).
- “Share slug”: short stable ID stored on `builds.share_slug` used in share URLs.

## Plan of Work

1. Implement a pure TypeScript compatibility evaluator:
- Input: active rules + a normalized build snapshot (selected products + selected plants + flags).
- Output: ordered evaluations (errors first, then warnings, then recommendations, then completeness).
- Must be resilient to missing specs.

2. Implement Zustand builder store:
- Holds category selections and plant selections.
- Holds shareSlug/buildId once saved.
- Provides actions for add/remove/swap and hydration from DB.

3. Extend tRPC routers:
- `products.listByCategorySlug`
- `plants.list`
- `rules.listActive`
- `offers.lowestByProductIds` (optional, may return empty)
- `builds.createOrUpdateAnonymous` and `builds.getByShareSlug`

4. Build UI:
- Main builder client component uses tRPC queries to load categories + pickers.
- Radix Dialog for product/plant pickers.
- Summary bar showing total, CO2 presence, warning/error counts.
- Inline category row status + “Choose” / “Swap” / “Remove”.

5. Share/save:
- “Share” triggers save mutation, updates URL to `/builder/[shareSlug]`, copies share URL to clipboard.
- `/builder/[shareSlug]` loads build from DB and hydrates store.

## Milestones

### Milestone 1: Store + Engine + Tests

Scope:
- Zustand store exists and is used by the UI.
- Compatibility engine evaluates the 10 seeded rule types.
- Unit tests cover each rule type.

Steps:
1. Create `src/engine/types.ts` defining rule/evaluation/build snapshot types.
2. Create `src/engine/evaluate.ts` implementing evaluation for all 10 seeded `condition_logic.type` values.
3. Create `src/stores/builder-store.ts` with selections + actions + hydration.
4. Add `tests/engine/compatibility.test.ts` (Vitest) with at least one test per rule type.

Validation:
- `pnpm test` passes and exercises the engine.

### Milestone 2: tRPC Builder Data + Persistence

Scope:
- Client can query products by category, plants, rules.
- Builds can be saved to DB (anonymous) and retrieved by `share_slug`.

Steps:
1. Add `products.listByCategorySlug` (join brand, filter by category slug).
2. Add `rules.listActive` returning active rules.
3. Add `builds.getByShareSlug` and `builds.upsertAnonymous` (creates build + build_items).
4. Add offers aggregation endpoint (best-effort).

Validation:
- `pnpm typecheck` passes.
- A local script or UI call can create and then fetch a build by share slug.

### Milestone 3: Builder UI Wiring

Scope:
- `/builder` is interactive with pickers and renders warnings.

Steps:
1. Convert `src/app/builder/page.tsx` to render a client builder component.
2. Add `src/components/builder/BuilderPage.tsx` (client) with summary + rows.
3. Add picker dialogs for products and plants.
4. Wire evaluations to summary and inline status.

Validation:
- `pnpm dev` then visit `/builder` and make selections.

### Milestone 4: Share Links + Hydration

Scope:
- Share links work and hydrate builder state.

Steps:
1. Add route `src/app/builder/[shareSlug]/page.tsx`.
2. Implement “Share” button save-and-copy.
3. Hydrate store from fetched build.

Validation:
- Create a build, click Share, open the copied URL and see the same selections.

### Milestone 5: Verification + Deploy

Scope:
- Quality gates pass and production serves updated builder.

Validation:
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- `curl -I https://plantedtanklab.com/builder` returns 200.

## Validation and Acceptance

Acceptance:
- User can choose a tank and light from seeded products.
- Builder computes evaluations without crashing when data is missing.
- Warnings/errors visible in UI.
- Share URL persists and reloads build selections.

## Idempotence and Recovery

- Save is implemented as upsert: repeated share clicks update the same build.
- Seeded rules remain source of truth; engine is forward-compatible by skipping unknown `condition_logic.type`.

## Interfaces and Dependencies

- Zustand store exports: `useBuilderStore` and typed actions.
- Engine exports: `evaluateBuild(rules, snapshot) => evaluations[]`.
- tRPC procedures: `products.listByCategorySlug`, `plants.list`, `rules.list`, `builds.getByShareSlug`, `builds.upsertAnonymous`.
