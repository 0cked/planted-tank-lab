# Plan Review Packet (Approval Gate) (T022)

Date: 2026-02-14
Project: Planted Tank Lab Builder Refactor
Status: Planning complete through T022; implementation not started.

---

## Executive Summary

This packet consolidates the Builder refactor planning work (T001–T021) into a single approval gate.

Core intent:
- Replace dashboard-like Builder feel with an immersive, creative-first experience.
- Restore full camera agency (no snap-back, persistent user-owned control).
- Replace frustrating substrate sculpting with tactile local control (node-grid direction).
- Preserve interaction performance under realistic creative workloads.

Current recommendation:
- **Approve transition from planning to overhaul implementation planning track (T023+)** with strict adherence to Wednesday design/dev standards and phase gates.

---

## Problem Statement (What this plan solves)

Observed issues in baseline Builder:
1. UI composition reads as SaaS dashboard rather than creative scene tool.
2. Camera behavior can feel constrained or unexpectedly reset.
3. Substrate editing interaction model is unintuitive and insufficiently local.
4. Visual atmosphere lacks the depth/game-like benchmark seen in inspiration references.

Business/product impact:
- Lower immersion and creative confidence
- Increased friction in core composition flow
- Reduced differentiation of Builder experience quality

---

## Work Completed (Artifacts Index)

### Diagnosis & baseline (T001–T006)
- `docs/refactor/builder-baseline.md`
- `docs/refactor/theme-misalignment-audit.md`
- `docs/refactor/dashboard-feel-root-causes.md`
- `docs/refactor/camera-reset-diagnosis.md`
- `docs/refactor/substrate-current-model-diagnosis.md`
- `docs/refactor/inspiration-analysis.md`

### Experience/spec direction (T007–T011)
- `docs/refactor/experience-principles.md`
- `docs/refactor/layout-ia-spec.md`
- `docs/refactor/visual-direction-spec.md`
- `docs/refactor/camera-ux-spec.md`
- `docs/refactor/substrate-ux-spec.md`

### Architecture decisions & validation strategy (T012–T021)
- `decisions/ADR-camera-control-architecture.md`
- `decisions/ADR-substrate-node-grid-architecture.md`
- `docs/refactor/performance-risk-model.md`
- `docs/refactor/dependency-sequence-map.md`
- `docs/refactor/acceptance-criteria-matrix.md`
- `docs/refactor/validation-plan.md`
- `docs/refactor/test-scenarios.md`
- `docs/refactor/instrumentation-plan.md`
- `docs/refactor/phased-delivery-plan.md`
- `docs/refactor/implementation-backlog-skeleton.md`

---

## Key Decisions

1. **Camera architecture:** user-owned controller with explicit framing commands only.
2. **Substrate architecture:** node-grid/control-lattice model with localized interpolation and deterministic edit transactions.
3. **Sequencing:** stage-first layout and camera reliability before substrate + visual polish tails.
4. **Validation model:** measurable AC matrix + scripted scenarios + telemetry evidence.
5. **Standards baseline:** Wednesday dev/design standards apply for overhaul implementation work.

---

## Delivery Strategy Snapshot

Execution is organized into phases with explicit gates:
- **Phase 1:** Stage-first layout foundation
- **Phase 2:** Camera control stabilization
- **Phase 3:** Substrate node-grid interaction core
- **Phase 4:** Visual direction & atmosphere integration
- **Phase 5:** End-to-end hardening and release readiness

Cross-phase gate policy:
- No progression without prior phase exit criteria evidence.
- Camera/substrate performance reliability treated as blocking gates.

---

## Acceptance & Validation Coverage

- Acceptance criteria matrix defines objective pass/fail targets (AC-01..AC-18).
- Test scenario suite S01–S09 maps camera, substrate, visual hierarchy, flow, and performance checks.
- Instrumentation plan defines event taxonomy and KPI linkage to AC targets.

Validation outcomes required before release recommendation:
- Camera snap-back incidents eliminated in scripted runs.
- Substrate local-control and undo/redo determinism validated.
- Creative-flow completion and scene-first perception thresholds achieved.
- Performance budgets met at target quality tiers.

---

## Risks & Mitigations

### Major risks
1. Camera and substrate interaction regressions during integration.
2. Performance degradation under richer visual treatment and live terrain editing.
3. Scope creep from parallel UI/system redesign streams.

### Mitigations
- ADR-bound implementation constraints for camera/substrate.
- Telemetry-backed gate reviews for each phase.
- Explicit phase non-goals and dependency-driven sequencing.
- Regression watch dashboards and alert thresholds from T019.

---

## Open Questions (for approval discussion)

1. Participant availability and timing for formal validation sessions.
2. Final owner assignments per epic before execution starts.
3. Preferred rollout posture (single integrated push vs phased exposure).
4. Any additional non-functional constraints not yet captured (e.g., release-window requirements).

---

## Approval Gate

### Decision requested
- [ ] **Approve to proceed to implementation-planning continuation (T023–T030) and subsequent engineering execution gating.**

### Conditions of approval
- Wednesday standards remain mandatory across implementation artifacts.
- Phase gates and AC evidence remain binding for progress decisions.
- No bypass of camera/substrate performance guardrails.

### If not approved
- Return with requested edits and revise affected planning artifacts before proceeding.

---

## Exit Criteria Check (T022 DoD)

- [x] Executive summary included
- [x] Decision highlights and architecture choices included
- [x] Risks and mitigations included
- [x] Open questions included
- [x] Explicit approve-to-implement checkbox included
