# Camera UX Spec (T010)

Date: 2026-02-14
Scope: Define required camera capabilities, interaction contract, and persistence behavior for Builder.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/camera-reset-diagnosis.md`
- `docs/refactor/experience-principles.md`
- `docs/refactor/layout-ia-spec.md`

## 1) UX Objective

Make camera behavior feel **user-owned, smooth, and predictable**:
- no forced snap-back,
- no hidden reset behaviors,
- clear and explicit framing actions.

## 2) Interaction Contract

## Required controls
1. **Orbit** (primary): drag to rotate around target.
2. **Zoom**: wheel/pinch with smoothing.
3. **Pan**: modifier-drag (or secondary drag) with smooth translation.
4. **Focus Selection**: explicit command to frame selected object/node.
5. **Frame Tank**: explicit command to frame entire composition.

## Prohibited implicit behaviors
- No per-frame re-centering toward step presets during user navigation.
- No automatic reset on step transitions.
- No automatic reset on unrelated state updates (selection, tool switch, panel open/close).

## Allowed auto-framing events (strict)
- First load of new build/session (optional, one-time).
- Explicit user invocation: “Frame Tank” / “Focus Selection”.
- Explicit “Reset Camera” action.

## 3) Camera State Model (UX-facing)

Persist and honor these values:
- `position`
- `target`
- `fov` or zoom level
- optional damping momentum state (implementation-dependent)

### Persistence levels
- **In-session persistence:** survives step changes and UI state changes.
- **Draft persistence:** camera pose saved with build draft.
- **Restore behavior:** reopening draft restores last user camera pose (unless user chooses reset).

## 4) Step Behavior Rules

- Step changes should not alter camera pose by default.
- Optional step guidance may suggest framing actions, but never force them.
- Review mode may offer optional idle orbit preview only when user opts into preview mode.

## 5) Mode + Camera Interop Rules

- Tool mode changes (place/move/rotate/sculpt) must not mutate camera pose.
- Object selection updates inspector only; camera moves only if user triggers focus action.
- Sculpt mode should preserve navigation capabilities so users can inspect terrain from arbitrary angles.

## 6) Input & Feel Targets

## Orbit
- Smooth damping enabled.
- No sudden azimuth/polar jumps from system events.

## Zoom
- Continuous and controlled; avoid abrupt clipping into glass.
- Respect near/far constraints without jerky clamping.

## Pan
- Enabled by default in creative steps.
- Speed scales sensibly with scene dimensions.

## 7) UI Affordances

Provide visible camera affordances in stage UI:
- “Frame Tank”
- “Focus Selection” (when selection exists)
- “Reset Camera”
- Optional small hint text for controls on first use

Do not bury core camera actions in deep menus.

## 8) Error Prevention / Recovery

- If camera enters invalid pose (e.g., clipping/extreme angle), allow instant recovery via reset/frame actions.
- If selection focus target disappears, maintain current pose (no abrupt jump).

## 9) Acceptance Criteria (Objective)

1. User can orbit/zoom/pan continuously for 30+ seconds with no snap-back drift.
2. Camera pose remains unchanged after changing steps 1→2→3 and back.
3. Selecting/deselecting items does not move camera unless focus command invoked.
4. Reopening a saved draft restores last camera pose.
5. Frame/Focus/Reset commands each produce intentional, predictable camera movement.

## 10) Traceability to diagnosed issues

This spec directly addresses diagnosed root causes:
- eliminates per-frame preset override behavior,
- restores pan capability,
- aligns runtime behavior with explicit user-intent camera model.

## Exit Criteria Check (T010 DoD)

- [x] Interaction contract defined
- [x] Auto-frame rules defined explicitly
- [x] Camera persistence expectations defined
- [x] Acceptance criteria included and testable
