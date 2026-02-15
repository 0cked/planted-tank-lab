# Performance Guardrail Integration Plan (T028)

Date: 2026-02-15
Scope: Integrate performance budgets/risk controls into overhaul execution phases and acceptance gates.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/performance-risk-model.md` (T014)
- `docs/refactor/instrumentation-plan.md` (T019)
- `docs/refactor/phased-delivery-plan.md` (T020)
- `docs/refactor/camera-implementation-plan.md` (T026)
- `docs/refactor/substrate-implementation-plan.md` (T027)
- `skills/perf-budgets/SKILL.md`

## 1) Guardrail Objectives

1. Protect interaction responsiveness first (camera + substrate).
2. Prevent regressions from visual/mesh complexity during overhaul rollout.
3. Enforce measurable go/no-go gates before advancing phases.
4. Ensure regressions trigger remediation paths, not silent acceptance.

## 2) Budget Baseline (Canonical Targets)

Use previously defined targets from T014/T016 as canonical references:
- Camera interaction latency: p95 <= 50ms (AC-13)
- Substrate interaction latency: p95 <= 60ms (AC-14)
- Frame stability: maintain tier-specific floors under active workflows (AC-15)

Additional policy:
- Any sustained degradation beyond threshold requires gate review.
- Quality-tier fallback may be used only with documented user-impact rationale.

## 3) Phase-Aligned Guardrail Gates

## Gate A — After Phase 1 (Layout Foundation)

Checks:
- No UI composition changes causing measurable interaction jitter.
- Overlay updates do not introduce long-task spikes.

Evidence required:
- baseline frame/latency comparisons vs pre-phase
- long task event trend review

## Gate B — After Phase 2 (Camera)

Checks:
- Camera p95 latency within budget under S01/S02 workloads.
- No unresolved snap-back incidents linked to perf side effects.

Evidence required:
- camera latency distributions
- frame-time traces during orbit/pan/zoom stress
- `camera_unexpected_pose_delta_detected` audit

## Gate C — After Phase 3 (Substrate)

Checks:
- Substrate p95 latency within budget under S04/S05/S09 workloads.
- Patch/mesh updates avoid sustained frame collapse.

Evidence required:
- substrate interaction latency traces
- frame-time + long-task distributions during drag transactions
- node-density/perf-tier comparison table

## Gate D — After Phase 4 (Visual)

Checks:
- Atmosphere/visual additions do not violate phase budgets.
- Post-processing and overlay effects remain tier-appropriate.

Evidence required:
- quality-tier performance comparison (high/med/low)
- fallback frequency and cause analysis

## Gate E — After Phase 5 (Integrated)

Checks:
- End-to-end scenarios S01-S09 stay within budgets across representative devices.
- No open P0 perf regressions.

Evidence required:
- final KPI dashboard snapshots
- unresolved perf issue register (must be empty for P0)

## 4) Profiling Checkpoint Cadence

- **Per-story quick profile:** before merge for performance-sensitive stories.
- **Per-phase deep profile:** prior to gate review (A-E).
- **Regression replay:** rerun last-known-failing scenarios after fixes.

Mandatory workloads:
1. Continuous camera movement (S01/S09 camera segment)
2. Continuous substrate drag edits (S09 substrate segment)
3. Mixed interaction alternation (camera <-> substrate)

## 5) Instrumentation Integration Requirements

Required telemetry stream health:
- `interaction_latency_sample`
- `frame_time_sample`
- `long_task_detected`
- `quality_fallback_applied`
- camera/substrate event families from T019

Integration rules:
- No phase sign-off without telemetry completeness check.
- Sampling windows must be bounded to avoid observability overhead.
- Scripted validation sessions retain higher-fidelity traces for diagnostics.

## 6) Regression Triage Policy

Severity model:
- **P0:** budget breach causing visible stutter/control loss in core scenarios
- **P1:** intermittent breach with recoverable UX impact
- **P2:** minor or edge-case degradation

Response SLAs (planning targets):
- P0: block phase progression; fix before advancing
- P1: mitigation plan required before advancing
- P2: backlog with owner/date, non-blocking unless trend worsens

## 7) Remediation Playbook (Primary Levers)

When budgets fail, apply in this order:
1. Reduce expensive recomputation frequency (camera/substrate loops).
2. Switch to smaller patch updates for terrain changes.
3. Degrade optional visual effects by tier.
4. Minimize overlay re-render churn and nonessential transitions.
5. Re-profile and document delta before re-attempting gate.

## 8) Ownership & Reporting

Per gate, assign:
- Perf owner (collects metrics + recommendation)
- Stream owners (camera, substrate, visual)
- Decision owner (approve/hold/rollback)

Required artifacts per gate:
- metric summary
- risk assessment
- decision log
- remediation backlog (if not green)

## 9) Dependencies / Interfaces

Depends on:
- T026 camera plan checkpoints
- T027 substrate plan checkpoints
- T019 telemetry readiness

Feeds into:
- T029 overhaul sprint sequencing
- T030 final kickoff/approval packet evidence section

## Exit Criteria Check (T028 DoD)

- [x] Budget gates defined per phase
- [x] Profiling cadence and mandatory workloads defined
- [x] Regression triage + remediation path documented
- [x] Integration dependencies and reporting requirements specified
