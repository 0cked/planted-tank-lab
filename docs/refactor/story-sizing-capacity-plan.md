# Story Sizing & Sprint Capacity Calibration (T034)

Date: 2026-02-15  
Project: Planted Tank Lab Builder  
Status: Planning-only calibration artifact (no implementation changes).

## Inputs

- `docs/refactor/implementation-backlog-skeleton.md` (T021)
- `docs/refactor/overhaul-sprint-plan.md` (T029)
- `docs/refactor/workstream-ownership-raci.md` (T033)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/perf-guardrail-integration-plan.md` (T028)
- `docs/refactor/test-scenarios.md` (T018)

---

## 1) Objective

Add first-pass story sizing and sprint-capacity assumptions so overload risk is visible before implementation starts, with explicit buffers for gate reviews, integration risk, and performance remediation.

---

## 2) Sizing Method

- Scale: **Story Points (SP)** = relative complexity + cross-stream coordination + validation burden.
- Size bands:
  - **S (3 SP)** straightforward, low integration risk
  - **M (5 SP)** moderate integration or validation burden
  - **L (8 SP)** high complexity and/or high cross-stream coupling
  - **XL (13 SP)** critical-path, high uncertainty, heavy evidence burden
- Capacity planning assumption:
  - **Nominal team capacity:** 40 SP / sprint
  - **Reserved gate + bug buffer:** 20% (8 SP)
  - **Effective planned capacity:** **32 SP / sprint**

---

## 3) Story Sizing Table (Backlog Stories S1.1-S5.3)

| Story | Workstream(s) | Size (SP) | Why this size | Critical path? |
|---|---|---:|---|---|
| S1.1 Viewport-first shell composition | WS-A | 8 | Structural layout changes + AC-01/02 verification | Yes |
| S1.2 Contextual panel/HUD rules | WS-A | 5 | Interaction state logic + overlay behavior checks | Yes |
| S1.3 Step-surface hierarchy consistency | WS-A + WS-E | 5 | Step logic + flow evidence alignment | Yes |
| S2.1 Camera controller ownership refactor | WS-C | 13 | Core architecture boundary + high regression risk | Yes |
| S2.2 Explicit framing command contract | WS-C | 5 | Contract enforcement + command telemetry | Yes |
| S2.3 Camera persistence lifecycle | WS-C | 8 | Save/reload lifecycle + transition correctness | Yes |
| S2.4 Camera responsiveness hardening | WS-C + WS-E | 8 | Perf tuning + AC-13/15 validation burden | Yes |
| S3.1 Node-grid data model integration | WS-D | 13 | Foundational model + interpolation seam risk | Yes |
| S3.2 Local terrain manipulation UX | WS-D | 8 | Interaction fidelity + edit transaction behavior | Yes |
| S3.3 Deterministic substrate undo/redo | WS-D | 8 | Determinism + state rollback guarantees | Yes |
| S3.4 Substrate performance envelope | WS-D + WS-E | 8 | Stress scenarios + perf evidence bundle | Yes |
| S4.1 Token/component alignment package | WS-B | 8 | Broad surface mapping + design conformance checks | No |
| S4.2 Lighting/depth hierarchy pass | WS-B + WS-E | 13 | Atmosphere quality + perf sensitivity under load | Yes |
| S4.3 Overlay readability tuning | WS-B + WS-A | 5 | Readability/priority refinements | No |
| S5.1 Full scenario suite execution harness | O-QA + WS-E | 8 | S01-S09 run consistency + evidence packaging | Yes |
| S5.2 Regression triage & closure backlog | All | 13 | Unbounded triage volatility + cross-stream fixes | Yes |
| S5.3 Go/No-Go decision package assembly | O-PL + O-PO + O-QA | 5 | Evidence synthesis + approval package | Yes |

**Total modeled scope:** 143 SP

---

## 4) Sprint Capacity Calibration (Initial)

| Sprint | Planned story bundle | Planned SP | Effective capacity (32 SP) | Buffer status | Notes |
|---|---|---:|---:|---|---|
| Sprint 0 | Readiness + owner activation + gate templates (non-story setup) | 16 | 32 | Healthy | Keep extra room for setup friction |
| Sprint 1 | S1.1 + S1.2 + partial S2.1 | 19 + 6 = 25 | 32 | Healthy | Reserve 7 SP for gate-A fixes |
| Sprint 2 | complete S2.1 + S2.2 + S2.3 | 7 + 5 + 8 = 20 | 32 | Healthy | Reserve 12 SP for camera regressions |
| Sprint 3 | S2.4 + S3.1 (+ optional S4.1 start) | 8 + 13 (+5) = 21-26 | 32 | Moderate | Protect substrate foundation quality |
| Sprint 4 | S3.2 + S3.3 + S4.1 remainder | 8 + 8 + 3 = 19 | 32 | Healthy | Keep room for deterministic fixes |
| Sprint 5 | S3.4 + S4.2 + S4.3 | 8 + 13 + 5 = 26 | 32 | Moderate | High perf risk; keep strict hold rules |
| Sprint 6 | S5.1 + S5.2 + S5.3 | 8 + 13 + 5 = 26 | 32 | Moderate | Regression volatility expected |

Calibration note:
- Original T029 sequence listed Sprints 0-5; calibration expands to **Sprint 6** to avoid overloading final validation and preserve evidence quality.

---

## 5) Critical Path Flags

Critical path stories (must not slip without re-baselining gate dates):
- S1.1, S1.2, S1.3
- S2.1, S2.2, S2.3, S2.4
- S3.1, S3.2, S3.3, S3.4
- S4.2
- S5.1, S5.2, S5.3

Non-critical / flex stories:
- S4.1 (partially parallelizable after Gate A)
- S4.3 (can shift within visual window as long as AC-04/05 remain green)

---

## 6) Overload Triggers & Re-Calibration Rules

Trigger conditions:
- Any sprint planned load exceeds **32 SP**.
- Any sprint carries >2 unresolved P1 blockers into next gate.
- Any critical-path story rolls >1 sprint.

Re-calibration actions:
1. Freeze intake of non-critical stories.
2. Move S4.3 or other flex items to next sprint first.
3. Split XL/L stories into smaller validation-safe slices.
4. If overload persists, add one buffer sprint before Gate E package assembly.

Hard-stop rule:
- Do not close a gate with known critical-path AC failures solely to protect timeline.

---

## 7) Risks & Mitigations

| Risk | Impact | Mitigation | Rollback seam |
|---|---|---|---|
| Underestimated camera/substrate complexity | Multi-sprint slip | Keep 20% buffer + partial carry rules in S1-S4 | Re-baseline sprint plan before next gate |
| Regression closure volatility in final phase | Unpredictable Sprint 6 load | Cap new scope and triage by P-severity only | Hold release recommendation until S5.2 stable |
| Hidden coordination overhead across WS-A/WS-B/WS-E | Decision delays | Enforce RACI gate attendance and pre-gate packet check | Shift gate by one cycle, no forced pass |

---

## 8) Completion Checks (T034 DoD)

- [x] Story sizing table added for backlog stories.
- [x] Sprint capacity assumptions documented with explicit buffer.
- [x] Critical-path flags identified.
- [x] Overload triggers and re-calibration policy defined.

---

## 9) Exit Criteria Check (Mirror T034)

- [x] Story sizing table and capacity model exist with risk buffers and critical-path flags.
