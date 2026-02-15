# Full UI/UX Overhaul Sprint Plan (Execution-Ready) (T029)

Date: 2026-02-15
Scope: Sequence UI, visual, camera, substrate, and performance streams into a unified delivery program.
Status: Planning artifact (execution-ready, no implementation in this task).

Inputs:
- `docs/refactor/phased-delivery-plan.md` (T020)
- `docs/refactor/ui-composition-blueprint.md` (T024)
- `docs/refactor/visual-spec-package.md` (T025)
- `docs/refactor/camera-implementation-plan.md` (T026)
- `docs/refactor/substrate-implementation-plan.md` (T027)
- `docs/refactor/perf-guardrail-integration-plan.md` (T028)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)

## 1) Program Goal

Deliver a cohesive overhaul that:
- feels scene-first and creative (not dashboard-like)
- guarantees camera agency and substrate fluency
- preserves performance budgets under realistic usage
- reaches final approval with clear milestone evidence

## 2) Workstreams

1. **WS-A UI Composition** (layout, context surfaces, step-state behavior)
2. **WS-B Visual System** (tokens/components/motion/atmosphere)
3. **WS-C Camera** (ownership, intents, persistence, reliability)
4. **WS-D Substrate** (node-grid data/model, interactions, mesh updates)
5. **WS-E Performance & Observability** (gates, profiling, regressions)

## 3) Sprint Sequence (Recommended)

## Sprint 0 — Kickoff + Instrumented Readiness

Focus:
- confirm scope, owners, branch strategy, and enforcement checklists
- verify telemetry/event readiness for camera/substrate/perf monitoring

Primary outputs:
- sprint board initialized by workstream
- gate evidence template prepared

Gate to advance:
- readiness checklist complete for all workstreams

## Sprint 1 — Stage-First Shell + Camera Foundations

Focus:
- WS-A: implement stage-first shell and contextual panel model
- WS-C: establish camera state ownership boundary and intent contract foundation
- WS-E: baseline perf capture for new shell/camera paths

AC targets:
- AC-01, AC-02, AC-03 (layout)
- initial progress toward AC-07/08

Demo milestone:
- scene-first builder shell with stable, explicit camera command path

## Sprint 2 — Camera Reliability + Substrate Core Bootstrapping

Focus:
- WS-C: persistence lifecycle and snap-back elimination
- WS-D: node-grid data model + interaction contract scaffold
- WS-E: camera/substrate early stress profiling

AC targets:
- AC-07, AC-08, AC-09 (camera)
- foundational progress for AC-10/11

Demo milestone:
- camera scripted scenarios S01-S03 green or near-green with tracked deltas

## Sprint 3 — Substrate Interaction Completion + Visual Pass 1

Focus:
- WS-D: interpolation/mesh updates + deterministic undo/redo
- WS-B: apply primary token/component mapping to core surfaces
- WS-E: substrate stress checks and regression triage

AC targets:
- AC-10, AC-11, AC-12, AC-14
- AC-04/05 progress via visual pass alignment

Demo milestone:
- slope/mound/valley workflows demonstrably usable (S04-S06), visual hierarchy preserved

## Sprint 4 — Atmosphere Integration + Cross-System Hardening

Focus:
- WS-B: depth/lighting/motion refinement aligned to inspiration
- WS-A/WS-C/WS-D: cross-system polish and interaction edge-case fixes
- WS-E: Gate D perf and quality-tier stability checks

AC targets:
- AC-04, AC-05, AC-06, AC-16, AC-17
- maintain camera/substrate AC regressions at zero

Demo milestone:
- integrated immersive experience with stable control fidelity

## Sprint 5 — Integrated Validation & Release Recommendation

Focus:
- full S01-S09 scenario sweep
- resolve P0/P1 findings
- compile go/no-go packet evidence

AC targets:
- AC-18 + full regression sweep for AC-01..AC-17

Demo milestone:
- release-readiness review with evidence-backed recommendation

## 4) Dependency Gates (Hard)

- **Gate A:** Sprint 1 complete before deep visual layering
- **Gate B:** Camera reliability accepted before substrate-heavy integration
- **Gate C:** Substrate deterministic and responsive before final atmosphere push
- **Gate D:** Visual integration accepted without budget breaches
- **Gate E:** Integrated validation complete before kickoff packet sign-off

## 5) Milestone Demo Plan

Each sprint ends with:
1. 10-15 minute interactive walkthrough
2. AC delta report (newly green / still open / regressed)
3. Perf budget report (camera/substrate/frame)
4. Decision: advance / hold / rollback scope

## 6) Acceptance Criteria Link Matrix (Condensed)

- Sprint 1: AC-01/02/03 (+ camera foundational checks)
- Sprint 2: AC-07/08/09 (+ substrate model readiness)
- Sprint 3: AC-10/11/12/14 (+ AC-04/05 partial)
- Sprint 4: AC-04/05/06/16/17
- Sprint 5: AC-18 + full regression confirmation (01-17)

## 7) Risk Register (Program-Level)

1. **Cross-stream collision risk** (layout/visual changes masking camera/substrate issues)
   - Mitigation: staged gates and scenario-isolated test runs.
2. **Performance drift under visual enrichment**
   - Mitigation: per-sprint budget checks and tier fallback strategy.
3. **Scope expansion risk**
   - Mitigation: enforce non-goals and fixed sprint objectives.

## 8) Ownership Model (Template)

- Program lead: overall sequencing + gate decisions
- WS-A owner: UI composition
- WS-B owner: visual system
- WS-C owner: camera
- WS-D owner: substrate
- WS-E owner: performance/observability

(Assign named owners during kickoff.)

## 9) Exit Criteria Check (T029 DoD)

- [x] Sequenced sprint plan created across all streams
- [x] Dependency gates and milestone demos defined
- [x] Acceptance criteria linkage included
- [x] Ready input for T030 kickoff packet
