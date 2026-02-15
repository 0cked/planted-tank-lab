# Substrate Node-Grid Implementation Plan (Task Breakdown) (T027)

Date: 2026-02-15
Scope: Break substrate redesign into sequenced implementation tasks under approved substrate ADR and UX spec.
Status: Planning artifact (implementation-ready plan, no coding in this task).

Inputs:
- `decisions/ADR-substrate-node-grid-architecture.md` (T013)
- `docs/refactor/substrate-ux-spec.md` (T011)
- `docs/refactor/test-scenarios.md` (S04-S06, S09)
- `docs/refactor/instrumentation-plan.md` (substrate/perf events)
- `docs/refactor/wednesday-enforcement-checklist.md` (T023)

## 1) Objective

Deliver tactile, local-control substrate editing using a node-grid heightfield model with:
- predictable node manipulation
- smooth interpolation between nodes
- real-time visual feedback during edits
- deterministic undo/redo at transaction boundaries
- performance-safe mesh update strategy

## 2) Workstream Breakdown (Sequenced)

## Milestone M1 — Data Model & Grid Configuration

**Goal:** establish canonical node-grid model and sizing rules.

Tasks:
1. Define lattice schema (node coordinates, elevation, constraints, metadata).
2. Define grid density policy by tank size and quality tier.
3. Establish terrain constraints (height floor/ceiling, slope clamps).
4. Define migration/initialization path from current substrate representation.

Deliverable:
- substrate data model contract + density matrix.

## Milestone M2 — Interaction Contract & Handle System

**Goal:** create predictable direct-manipulation editing behavior.

Tasks:
1. Define sculpt-mode-only node handle visibility rules.
2. Specify hover/selection states and local neighborhood highlighting.
3. Define drag mechanics (axis lock, constraints, snapping behavior if applicable).
4. Define multi-node selection and grouped edit semantics.

Deliverable:
- interaction state machine for node editing.

## Milestone M3 — Interpolation & Mesh Update Pipeline

**Goal:** produce smooth terrain behavior with efficient updates.

Tasks:
1. Finalize interpolation strategy for neighboring node influence.
2. Define patch-oriented/incremental mesh update boundaries.
3. Define visual feedback layers (live preview, commit confirmation, constraints hit).
4. Add fallback behavior for worst-case dense edit paths.

Deliverable:
- mesh update pipeline spec with patch lifecycle.

## Milestone M4 — Undo/Redo Transaction Model

**Goal:** ensure deterministic terrain edit reversibility.

Tasks:
1. Define transaction boundaries (drag start -> drag end commit).
2. Capture before/after node subsets for reversible operations.
3. Specify redo invalidation behavior after divergent edits.
4. Define edge-case handling (partial failures, canceled drags).

Deliverable:
- edit transaction protocol + determinism checks.

## Milestone M5 — Validation, Perf, and Gate Evidence

**Goal:** verify substrate UX and responsiveness before phase progression.

Tasks:
1. Execute S04/S05 (slope, mound+valley precision tasks).
2. Execute S06 (undo/redo determinism).
3. Execute substrate portions of S09 (interaction stress path).
4. Validate telemetry/KPI targets for AC-10/11/12/14/15.

Deliverable:
- substrate gate evidence package with pass/fail and known risks.

## 3) Test Points & Acceptance Mapping

## Primary scripted tests
- **S04:** local slope precision
- **S05:** localized mound + valley composition
- **S06:** undo/redo determinism
- **S09:** sustained interaction/performance stress

## Acceptance criteria mapping
- AC-10: local control precision
- AC-11: interpolation quality/readability
- AC-12: deterministic undo/redo
- AC-14: substrate interaction latency
- AC-15: frame stability under editing

## Instrumentation checkpoints
- `substrate_edit_started/committed`
- `substrate_edit_undone/redone`
- `substrate_constraint_hit`
- `substrate_volume_updated`
- `interaction_latency_sample` + `frame_time_sample` + `long_task_detected`

## 4) Data Migration Approach (Planning)

Migration principles:
1. Preserve user-visible terrain intent where possible.
2. Use deterministic conversion from legacy substrate depth profile to node-grid baseline.
3. Version substrate payloads for backwards compatibility handling.
4. Provide fallback initialization if legacy payload integrity fails.

Migration validation:
- sample legacy scenes converted and visually spot-checked
- no catastrophic terrain inversion or clipping after conversion

## 5) Failure Rollback Strategy

If substrate rollout regresses usability/performance:

1. **Interaction rollback:** disable advanced multi-node interactions, keep single-node stable path.
2. **Update pipeline rollback:** temporarily reduce patch complexity or grid density by tier.
3. **Persistence rollback:** freeze edits to safe commit granularity until determinism restored.
4. **Gate block:** hold downstream sprint integration until AC-10/11/12/14/15 pass.

Rollback requirements:
- preserve existing user substrate data
- preserve auditability of edit transactions and telemetry
- provide re-entry criteria tied to failed acceptance checks

## 6) Dependencies / Interfaces

Upstream dependencies:
- T022 approval packet complete
- T023 enforcement baseline active

Cross-stream interfaces:
- Camera stream (T026) must remain stable to prevent confounded substrate UX findings
- Performance guardrails (T028) consume substrate latency/fps evidence

Downstream dependencies:
- T029 sprint plan sequencing and risk gating

## 7) Completion Checks (Definition of Done for Substrate Plan Execution)

A substrate implementation stream is complete when:
- [ ] Node-grid data model is canonical and versioned
- [ ] Interaction contract supports clear local edits with constraints
- [ ] Interpolation + mesh updates are responsive in continuous edits
- [ ] Undo/redo is deterministic in S06 runs
- [ ] AC-10/11/12/14/15 pass with evidence
- [ ] Rollback and migration contingencies documented and testable

## 8) Risks & Mitigations

Risks:
1. Dense grid updates causing frame drops under sustained drag.
2. Interpolation artifacts that reduce perceived control precision.
3. Migration edge cases from legacy terrain payloads.

Mitigations:
- quality-tier-aware grid density and patch update throttling
- interpolation tuning with scenario-based validation
- versioned migration + fallback initialization path

## Exit Criteria Check (T027 DoD)

- [x] Sequenced substrate implementation milestones defined
- [x] Data model, interaction, and mesh update strategy captured
- [x] Validation, migration, and rollback strategy documented
- [x] Explicit completion checks provided
