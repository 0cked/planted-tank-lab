# PlantedTankLab Execution Plan (Authoritative)

Last updated: 2026-02-12

This is the only active planning and checkpoint document.
All previous planning systems were archived under `archive/planning/2026-02-12-visual-builder-pivot/`.

## Direction Lock

- Primary product direction: **Visual Builder v1** (core product capability).
- Architecture direction: **ingestion -> normalization -> canonical storage -> cached derivatives -> presentation**.
- Deployment direction: **Fly.io long-lived web + worker + scheduler processes**.
- Planning direction: **this file only**.

## Current Milestone

- `Phase 1` Visual Builder v1 (active)

## Execution Phases

### Phase 0 - Repo Cleanup + Alignment

- [x] Archive old planning/checkpoint system (`AUTOPILOT.md`, `PLAN_EXEC.md`, `PROGRESS.md`, `VERIFY.md`).
- [x] Archive deprecated/abandoned visual effects planning artifacts.
- [x] Update `AGENTS.md` to match a single planning system.
- [x] Update `README.md` startup docs to reference this plan.
- [x] Confirm no parallel planning docs remain in repo root.

Acceptance criteria:
- Root planning docs are unambiguous.
- `AGENTS.md` and `README.md` both point to `PLANS.md` as authoritative.

---

### Phase 1 - Visual Builder Foundation (v1)

#### 1A. Core visual canvas + state

- [ ] Implement a dedicated visual builder state model (serializable JSON) with canvas items:
  - `assetId`, `x`, `y`, `scale`, `rotation`, `layer`.
- [ ] Implement tank selection (rimless catalog SKUs only) and proportional canvas sizing.
- [ ] Implement drag, rotate, scale, duplicate, delete, and layering controls.
- [ ] Implement left panel asset browser (hardscape, plants, substrate, equipment) with search/filter.
- [ ] Implement right panel live BOM with quantities + estimated cost.

Acceptance criteria:
- User can place 50+ objects without functional breakage.
- Builder state survives refresh (local persisted state).
- BOM updates in real-time as objects are edited.

Verify:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- tests/builder/*`

#### 1B. Data and API contract

- [ ] Add `builds.tank_id` and `builds.canvas_state` to schema + migration.
- [ ] Extend build upsert/query APIs to persist and return visual canvas state.
- [ ] Keep backward compatibility with existing build snapshots and share links.

Acceptance criteria:
- Existing build pages continue working.
- New visual state round-trips through DB without data loss.

Verify:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- tests/api/builds*`

#### 1C. Monetization-ready BOM

- [ ] Show SKU, price, and buy CTA per monetizable BOM line item.
- [ ] Route buy CTAs through secure redirect endpoints (`/go/[offerId]`) for trackability.
- [ ] Ensure client never exposes raw affiliate templates/tags.

Acceptance criteria:
- BOM buy buttons resolve to server redirect routes.
- No raw affiliate secrets in client payloads.

Verify:
- `pnpm test -- tests/server/affiliate.test.ts tests/api/offers.test.ts`

---

### Phase 2 - Save / Share / Duplicate

- [ ] Save visual builds to account-backed records.
- [ ] Generate/read public share URLs with read-only public mode.
- [ ] Duplicate public builds into user-owned editable builds.

Acceptance criteria:
- Save and reopen preserve tank + all canvas item transforms.
- Public URL is view-only and cannot mutate original build.

Verify:
- `pnpm test -- tests/api/builds*`
- Playwright smoke for share flow.

---

### Phase 3 - Compatibility Warnings in Visual Builder

- [ ] Integrate existing compatibility engine with visual build state.
- [ ] Add required warnings:
  - undersized filter,
  - light width mismatch,
  - CO2-required plants without CO2,
  - unrealistic hardscape volume load.
- [ ] Surface warnings in right panel with severity hierarchy.

Acceptance criteria:
- Warnings update deterministically as user edits build.
- User can still proceed with explicit warning visibility.

Verify:
- `pnpm test -- tests/engine/* tests/builder/*`

---

### Phase 4 - Export + Production Hardening

- [ ] Add PNG export for current layout.
- [ ] Ensure pointer interactions stay responsive and avoid blocking renders.
- [ ] Verify no console errors and strict lint/typecheck clean.
- [ ] Add/refresh smoke tests for core Visual Builder path.

Acceptance criteria:
- Exported image reflects layout reliably.
- Builder is mobile-usable and desktop-polished.
- No TypeScript or lint errors.

Verify:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e` (smoke subset)

---

## Immediate Next 3 Tasks

1. Implement visual builder domain types + Zustand store (`src/stores/visual-builder-store.ts`).
2. Add DB migration + schema changes for `tank_id` and `canvas_state` on `builds`.
3. Build new `VisualBuilderPage` layout and wire `/builder` to it.

## Resume Protocol (for any new agent session)

1. Read this file (`PLANS.md`) fully.
2. Find the first unchecked item in Phase 1.
3. Implement end-to-end with tests.
4. Check the item when verification passes.
5. Commit with conventional commit message.
