# Performance Budget & Risk Model (T014)

Date: 2026-02-14
Scope: Define measurable performance budgets, identify high-risk scenarios, and map mitigations for camera + rendering + substrate systems.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/visual-direction-spec.md`
- `docs/refactor/camera-ux-spec.md`
- `docs/refactor/substrate-ux-spec.md`
- `decisions/ADR-camera-control-architecture.md`
- `decisions/ADR-substrate-node-grid-architecture.md`

## 1) Performance Priorities (in order)

1. **Input responsiveness** (camera + substrate editing)
2. **Frame stability** (smooth interaction in active editing)
3. **Visual fidelity scaling** (quality tiers preserve hierarchy without stutter)
4. **Deterministic state updates** (no jank from uncontrolled recomputation)

## 2) Budget Targets (planning baseline)

## A. Interaction latency
- Camera interaction response: **<= 50ms p95** from input to visible response.
- Substrate drag response: **<= 60ms p95** from pointer move to visible terrain update.

## B. Frame time / smoothness
- Active editing target:
  - **High tier:** >= 50 FPS typical, never sustained < 35 FPS
  - **Medium tier:** >= 40 FPS typical, never sustained < 28 FPS
  - **Low tier:** >= 30 FPS typical, never sustained < 24 FPS

## C. Long tasks
- Avoid main-thread blocking tasks > **16ms** repeatedly during drag.
- Avoid periodic spikes > **50ms** during normal camera movement.

## D. Visual effects policy
- Post-processing must degrade gracefully by quality tier.
- Effects must be disabled/reduced before sacrificing input responsiveness.

## 3) High-Risk Scenarios

## R1 — Camera jitter/snap under state churn
- **Cause:** camera updates coupled to step or scene state changes.
- **Impact:** immediate immersion break; trust loss.
- **Likelihood:** High (historically observed).
- **Mitigation:** user-owned camera controller, explicit camera intents only, no per-frame preset enforcement.

## R2 — Substrate drag stutter from heavy mesh recompute
- **Cause:** full mesh rebuild/normal recompute every move event.
- **Impact:** poor tactile editing, unusable sculpt flow.
- **Likelihood:** High (with node-grid upgrades if unmanaged).
- **Mitigation:** patch-oriented updates, throttled heavy ops, tier-based grid resolution.

## R3 — Post-processing overload on medium/low hardware
- **Cause:** AO/Bloom/Noise/Vignette stack too expensive for active editing.
- **Impact:** frame drops during composition.
- **Likelihood:** Medium-High.
- **Mitigation:** strict quality-tier effect budgets, auto fallback to reduced stack.

## R4 — UI reflow contention during scene interaction
- **Cause:** multiple panels/telemetry updating while dragging.
- **Impact:** visible input lag and jitter.
- **Likelihood:** Medium.
- **Mitigation:** stabilize layout, defer non-critical updates, progressive disclosure for secondary panels.

## R5 — Determinism mismatch between persisted state and regenerated scene
- **Cause:** inconsistent serialization or non-deterministic reconstruction.
- **Impact:** trust issues, inability to reliably share/reopen builds.
- **Likelihood:** Medium.
- **Mitigation:** canonical state schema + deterministic reconstruction checks.

## 4) Mitigation Strategy by Subsystem

## Camera
- Keep camera state isolated from step transitions.
- Process camera intents via dedicated controller.
- Validate no implicit camera mutations in unrelated reducers/effects.

## Substrate
- Use node-grid canonical data and local patch updates.
- Batch/commit expensive calculations (e.g., full normals) at controlled intervals if needed.
- Keep drag-path updates optimized for continuous response.

## Rendering
- Tie feature set to quality tier with strict guardrails.
- Prioritize stable frame pacing over cosmetic effects.
- Disable highest-cost effects first when under pressure.

## UI/State
- Minimize synchronous panel/telemetry churn during active manipulation.
- Keep secondary info surfaces collapsed by default during composition.

## 5) Measurement Plan (pre-implementation instrumentation intent)

Track at minimum:
- input-to-photon latency for camera gestures
- input-to-photon latency for substrate drags
- frame time histogram by step and quality tier
- counts/duration of long tasks during interactions
- fallback events (quality tier reductions/effect toggles)

(Implementation-level event schema is detailed later in T019.)

## 6) Go/No-Go Gates for implementation phases

A phase is not complete unless:
1. Camera latency and frame stability meet targets under representative scene loads.
2. Substrate drag remains responsive with realistic node density.
3. Medium/low tiers preserve interaction smoothness without severe visual regression.
4. No reproducible snap-back or severe jitter in core flows.

## 7) Risk Register Summary

| Risk | Severity | Likelihood | Priority |
|---|---|---|---|
| R1 Camera jitter/snap | Critical | High | P0 |
| R2 Substrate drag stutter | Critical | High | P0 |
| R3 Post-FX overload | High | Medium-High | P1 |
| R4 UI reflow contention | Medium-High | Medium | P1 |
| R5 Reconstruction nondeterminism | High | Medium | P1 |

## 8) Exit Criteria Check (T014 DoD)

- [x] Target budgets defined (latency/frame stability)
- [x] Risk matrix documented
- [x] Mitigation strategies mapped by subsystem
- [x] Phase gate criteria defined
