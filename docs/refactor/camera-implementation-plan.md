# Camera UX Implementation Plan (Task Breakdown) (T026)

Date: 2026-02-15
Scope: Break camera redesign into sequenced implementation tasks under approved camera ADR and UX spec.
Status: Planning artifact (implementation-ready plan, no coding in this task).

Inputs:
- `decisions/ADR-camera-control-architecture.md` (T012)
- `docs/refactor/camera-ux-spec.md` (T010)
- `docs/refactor/test-scenarios.md` (S01-S03)
- `docs/refactor/instrumentation-plan.md` (camera event model)
- `docs/refactor/wednesday-enforcement-checklist.md` (T023)

## 1) Objective

Deliver a reliable, user-owned camera system for Builder with:
- stable orbit/pan/zoom control
- no snap-back on unrelated updates
- explicit-only frame/focus/reset behavior
- pose persistence across step transitions and draft lifecycle

## 2) Workstream Breakdown (Sequenced)

## Milestone M1 — Camera State Ownership Hardening

**Goal:** enforce single source of truth for pose/target/fov.

Tasks:
1. Identify and map all current camera mutation entry points.
2. Define canonical camera state shape (pose, target, mode, metadata).
3. Route camera reads/writes through one camera controller boundary.
4. Remove/disable implicit per-frame pose overrides.

Deliverable:
- camera ownership map + implementation checklist attached to ADR references.

## Milestone M2 — Explicit Intent Command Layer

**Goal:** allow camera changes only via explicit intents.

Tasks:
1. Define intent contract: `orbit`, `pan`, `zoom`, `frame_tank`, `focus_selection`, `reset_view`.
2. Tag each intent with source (`user` vs `system`) and guard conditions.
3. Block non-intent camera mutations from step/state side effects.
4. Ensure step transitions are camera-neutral by default.

Deliverable:
- intent matrix mapping trigger -> allowed mutation -> expected outcome.

## Milestone M3 — Persistence & Restore Lifecycle

**Goal:** preserve user camera pose through normal Builder lifecycle.

Tasks:
1. Define save/restore schema for camera state in draft/session.
2. Implement transition-safe restore ordering (after scene readiness boundary).
3. Add restore tolerance checks (position/target/fov thresholds).
4. Add fallback behavior for invalid/legacy camera payloads.

Deliverable:
- persistence lifecycle spec with sequence diagram.

## Milestone M4 — UX Controls & Feedback Surface Alignment

**Goal:** ensure user-facing camera controls are clear and non-intrusive.

Tasks:
1. Confirm control placement in UI composition blueprint surfaces.
2. Add explicit camera command affordances only (no hidden framing).
3. Define compact camera mode indicator behavior.
4. Document reduced-motion-safe camera transition behaviors.

Deliverable:
- camera control UI behavior matrix.

## Milestone M5 — Reliability, Perf, and Launch Gate

**Goal:** validate camera robustness/performance before phase gate approval.

Tasks:
1. Run scripted tests S01-S03 (camera agency/step stability/persistence).
2. Validate telemetry for unexpected pose delta incidents.
3. Verify latency/FPS camera budgets from AC-13/AC-15.
4. Produce pass/fail summary and unresolved issue list.

Deliverable:
- camera phase gate evidence package.

## 3) Test Points & Validation Map

## Primary scripted tests
- **S01:** camera agency baseline
- **S02:** step-transition stability
- **S03:** persistence across save/reload

## Acceptance criteria mapping
- AC-07: no snap-back behavior
- AC-08: no implicit step-based recentering
- AC-09: persistence correctness
- AC-13: camera latency budget
- AC-15: frame stability during camera interaction

## Instrumentation checkpoints
- `camera_interaction_started/ended`
- `camera_command_invoked`
- `camera_pose_persisted/restored`
- `camera_unexpected_pose_delta_detected`
- `interaction_latency_sample` + `frame_time_sample`

## 4) Failure Rollback Strategy

If regressions occur, rollback at controlled seams:

1. **Command-layer rollback:** disable new intents behind feature flag and revert to prior stable explicit controls.
2. **Persistence rollback:** disable restore path while keeping save path if restore introduces instability.
3. **Rendering-loop rollback:** re-enable previous camera update path only if no snap-back is reintroduced (temporary).
4. **Gate block:** do not advance to dependent phase gates until camera AC set passes.

Rollback requirements:
- preserve user draft integrity
- preserve telemetry visibility for root-cause analysis
- include incident note with regression signature and re-entry criteria

## 5) Dependencies / Interfaces

Upstream dependencies:
- T022 approval packet complete
- T023 enforcement baseline active

Downstream dependencies:
- T028 performance guardrail integration references camera gate outputs
- T029 sprint orchestration depends on camera milestone confidence

## 6) Completion Checks (Definition of Done for Camera Plan Execution)

A camera implementation stream is considered complete when:
- [ ] Single source of truth enforced for camera state
- [ ] All camera mutations trace to explicit intents
- [ ] No snap-back in S01/S02 runs
- [ ] Persistence passes S03 with defined tolerance
- [ ] AC-07/08/09/13/15 pass with evidence
- [ ] Rollback notes and contingency paths documented

## 7) Risks & Mitigations

Risks:
1. Hidden camera writes from legacy paths.
2. Restore timing race with scene readiness.
3. Performance regressions from additional camera state instrumentation.

Mitigations:
- mutation entrypoint audit + guard assertions
- explicit readiness gating for restore application
- telemetry sampling windows and low-overhead instrumentation discipline

## Exit Criteria Check (T026 DoD)

- [x] Sequenced camera implementation milestones defined
- [x] Test points and AC mapping included
- [x] Failure rollback strategy documented
- [x] Explicit completion checks provided
