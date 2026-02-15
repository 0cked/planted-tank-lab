# ADR: Substrate Node-Grid Data & Mesh Architecture

- **Status:** Accepted (planning)
- **Date:** 2026-02-14
- **Decision ID:** ADR-substrate-node-grid-architecture
- **Related tasks:** T005, T011, T013

## Context

Current substrate sculpting uses brush edits over a compact global profile. This creates low local precision, coupled edits, and limited terrain expressiveness.

Product requirement is tactile, game-like substrate editing with direct manipulation, smooth interpolation, clear feedback, and responsive updates.

## Decision

Adopt a **heightfield node-grid architecture** with local interpolation and patch-oriented mesh updates.

## 1) Control lattice model

Define substrate as a 2D lattice over tank footprint:
- `grid[Nx][Nz]` nodes
- each node stores normalized height value `h` in bounded range
- optional per-node metadata: lock flag, weight mask, tag

Recommended starting densities:
- small tanks: 20x14
- medium tanks: 28x18
- large tanks: 36x24

(Exact tier mapping finalized during implementation/perf tuning.)

## 2) Interpolation model

Use two-layer interpolation strategy:

1. **Base interpolation:** bilinear (stable, predictable)
2. **Smoothing pass:** optional local smoothing/falloff for sculpt gestures

Rationale:
- bilinear gives deterministic, easy-to-debug behavior,
- smoothing layer restores organic continuity without hiding control intent.

Future optional upgrade path: bicubic/Catmull-Rom for higher fidelity when budgets allow.

## 3) Edit semantics

- Primary interaction: vertical drag on selected node.
- Neighborhood influence: radius + falloff function (configurable).
- Each gesture produces a transaction boundary for undo/redo.

## 4) Constraints

- Global min/max height clamps by tank dimensions.
- Edge behavior configurable (soft edge default; hard lock optional).
- Local slope clamp to prevent unrealistic cliffs (unless explicitly overridden).

## 5) Mesh generation & update strategy

### Render mesh
- Derive render vertices from sampled heightfield.
- Keep control grid separate from render resolution (decoupled where needed).

### Update approach
- Prefer **incremental patch updates** for affected regions on node edits.
- Recompute normals only for impacted patches when possible.
- Avoid full-mesh rebuild on every pointer move.

### Degradation path
- Low tier: reduced update frequency and/or coarser sampling.
- Medium/high tiers: finer updates with smoother transitions.

## 6) Data persistence

Persist substrate as:
- grid dimensions
- node height array (or compressed representation)
- editing metadata needed for deterministic reconstruction

Do not persist only derived mesh; mesh must be regenerable from canonical node data.

## 7) Alternatives considered

## A) Keep profile-parameter model + improved brush (rejected)
- **Pros:** low implementation cost
- **Cons:** cannot deliver required tactile local control or expressive terrain detail

## B) Voxel substrate volume (rejected)
- **Pros:** very flexible
- **Cons:** complexity/perf cost excessive for current scope and product needs

## C) Heightfield node-grid with interpolation (chosen)
- **Pros:** direct manipulation, controllable complexity, good fit for web 3D budgets
- **Cons:** requires new data model and update pipeline

## Consequences

## Positive
- Enables true node-based editing aligned with product vision.
- Supports precise local terrain shaping and understandable feedback.
- Provides robust foundation for future advanced terrain tools.

## Tradeoffs
- Increased architecture complexity vs current profile model.
- Requires careful optimization to keep drag interactions responsive.

## Validation criteria

1. Users can create localized slope/mound/valley predictably.
2. Mesh updates remain responsive during continuous edits.
3. Undo/redo restores node state and derived terrain deterministically.
4. Saved substrate reloads identically across sessions/devices.

## Follow-on dependencies

- Feeds T014 (performance budgets/risk model)
- Feeds T016 (acceptance matrix)
- Feeds T020 implementation phase planning
