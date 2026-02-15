# Dependency & Sequence Map (T015)

Date: 2026-02-14
Scope: Define critical path, dependency graph, and execution sequence for Builder refactor plan.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/layout-ia-spec.md` (T008)
- `docs/refactor/visual-direction-spec.md` (T009)
- `decisions/ADR-camera-control-architecture.md` (T012)
- `decisions/ADR-substrate-node-grid-architecture.md` (T013)
- `docs/refactor/performance-risk-model.md` (T014)

## 1) Dependency Graph (high level)

- **Foundation diagnostics/design (done):** T001–T011
- **Architecture decisions (done):** T012–T013
- **Performance guardrails (done):** T014
- **Current stage:** T015 sequencing map
- **Next planning gates:** T016 -> T017/T018/T019 -> T020 -> T021 -> T022

## 2) Critical Path

Primary critical path (planning):
1. T015 Dependency & Sequence Map
2. T016 Acceptance Criteria Matrix
3. T017 Validation Plan
4. T019 Instrumentation & Observability Plan
5. T020 Phase-by-Phase Delivery Plan
6. T021 Implementation Backlog Skeleton
7. T022 Plan Review Packet (approval gate)

Rationale:
- Without T016, success cannot be objectively measured.
- Without T017/T019, execution cannot be validated or observed.
- Without T020/T021, implementation handoff lacks structure.
- T022 is mandatory approval gate before code changes in planning-gated areas.

## 3) Parallelizable Workstreams

## Workstream A — Validation design
- T017 (Validation plan)
- T018 (Test scenario scripts)

## Workstream B — Measurement readiness
- T019 (Instrumentation plan)

T018 can run after T017 starts and does not block T019 directly; both converge into T020.

## Workstream C — Delivery packaging
- T020 (phase roadmap)
- T021 (backlog skeleton)
- T022 (review packet)

## 4) Recommended Execution Order (next tasks)

1. **T016** Acceptance criteria matrix (anchor all downstream work)
2. **T017** Validation & research plan
3. **T018** Test scenario scripts
4. **T019** Instrumentation & observability plan
5. **T020** Phase-by-phase delivery plan
6. **T021** Implementation backlog skeleton
7. **T022** Plan review packet

## 5) Blockers & Risk of Rework

## Potential blockers
- Ambiguous acceptance thresholds (if T016 too vague).
- Overly abstract telemetry definitions (if T019 not tied to T016 metrics).
- Phase definitions that do not map cleanly to architectural decisions (T012/T013).

## Rework risk controls
- Force traceability links from every future task back to T012/T013/T014.
- Require each T020 phase deliverable to reference acceptance criteria IDs from T016.
- Require test scenarios (T018) to map to camera + substrate failure modes explicitly.

## 6) Dependency Table

| Task | Depends on | Blocks |
|---|---|---|
| T015 | T008, T009, T012, T013, T014 | T020, T021, T022 |
| T016 | T008, T009, T010, T011, T014 | T017, T019, T020+ |
| T017 | T016 | T018, T020+ |
| T018 | T017 | T020+ |
| T019 | T016, T017 | T020+ |
| T020 | T015, T016, T019 | T021, T022 |
| T021 | T020 | T022 |
| T022 | T001–T021 | Approval to implement |

## 7) Go-Forward Rule

Do not reorder T016 behind T017/T019. Acceptance criteria must come first so validation and instrumentation are measurable and coherent.

## Exit Criteria Check (T015 DoD)

- [x] Sequenced map with critical path defined
- [x] Blockers/risks identified
- [x] Parallelizable workstreams identified
- [x] Recommended order is clear and actionable
