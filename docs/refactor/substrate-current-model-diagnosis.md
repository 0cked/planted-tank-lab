# Current Substrate Sculpting Model Diagnosis (T005)

Date: 2026-02-14
Scope: Document existing substrate editing pipeline, constraints, and UX friction.
Status: Planning artifact (no implementation).

## Executive Finding

Current sculpting is a **brush-modifies-aggregate-profile** system, not a direct surface editing system. Users are editing a small set of global substrate parameters indirectly, which makes terrain changes feel imprecise and non-tactile.

## Current Data Model

Substrate is represented by a compact profile (`VisualSubstrateProfile`) with only global controls:
- `leftDepthIn`, `centerDepthIn`, `rightDepthIn`
- `frontDepthIn`, `backDepthIn`
- `moundHeightIn`, `moundPosition`

References:
- `src/components/builder/visual/types.ts`
- `src/lib/visual/substrate.ts`

### Model implications
- No per-location control nodes exist.
- Terrain shape is reconstructed from interpolation + mound function, not directly authored per point.
- Fine local edits are hard because brush updates global terms.

## End-to-End Sculpt Pipeline (Current)

## 1) Input layer
- User picks sculpt mode (`raise/lower/smooth/erode`), brush size, brush strength in UI.
- Pointer down/move on substrate during sculpt mode triggers `sculptAtPoint()`.

References:
- UI controls: `src/components/builder/VisualBuilderPage.tsx`
- pointer handlers: `src/components/builder/visual/VisualBuilderScene.tsx`

## 2) Edit function layer
- Pointer world position is converted to normalized x/z.
- `applySubstrateBrush()` computes radial falloff and updates global profile values.
- For smooth mode, values are moved toward profile average.

Reference:
- `src/components/builder/visual/scene-utils.ts` (`applySubstrateBrush`)

## 3) State/update layer
- `onSubstrateProfile(nextProfile)` updates store via `setSubstrateProfile`.
- Profile is normalized/clamped (depth/mound constraints).

Reference:
- `src/stores/visual-builder-store.ts` (`setSubstrateProfile`)
- `src/lib/visual/substrate.ts` (`normalizeSubstrateProfile`)

## 4) Mesh regeneration layer
- `TankShell` rebuilds substrate geometry in `useMemo` when profile/dims/quality change.
- `substrateGeometry()` samples height per vertex from `sampleSubstrateDepth()` and recomputes normals.

References:
- `src/components/builder/visual/VisualBuilderScene.tsx` (`substrateGeometry`, `TankShell`)
- `src/components/builder/visual/scene-utils.ts` (`sampleSubstrateDepth`)

## 5) Feedback layer
- Visual mesh updates in scene.
- Indirect numeric feedback shown via fill target/bag count and diagnostics percentages.
- No explicit node-level selection/hover/handle feedback.

References:
- `src/components/builder/VisualBuilderPage.tsx`
- `src/lib/visual/substrate.ts` (`estimateSubstrateVolume`, contour percentages)

## UX Friction Points (Usability)

1. **Low tactile precision** (High)
   - User cannot grab and drag a specific terrain point vertically.
   - Brush edits feel probabilistic rather than intentional.

2. **Weak locality of control** (High)
   - Global profile terms are affected, so edits can have broad side effects.
   - Hard to shape exact ridges/valleys in a predictable spot.

3. **Insufficient direct manipulation affordance** (High)
   - No visible editable nodes/handles.
   - No selected-point semantics.

4. **Feedback is mostly indirect** (Medium)
   - User sees resulting mesh but lacks explicit edit gizmos and local metrics.
   - Bag/fill updates are useful but not shape-authoring feedback.

5. **No edit history tools for sculpt transactions** (Medium)
   - No explicit undo/redo path found for substrate sculpt actions.

## Technical Limitation Points

1. **Parametric profile ceiling** (Critical)
   - Seven-ish aggregate parameters limit terrain expressiveness.
   - Difficult to represent detailed localized topology.

2. **Brush modifies global terms** (High)
   - `applySubstrateBrush` maps pointer input into weighted updates of profile coefficients.
   - Introduces coupling between local gesture and global outcome.

3. **Full geometry regeneration on profile changes** (Medium-High)
   - Substrate mesh geometry is regenerated/re-normalized when profile updates.
   - Potential perf pressure under continuous sculpt interactions.

4. **Interpolation model not user-authorable at node granularity** (High)
   - Sampling from aggregate profile + mound function is mathematically smooth but artistically constrained.

## Why this mismatches desired direction

Desired: node-grid, tactile, game-engine-like terrain editing with precise local control and clear feedback.

Current: brush-to-parameter abstraction with global coupling and limited terrain vocabulary.

Conclusion: architecture supports fast prototype shaping but not the intended creative-authoring feel.

## Upgrade Pressure (Planning signal)

Highest-pressure deltas to address in redesign phase:
1. Move from aggregate profile editing to node-lattice editing.
2. Introduce explicit node interaction/selection/drag feedback.
3. Shift from whole-surface recompute toward incremental patch updates.
4. Add transaction-level undo/redo for sculpt workflows.

## Exit Criteria Check (T005 DoD)

- [x] Current sculpt pipeline mapped end-to-end (input -> data -> mesh -> feedback)
- [x] Pain points categorized by usability and technical limitations
- [x] Constraints/root causes linked to product feedback
