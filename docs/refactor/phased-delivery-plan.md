# Phase-by-Phase Delivery Plan (T020)

Date: 2026-02-14
Scope: Convert approved diagnosis/spec/ADR/validation outputs into an execution-ready phase roadmap.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/dependency-sequence-map.md` (T015)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/instrumentation-plan.md` (T019)
- Camera/substrate ADRs and UX specs (T010–T013)

## Delivery Principles

1. **Immersion first:** prioritize viewport dominance and camera agency before visual polish tails.
2. **Risk-first sequencing:** de-risk camera ownership and substrate interaction architecture early.
3. **Measured rollout:** every phase has explicit exit criteria tied to ACs and instrumentation.
4. **No hidden scope creep:** each phase includes non-goals to preserve momentum.

## Phase 0 — Readiness & Baseline Lock

**Goal:** Freeze planning intent into execution scaffolding so implementation can proceed without ambiguity.

**Deliverables:**
- Finalized planning docs index + decision references
- AC tracing map (feature -> AC IDs)
- Telemetry schema approval from T019

**Exit criteria:**
- Team can map each upcoming work item to acceptance criteria and telemetry events
- No unresolved architectural blockers

**Non-goals:**
- No UI or system behavior changes

## Phase 1 — Stage-First Layout Foundation

**Goal:** Establish immersive layout/IA shell that removes dashboard-first feel.

**Deliverables:**
- Viewport-dominant composition structure
- Contextual panel/hud behavior rules implemented
- Reduced always-on chrome per IA spec

**Primary AC focus:** AC-01, AC-02, AC-03

**Exit criteria:**
- Screen hierarchy reads scene-first in all core steps
- Context surfaces appear only when relevant
- Validation scripts show reduced UI overload reports

**Non-goals:**
- Final visual polish package
- Substrate system replacement

## Phase 2 — Camera Control System Stabilization

**Goal:** Enforce user-owned camera behavior with persistence and explicit framing only.

**Deliverables:**
- Camera controller ownership model implemented per ADR
- Orbit/pan/zoom interaction contract delivered
- Camera persistence and explicit command handling

**Primary AC focus:** AC-07, AC-08, AC-09, AC-13, AC-15

**Exit criteria:**
- No snap-back in scripted scenarios (S01/S02)
- Pose persistence validated across save/reload (S03)
- Latency/FPS metrics within defined budget envelope

**Non-goals:**
- Final substrate node-grid editing
- End-state cinematic polish tuning

## Phase 3 — Substrate Node-Grid Interaction Core

**Goal:** Replace current sculpt behavior with tactile local-control substrate editing.

**Deliverables:**
- Node-grid data model + interpolation integration per ADR
- Localized terrain manipulation interactions
- Deterministic undo/redo transaction behavior

**Primary AC focus:** AC-10, AC-11, AC-12, AC-14, AC-15

**Exit criteria:**
- Slope + mound/valley scenarios pass (S04/S05)
- Undo/redo deterministic in scripted runs (S06)
- Substrate interaction latency budget met

**Non-goals:**
- Full visual direction completion
- Long-tail asset library optimization

## Phase 4 — Visual Direction & Atmosphere Integration

**Goal:** Bring immersive visual language in line with inspiration and site brand system.

**Deliverables:**
- Approved token/component usage mapped to builder surfaces
- Lighting/depth/motion treatment aligned to visual spec
- Overlay readability and hierarchy refinement

**Primary AC focus:** AC-04, AC-05, AC-06, AC-16, AC-17

**Exit criteria:**
- Inspiration fidelity checks pass in S08
- No regression to dashboard-like composition
- Visual quality stable across quality tiers

**Non-goals:**
- New feature surface expansion unrelated to overhaul

## Phase 5 — End-to-End Flow Hardening & Release Readiness

**Goal:** Validate integrated experience across full creative flow and performance envelopes.

**Deliverables:**
- Full scenario suite run (S01–S09)
- KPI dashboard review and regression triage closure
- Final release recommendation package

**Primary AC focus:** AC-18 plus all prior AC regression checks

**Exit criteria:**
- Full creative flow completion meets threshold
- Critical/P0 issues resolved or explicitly waived
- Go/no-go decision documented with evidence

**Non-goals:**
- Post-release experimentation roadmap

## Cross-Phase Gates

- **Gate A (after Phase 1):** Stage-first hierarchy accepted
- **Gate B (after Phase 2):** Camera reliability accepted
- **Gate C (after Phase 3):** Substrate fluency accepted
- **Gate D (after Phase 4):** Visual fidelity accepted
- **Gate E (after Phase 5):** Launch readiness accepted

## Risk Controls by Phase

- Require telemetry checks before phase sign-off (T019 alignment)
- Hold regression review at every gate for camera + substrate performance
- Keep explicit rollback points for camera and substrate architecture changes

## Dependency Notes

- Phase 2 depends on Phase 1 shell stability.
- Phase 3 depends on camera interaction stability to avoid compounded UX confusion.
- Phase 4 can begin partially in parallel after Phase 2, but must validate against Phase 3 interaction outcomes.
- Phase 5 depends on complete integration of Phases 1–4.

## Exit Criteria Check (T020 DoD)

- [x] Phase roadmap with goals and deliverables defined
- [x] Exit criteria and non-goals documented per phase
- [x] Sequence reflects dependency/risk ordering
- [x] Roadmap ready input for T021 backlog skeleton
