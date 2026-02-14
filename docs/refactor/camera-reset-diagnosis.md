# Camera Lock / Reset Diagnosis (T004)

Date: 2026-02-14
Scope: Trace where camera pose is reset/overridden in current Builder architecture.
Status: Planning artifact (no implementation).

## Executive Finding

The camera currently behaves as a **step-driven cinematic camera**, not a user-owned free camera. User navigation is continuously pulled back toward per-step presets, and pan is disabled. This matches the observed snap-back feeling.

## Evidence (Code-Level)

### 1) Preset camera targets are hard-coded per step
- File: `src/components/builder/visual/VisualBuilderScene.tsx`
- Function: `cameraPreset(step, dims)`
- Behavior: returns a fixed `position`, `target`, and `fov` for each step (`tank`, `substrate`, `hardscape`, etc.).

### 2) Every frame, camera lerps toward preset
- File: `src/components/builder/visual/VisualBuilderScene.tsx`
- Component: `CinematicCameraRig`
- In `useFrame`:
  - `camera.position.lerp(preset.position, blend)`
  - `controls.target.lerp(preset.target, blend)`
- Effect: even if user orbits/zooms, each frame applies restorative drift back to preset pose.

### 3) Pan is explicitly disabled
- File: `src/components/builder/visual/VisualBuilderScene.tsx`
- `<OrbitControls enablePan={false} ... />`
- Effect: directly violates desired camera capability (orbit + zoom + pan).

### 4) Preset changes when step/dimensions change
- File: `src/components/builder/visual/VisualBuilderScene.tsx`
- `preset = useMemo(() => cameraPreset(props.step, props.dims), [props.dims, props.step])`
- `VisualBuilderScene` camera props also derive from `cameraPreset(props.currentStep, dims)`.
- Effect: on step changes and dimension changes, camera target state shifts to a new preset envelope.

### 5) Step transitions are frequent and explicit
- File: `src/components/builder/VisualBuilderPage.tsx`
- `applyStepChange(nextStep)` updates `currentStep` on normal navigation.
- Effect: navigation naturally triggers different camera presets.

### 6) Stored camera mode exists but is not controlling runtime camera behavior
- Files:
  - `src/stores/visual-builder-store.ts` (supports `sceneSettings.cameraPreset` = `step|free`)
  - `src/components/builder/visual/VisualBuilderScene.tsx` (always uses step preset logic)
- Effect: architectural mismatch — persistence schema suggests free mode exists, but scene runtime remains preset-dominant.

## Lifecycle / Event Trace (Current)

1. Builder renders scene with camera initialized from `cameraPreset(currentStep, dims)`.
2. OrbitControls accepts user input (orbit/zoom; no pan).
3. On each animation frame, rig blends camera/target toward current step preset.
4. User perceives camera “fighting back” or slowly snapping to canonical angle.
5. Step change updates `currentStep` -> new preset selected -> camera convergence target changes again.
6. Tank dimension change updates `dims` -> preset recalculated -> camera convergence target shifts.

## Suspected Ownership Flaws

1. **Camera ownership is with step presets, not user intent.**
2. **Continuous preset enforcement (frame loop) overrides interactive camera autonomy.**
3. **No durable persisted user pose used as active camera source of truth.**
4. **`cameraPreset: free` capability is modeled in state but not enacted in scene controller path.**

## Why this causes the product issue

Feedback requested full perspective agency (orbit/pan/zoom, persistence, no forced resets). Current architecture optimizes for cinematic framing consistency instead, creating a mismatch between intended creative tool behavior and implemented camera policy.

## Candidate Reset Trigger List (for architecture redesign)

- Step transition (`currentStep` change)
- Tank/dimension change (`dims` change)
- Continuous frame-loop blending toward preset
- Potential remount/re-init via camera props tied to current step preset

## Severity Assessment

- **User agency impact:** Critical
- **Immersion impact:** Critical
- **Architecture debt:** High (state model and runtime controller diverge)

## References

- `src/components/builder/visual/VisualBuilderScene.tsx`
- `src/components/builder/VisualBuilderPage.tsx`
- `src/stores/visual-builder-store.ts`
- Prior baseline docs:
  - `docs/refactor/builder-baseline.md`
  - `docs/refactor/theme-misalignment-audit.md`
  - `docs/refactor/dashboard-feel-root-causes.md`

## Exit Criteria Check (T004 DoD)

- [x] Event/lifecycle trace documented
- [x] Camera initialization/update/reset points identified
- [x] Suspected ownership flaws documented
- [x] Root-cause evidence tied to observed snap-back behavior
