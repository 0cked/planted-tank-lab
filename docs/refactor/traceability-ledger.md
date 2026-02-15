# AC / Test / Telemetry Traceability Ledger (T035)

Date: 2026-02-15  
Project: Planted Tank Lab Builder  
Status: Planning-only traceability artifact (no implementation changes).

## Inputs

- `docs/refactor/implementation-backlog-skeleton.md` (T021)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/test-scenarios.md` (T018)
- `docs/refactor/instrumentation-plan.md` (T019)
- `docs/refactor/overhaul-sprint-plan.md` (T029)
- `docs/refactor/story-sizing-capacity-plan.md` (T034)

---

## 1) Objective

Create one evidence ledger that links every planned story to:
1) acceptance criteria (AC IDs),
2) validation scenarios,
3) telemetry/event evidence,
4) gate-level proof requirements.

This prevents orphaned ACs and enables fast GO/HOLD decisions.

---

## 2) Story-Level Traceability Ledger

| Story | AC IDs | Primary scenarios | Required telemetry/events | Gate evidence package |
|---|---|---|---|---|
| S1.1 | AC-01, AC-02 | S07, S08 | `builder_session_started`, `builder_step_changed` | Gate A: stage-dominance screenshots + step-state audit |
| S1.2 | AC-03 | S07 | `builder_step_changed` | Gate A: contextual panel default-state checklist |
| S1.3 | AC-01, AC-03, AC-18 | S07 | `step_completion_state_changed`, `review_opened` | Gate A: flow walkthrough + confusion/friction log |
| S2.1 | AC-07, AC-08 | S01, S02 | `camera_interaction_started/ended`, `camera_unexpected_pose_delta_detected` | Gate B: camera ownership/behavior regression report |
| S2.2 | AC-08 | S02 | `camera_command_invoked` | Gate B: explicit-command-only transition proof |
| S2.3 | AC-09 | S03 | `camera_pose_persisted`, `camera_pose_restored` | Gate B: save/reload pose-restore pass report |
| S2.4 | AC-13, AC-15 | S01, S09 | `interaction_latency_sample`, `frame_time_sample`, `long_task_detected` | Gate B: p95 camera latency + frame stability chart |
| S3.1 | AC-10, AC-11 | S04, S05 | `substrate_edit_started/committed`, `substrate_constraint_hit` | Gate C: node-grid locality evidence + state clarity checks |
| S3.2 | AC-10, AC-11 | S04, S05 | `substrate_edit_started/committed`, `substrate_volume_updated` | Gate C: local form-authoring demonstration logs |
| S3.3 | AC-12 | S06 | `substrate_edit_undone`, `substrate_edit_redone` | Gate C: deterministic undo/redo replay output |
| S3.4 | AC-14, AC-15 | S09 | `interaction_latency_sample`, `frame_time_sample`, `quality_fallback_applied` | Gate C: substrate latency + frame budget report |
| S4.1 | AC-04, AC-05 | S08 | `builder_quality_tier_resolved`, `builder_step_changed` | Gate D: token/component conformance review packet |
| S4.2 | AC-06, AC-16, AC-17 | S08 | `frame_time_sample`, `quality_fallback_applied` | Gate D: lighting/depth rubric + perf-tier evidence |
| S4.3 | AC-04, AC-05 | S08, S07 | `step_completion_state_changed`, `review_opened` | Gate D: overlay readability and scene-dominance audit |
| S5.1 | AC-01..AC-17 | S01-S09 | all scenario-relevant events from T019 | Gate E: full scenario matrix with pass/fail and links |
| S5.2 | impacted ACs from findings | failed scenarios from S01-S09 | event families tied to each regression | Gate E: P0/P1 closure ledger + residual-risk report |
| S5.3 | AC-18 (+ all open AC deltas) | S07 + aggregate from S01-S09 | KPI summary views (latency/fps/snap-back/incidents) | Gate E: final GO/HOLD evidence packet |

---

## 3) AC Coverage Check (No-Orphan Validation)

| AC ID | Mapped stories | Mapped scenarios | Status |
|---|---|---|---|
| AC-01 | S1.1, S1.3, S5.1 | S07 | Covered |
| AC-02 | S1.1, S5.1 | S07 | Covered |
| AC-03 | S1.2, S1.3, S5.1 | S07 | Covered |
| AC-04 | S4.1, S4.3, S5.1 | S08 | Covered |
| AC-05 | S4.1, S4.3, S5.1 | S08 | Covered |
| AC-06 | S4.2, S5.1 | S08 | Covered |
| AC-07 | S2.1, S5.1 | S01 | Covered |
| AC-08 | S2.1, S2.2, S5.1 | S02 | Covered |
| AC-09 | S2.3, S5.1 | S03 | Covered |
| AC-10 | S3.1, S3.2, S5.1 | S04, S05 | Covered |
| AC-11 | S3.1, S3.2, S5.1 | S04, S05 | Covered |
| AC-12 | S3.3, S5.1 | S06 | Covered |
| AC-13 | S2.4, S5.1 | S01, S09 | Covered |
| AC-14 | S3.4, S5.1 | S09 | Covered |
| AC-15 | S2.4, S3.4, S5.1 | S01, S09 | Covered |
| AC-16 | S4.2, S5.1 | S08 | Covered |
| AC-17 | S4.2, S5.1 | S08 | Covered |
| AC-18 | S1.3, S5.3 | S07 | Covered |

Result: **No AC orphaning detected.**

---

## 4) Gate Evidence Minimums

| Gate | Required minimum evidence |
|---|---|
| Gate A | S1.1-S1.3 AC evidence + S07 walkthrough + layout state screenshots |
| Gate B | S2.1-S2.4 camera behavior/perf evidence + S01-S03 results |
| Gate C | S3.1-S3.4 substrate behavior/perf evidence + S04-S06/S09 results |
| Gate D | S4.1-S4.3 visual + readability + perf-tier evidence + S08 results |
| Gate E | Full S01-S09 suite, unresolved risk ledger, and final AC status summary |

Gate-block rule:
- Any story marked complete without linked AC evidence + scenario result + telemetry reference is **not gate-eligible**.

---

## 5) Evidence Packaging Template (per story)

- Story ID:
- Sprint/Gate:
- AC IDs (explicit):
- Scenario runs (IDs + run date):
- Telemetry snapshot links:
- Pass/fail summary:
- Known defects + severity:
- Decision recommendation (advance/hold):

---

## 6) Risks & Mitigations

| Risk | Impact | Mitigation | Rollback seam |
|---|---|---|---|
| Evidence drift between docs and execution | Slow/noisy gate decisions | Use this ledger as single source for AC/story traceability | Freeze gate and regenerate evidence bundle |
| Telemetry gaps for a story | Weak objective validation | Mark story non-gate-eligible until telemetry link exists | Hold story completion state |
| Scenario coverage skipped under timeline pressure | Hidden regressions | Gate-block rule requires scenario evidence per mapped AC | Force hold and run missing scenarios |

---

## 7) Completion Checks (T035 DoD)

- [x] All planned stories mapped to AC IDs.
- [x] Story-to-scenario links defined.
- [x] Story-to-telemetry evidence links defined.
- [x] No AC orphaning remains.

---

## 8) Exit Criteria Check (Mirror T035)

- [x] Ledger covers all sprint stories with no AC orphaning and includes evidence expectations per gate.
