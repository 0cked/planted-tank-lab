# Test Scenario Scripts (Planning Artifacts) (T018)

Date: 2026-02-14
Scope: Define concrete scenario scripts for validating camera control, substrate editing, and creative-flow completion.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/validation-plan.md` (T017)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/camera-ux-spec.md` (T010)
- `docs/refactor/substrate-ux-spec.md` (T011)

## Script Template (use for all scenarios)

- **Scenario ID:**
- **Objective:**
- **Preconditions:**
- **Steps:**
- **Expected result:**
- **AC IDs covered:**
- **Failure capture fields:**
  - observed issue
  - severity (P0/P1/P2)
  - reproduction certainty (always/intermittent/rare)
  - screenshot/video reference
  - notes

---

## S01 — Camera Agency Baseline

- **Objective:** Verify orbit/zoom/pan usability without snap-back.
- **Preconditions:** Builder loaded with sample tank and scene content.
- **Steps:**
  1. Orbit continuously for 30 seconds.
  2. Pan across at least 3 distinct viewpoints.
  3. Zoom in/out repeatedly while orbiting.
  4. Pause input for 5 seconds.
- **Expected result:** No forced drift/reset; pose remains where user leaves it.
- **AC IDs covered:** AC-07, AC-13, AC-15
- **Failure capture:** snap-back, jitter spikes, pan disabled, sudden re-centering.

## S02 — Step Transition Camera Stability

- **Objective:** Confirm step changes do not mutate camera pose implicitly.
- **Preconditions:** Camera moved to non-default pose.
- **Steps:**
  1. Note/record current pose.
  2. Transition step 1 -> 2 -> 3 -> 2 -> 1.
  3. Compare resulting pose to initial.
- **Expected result:** Pose remains unchanged unless explicit frame/focus/reset command used.
- **AC IDs covered:** AC-08
- **Failure capture:** pose jumps on step transition, hidden recentering.

## S03 — Camera Persistence Across Save/Reload

- **Objective:** Validate camera state persistence in draft lifecycle.
- **Preconditions:** Editable build with saved draft capability.
- **Steps:**
  1. Move camera to recognizable custom pose.
  2. Save draft.
  3. Reload builder/draft.
  4. Verify restored camera pose.
- **Expected result:** Camera restored within defined tolerance.
- **AC IDs covered:** AC-09
- **Failure capture:** resets to preset view, partial restore, inconsistent fov/target.

## S04 — Substrate Local Precision: Slope Task

- **Objective:** Confirm user can create a controlled slope with local edits.
- **Preconditions:** Substrate editing mode with node-grid controls enabled (future state).
- **Steps:**
  1. Select nodes on one side of tank.
  2. Raise/lower selected region to create left-to-right slope.
  3. Inspect transition continuity.
- **Expected result:** Predictable local slope with smooth interpolation.
- **AC IDs covered:** AC-10, AC-11
- **Failure capture:** global unintended deformation, jagged seams, ambiguous selection feedback.

## S05 — Substrate Local Precision: Mound + Valley Task

- **Objective:** Confirm distinct localized forms can be authored in one scene.
- **Preconditions:** Same as S04.
- **Steps:**
  1. Create central mound.
  2. Create secondary valley in separate area.
  3. Verify forms remain distinct.
- **Expected result:** Clear local control without unintended distant changes.
- **AC IDs covered:** AC-10, AC-11
- **Failure capture:** cross-coupled edits, loss of locality, unclear node state.

## S06 — Substrate Undo/Redo Determinism

- **Objective:** Validate terrain transaction reversibility.
- **Preconditions:** Terrain edits performed.
- **Steps:**
  1. Record terrain state A.
  2. Execute one drag transaction to state B.
  3. Undo -> expect state A.
  4. Redo -> expect state B.
- **Expected result:** Exact deterministic restoration.
- **AC IDs covered:** AC-12
- **Failure capture:** partial rollback, non-deterministic mesh return.

## S07 — Creative Flow Completion (End-to-End)

- **Objective:** Validate users can complete key builder flow without dashboard-like friction.
- **Preconditions:** Fresh build context.
- **Steps:**
  1. Choose tank.
  2. Shape substrate.
  3. Place hardscape.
  4. Add plants/equipment.
  5. Review state.
- **Expected result:** Flow feels composition-first; users do not report dashboard overload.
- **AC IDs covered:** AC-01, AC-02, AC-03, AC-18
- **Failure capture:** high UI confusion, persistent chrome overload, flow abandonment points.

## S08 — Visual Hierarchy & Inspiration Fidelity Check

- **Objective:** Validate stage-first visual hierarchy and inspiration-aligned depth/lighting.
- **Preconditions:** Representative scenes at low/medium/high quality tiers.
- **Steps:**
  1. Capture step screenshots by tier.
  2. Review against inspiration rubric.
  3. Record hierarchy and depth readability outcomes.
- **Expected result:** Scene is focal; fixture-led lighting and layering cues are clear.
- **AC IDs covered:** AC-04, AC-05, AC-06, AC-16, AC-17
- **Failure capture:** UI dominates scene, weak depth readability, inconsistent lighting grammar.

## S09 — Performance Stress Path

- **Objective:** Validate responsiveness under realistic interaction stress.
- **Preconditions:** Typical-to-heavy scene complexity.
- **Steps:**
  1. Continuous camera movement for 60s.
  2. Continuous substrate drag edits for 45s.
  3. Alternate between camera and editing interactions.
- **Expected result:** Meets latency/FPS thresholds by quality tier.
- **AC IDs covered:** AC-13, AC-14, AC-15
- **Failure capture:** sustained frame drops, input lag spikes, degradation not recovered.

## Scenario-to-Criteria Coverage Summary

- Camera: S01, S02, S03
- Substrate: S04, S05, S06
- Flow/feel: S07
- Visual fidelity: S08
- Performance: S09

## Exit Criteria Check (T018 DoD)

- [x] Scenario set includes setup/preconditions
- [x] Steps and expected outcomes defined per scenario
- [x] Failure capture fields standardized
- [x] Coverage maps to acceptance criteria IDs
