# Implementation Backlog Skeleton (Planning Only) (T021)

Date: 2026-02-14
Scope: Create execution-ready backlog structure mapped to phased roadmap and acceptance criteria.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/phased-delivery-plan.md` (T020)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/instrumentation-plan.md` (T019)

## Backlog Model

- **Epic** = major delivery stream aligned to phase gates.
- **Story** = user-visible or system-behavior slice with clear acceptance checks.
- **Task** = implementation unit (to be created during execution planning).

Required fields per story:
- Story ID
- Linked phase
- Problem statement
- Scope
- AC linkage
- Telemetry linkage (from T019)
- Dependencies
- Definition of done (execution-time)

---

## Epic E1 — Stage-First UI Foundation (Phase 1)

### Story S1.1 — Viewport-first shell composition
- **Phase:** 1
- **Scope:** Establish layout where scene is dominant surface; reduce always-on chrome.
- **AC linkage:** AC-01, AC-02
- **Telemetry linkage:** step completion flow + session context events
- **Dependencies:** none (post-approval)

### Story S1.2 — Contextual panel/hud visibility rules
- **Phase:** 1
- **Scope:** Convert persistent controls to context-sensitive surfaces.
- **AC linkage:** AC-03
- **Telemetry linkage:** builder_step_changed + overlay usage events
- **Dependencies:** S1.1

### Story S1.3 — Step-surface hierarchy consistency
- **Phase:** 1
- **Scope:** Ensure each step presents only relevant controls and guidance.
- **AC linkage:** AC-01, AC-03, AC-18
- **Telemetry linkage:** flow completion funnel events
- **Dependencies:** S1.1, S1.2

## Epic E2 — Camera Ownership & Persistence (Phase 2)

### Story S2.1 — Camera controller ownership refactor
- **Phase:** 2
- **Scope:** Implement ADR-defined camera state ownership boundaries.
- **AC linkage:** AC-07, AC-08
- **Telemetry linkage:** camera interaction + unexpected pose delta events
- **Dependencies:** E1 completion gate

### Story S2.2 — Explicit framing command contract
- **Phase:** 2
- **Scope:** Enforce explicit-only frame/focus/reset behavior.
- **AC linkage:** AC-08
- **Telemetry linkage:** camera_command_invoked
- **Dependencies:** S2.1

### Story S2.3 — Camera persistence lifecycle
- **Phase:** 2
- **Scope:** Persist and restore camera pose across save/reload and step transitions.
- **AC linkage:** AC-09
- **Telemetry linkage:** camera_pose_persisted, camera_pose_restored
- **Dependencies:** S2.1

### Story S2.4 — Camera responsiveness hardening
- **Phase:** 2
- **Scope:** Meet latency/fps budgets during orbit/pan/zoom interactions.
- **AC linkage:** AC-13, AC-15
- **Telemetry linkage:** interaction_latency_sample, frame_time_sample
- **Dependencies:** S2.1, S2.2

## Epic E3 — Substrate Node-Grid Interaction System (Phase 3)

### Story S3.1 — Node-grid substrate data model integration
- **Phase:** 3
- **Scope:** Introduce/control lattice model and interpolation path per ADR.
- **AC linkage:** AC-10, AC-11
- **Telemetry linkage:** substrate_edit_started/committed + volume update events
- **Dependencies:** E2 gate

### Story S3.2 — Local terrain manipulation UX
- **Phase:** 3
- **Scope:** Deliver localized slope/mound/valley editing behavior.
- **AC linkage:** AC-10, AC-11
- **Telemetry linkage:** substrate transaction metrics
- **Dependencies:** S3.1

### Story S3.3 — Deterministic substrate undo/redo
- **Phase:** 3
- **Scope:** Ensure transaction-level reversibility and reproducibility.
- **AC linkage:** AC-12
- **Telemetry linkage:** substrate_edit_undone, substrate_edit_redone
- **Dependencies:** S3.1

### Story S3.4 — Substrate performance envelope
- **Phase:** 3
- **Scope:** Meet interaction latency and frame stability under editing stress.
- **AC linkage:** AC-14, AC-15
- **Telemetry linkage:** latency/frame samples + long task events
- **Dependencies:** S3.2, S3.3

## Epic E4 — Visual Direction & Atmosphere (Phase 4)

### Story S4.1 — Token/component alignment package
- **Phase:** 4
- **Scope:** Apply approved visual system mapping across Builder surfaces.
- **AC linkage:** AC-04, AC-05
- **Telemetry linkage:** quality tier + session context baselines
- **Dependencies:** E1 gate (can start partial after E2)

### Story S4.2 — Lighting/depth hierarchy pass
- **Phase:** 4
- **Scope:** Improve scene depth cues and fixture-led atmosphere.
- **AC linkage:** AC-06, AC-16, AC-17
- **Telemetry linkage:** performance + quality fallback events
- **Dependencies:** S4.1, E3 partial integration checks

### Story S4.3 — Overlay readability tuning
- **Phase:** 4
- **Scope:** Ensure overlays support composition without scene dominance loss.
- **AC linkage:** AC-04, AC-05
- **Telemetry linkage:** step completion + friction events (qualitative tags)
- **Dependencies:** S4.1

## Epic E5 — Integrated Flow Hardening & Launch Readiness (Phase 5)

### Story S5.1 — Full scenario suite execution harness
- **Phase:** 5
- **Scope:** Run and capture S01-S09 test scenarios with consistent evidence.
- **AC linkage:** all relevant ACs
- **Telemetry linkage:** all key event families from T019
- **Dependencies:** E1–E4 completion

### Story S5.2 — Regression triage & closure backlog
- **Phase:** 5
- **Scope:** Track and close P0/P1 findings from integrated validation.
- **AC linkage:** all impacted ACs
- **Telemetry linkage:** alert thresholds + regression dashboards
- **Dependencies:** S5.1

### Story S5.3 — Go/No-Go decision package assembly
- **Phase:** 5
- **Scope:** Consolidate evidence for final launch recommendation.
- **AC linkage:** AC-18 + cross-system pass status
- **Telemetry linkage:** KPI summary views
- **Dependencies:** S5.1, S5.2

---

## Priority Ordering (initial)

1. E1 (Stage-first foundation)
2. E2 (Camera reliability)
3. E3 (Substrate core)
4. E4 (Visual atmosphere)
5. E5 (Integrated hardening)

## Backlog Readiness Checklist (for execution kickoff)

- [ ] Owners assigned per epic/story
- [ ] Story sizing and sprint allocation added
- [ ] AC-level tests attached per story
- [ ] Telemetry instrumentation tickets linked
- [ ] Dependencies validated against active code branches

## Exit Criteria Check (T021 DoD)

- [x] Backlog skeleton created with epics/stories placeholders
- [x] Stories mapped to roadmap phases
- [x] Acceptance-criteria references included
- [x] Ready input for T022 plan review packet
