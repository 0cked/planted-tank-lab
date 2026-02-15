# Instrumentation & Observability Plan (T019)

Date: 2026-02-14
Scope: Define telemetry/events and observability needed to measure immersion, camera control quality, and substrate editing fluency.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/validation-plan.md` (T017)
- `docs/refactor/test-scenarios.md` (T018)
- `docs/refactor/performance-risk-model.md` (T014)

## 1) Instrumentation Objectives

1. Quantify camera and substrate responsiveness against budget targets.
2. Detect regressions in scene interaction smoothness and stability.
3. Measure completion/failure patterns in core creative flows.
4. Provide evidence for AC pass/fail decisions and go/no-go gates.

## 2) Event Taxonomy

## A. Session & context events
- `builder_session_started`
- `builder_session_ended`
- `builder_step_changed`
- `builder_quality_tier_resolved`

Core fields:
- `session_id`
- `build_id`
- `user_id` (if available)
- `timestamp_ms`
- `quality_tier`
- `device_profile` (cores, memory hints, UA class)

## B. Camera events
- `camera_interaction_started` (mode: orbit|pan|zoom)
- `camera_interaction_ended`
- `camera_pose_persisted`
- `camera_pose_restored`
- `camera_command_invoked` (frame_tank|focus_selection|reset)
- `camera_unexpected_pose_delta_detected` (diagnostic)

Key fields:
- `mode`
- `duration_ms`
- `pose_delta`
- `trigger_source` (user|system)
- `step_id`

## C. Substrate editing events
- `substrate_edit_started`
- `substrate_edit_committed`
- `substrate_edit_undone`
- `substrate_edit_redone`
- `substrate_constraint_hit`
- `substrate_volume_updated`

Key fields:
- `edit_mode` (raise/lower/smooth/erode or node_edit future)
- `node_count_affected` (future node-grid)
- `transaction_duration_ms`
- `volume_liters`
- `bags_required`
- `constraint_type`

## D. Performance events
- `interaction_latency_sample`
- `frame_time_sample`
- `long_task_detected`
- `quality_fallback_applied`

Key fields:
- `interaction_type` (camera/substrate)
- `latency_ms`
- `frame_time_ms`
- `fps_window_avg`
- `long_task_ms`
- `fallback_reason`

## E. UX flow events
- `asset_placed`
- `step_completion_state_changed`
- `review_opened`
- `build_save_attempted`
- `build_save_result`

Key fields:
- `step_id`
- `result` (success/failure)
- `error_code` (if failure)

## 3) KPI Mapping (to AC IDs)

| KPI | Source events | AC linkage | Target |
|---|---|---|---|
| Camera p95 input latency | interaction_latency_sample (camera) | AC-13 | <= 50ms p95 |
| Substrate p95 input latency | interaction_latency_sample (substrate) | AC-14 | <= 60ms p95 |
| Frame stability by tier | frame_time_sample | AC-15 | Meets T014 thresholds |
| Snap-back incidence | camera_unexpected_pose_delta_detected | AC-07/08 | 0 in scripted runs |
| Camera restore success | camera_pose_restored vs expected | AC-09 | >=95% |
| Substrate transaction success | substrate_edit_committed + undo/redo outcomes | AC-10/12 | Deterministic in scripted runs |
| Creative flow completion | step_completion_state_changed + review_opened | AC-18 | >= defined scenario completion threshold |

## 4) Sampling & Collection Strategy

- High-frequency metrics (frame/latency) sampled in bounded windows during active interactions.
- Event throttling to avoid telemetry overhead.
- Session-level summary emitted at session end for quick dashboarding.
- Preserve detailed traces for scripted validation sessions; aggregate in normal usage.

## 5) Data Quality & Privacy

- Do not log sensitive freeform user content.
- Use stable anonymous/session IDs where possible.
- Record technical and behavioral metrics only.
- Ensure timestamps are monotonic and comparable across events.

## 6) Dashboards / Views Needed

1. **Interaction Performance Dashboard**
   - camera/substrate latency p50/p95
   - FPS by quality tier and step
2. **Regression Watch Dashboard**
   - snap-back events
   - quality fallback frequency
   - long task distribution
3. **Flow Health Dashboard**
   - step completion funnel
   - failure points by step and device profile

## 7) Alerting Thresholds (planning)

- Camera latency p95 > 50ms over rolling window -> warning
- Substrate latency p95 > 60ms -> warning
- Sustained frame drops below tier floor -> warning
- Any reproducible snap-back diagnostic events in scripted runs -> critical

## 8) Implementation Notes (for later)

- Instrumentation must be non-blocking and low-overhead.
- Use shared event schema constants to prevent drift.
- Add test hooks for scripted scenario capture alignment.

## 9) Exit Criteria Check (T019 DoD)

- [x] Event dictionary defined
- [x] KPI mapping tied to AC matrix
- [x] Sampling/collection strategy defined
- [x] Ready input for T020 roadmap planning
