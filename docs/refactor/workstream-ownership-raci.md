# Workstream Ownership & Gate RACI Plan (T033)

Date: 2026-02-15  
Project: Planted Tank Lab Builder  
Status: Planning-only governance artifact (no implementation changes authorized by this document).

## Inputs

- `projects/planted-tank-lab/TODO.md` (M7 tasks T031-T036)
- `docs/refactor/post-kickoff-readiness-gap-analysis.md` (T031)
- `docs/refactor/approval-decision-record.md` (T032)
- `docs/refactor/overhaul-sprint-plan.md` (T029)
- `docs/refactor/implementation-backlog-skeleton.md` (T021)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/test-scenarios.md` (T018)
- `docs/refactor/perf-guardrail-integration-plan.md` (T028)

---

## 1) Objective

Define explicit ownership and gate decision authority for WS-A through WS-E so cross-stream blockers can be triaged quickly and GO/HOLD decisions have unambiguous accountability.

---

## 2) Named Ownership Roster (Primary + Backup)

| Owner ID | Scope | Primary owner | Backup owner | Core accountability |
|---|---|---|---|---|
| O-PL | Program/Gates | Program Delivery Lead | Product Operations Lead | Sprint orchestration, gate packet quality, final gate agenda |
| O-WSA | WS-A UI Composition | UI Composition Lead | Frontend Systems Lead | Stage-first shell, contextual panel behavior, layout AC closure |
| O-WSB | WS-B Visual System | Visual Design Lead | Design Systems Lead | Token/component/motion fidelity, immersion/brand quality bars |
| O-WSC | WS-C Camera | Camera Systems Lead | Interaction Engineering Lead | Camera state ownership, persistence, reliability scenarios |
| O-WSD | WS-D Substrate | Substrate Systems Lead | Geometry/Rendering Lead | Node-grid behavior, mesh update reliability, undo/redo determinism |
| O-WSE | WS-E Performance/Observability | Performance & Telemetry Lead | QA/Instrumentation Lead | Perf budget enforcement, profiling cadence, gate evidence metrics |
| O-QA | Integrated validation | QA Validation Lead | Scenario Test Lead | S01-S09 execution coverage, defect severity triage readiness |
| O-PO | Product authority | Product Owner | Delegate Product Reviewer | GO/NO-GO authority and accepted-risk signoff |

Assignment rule:
- Each workstream decision requires both a primary and backup owner active before sprint execution begins.

---

## 3) Workstream-to-Gate Decision Authority

| Gate | Decision owner (A) | Required responsible owners (R) | Required consulted (C) | Informed (I) |
|---|---|---|---|---|
| Gate A (Stage shell baseline) | O-PL + O-PO | O-WSA, O-WSC, O-WSE | O-WSB, O-QA | All owners |
| Gate B (Camera reliability accepted) | O-PL + O-PO | O-WSC, O-WSE, O-QA | O-WSA, O-WSD | All owners |
| Gate C (Substrate deterministic/performant) | O-PL + O-PO | O-WSD, O-WSE, O-QA | O-WSC, O-WSB | All owners |
| Gate D (Visual integration within budget) | O-PL + O-PO | O-WSB, O-WSE, O-QA | O-WSA, O-WSC, O-WSD | All owners |
| Gate E (Integrated validation + release recommendation) | O-PL + O-PO | O-QA, O-WSE, O-WSA, O-WSB, O-WSC, O-WSD | Stakeholder reviewers | All owners |

Gate authority rule:
- No gate may pass unless the Gate Decision Owner set (O-PL + O-PO) confirms and all required R owners provide evidence-backed recommendations.

---

## 4) RACI Matrix by Workstream

Legend: R = Responsible, A = Accountable, C = Consulted, I = Informed

| Activity | O-PL | O-PO | O-WSA | O-WSB | O-WSC | O-WSD | O-WSE | O-QA |
|---|---|---|---|---|---|---|---|---|
| Sprint objective confirmation | A | C | R | R | R | R | R | C |
| AC scope interpretation | C | A | R | R | R | R | R | C |
| Scenario execution plan updates | C | I | C | C | C | C | C | A/R |
| Performance budget checks | C | I | C | C | C | C | A/R | C |
| Gate evidence packet assembly | A/R | C | R | R | R | R | R | R |
| GO/HOLD recommendation | A | A | R | R | R | R | R | R |
| Rollback decision invocation | A | A | R | C | R | R | R | C |
| Escalation communication | A/R | A | I | I | I | I | I | I |

---

## 5) Escalation & Coverage Protocol

### Trigger conditions
- Required owner unavailable > 1 business day during a gate week.
- Conflicting recommendations between two or more required R owners.
- P0/P1 blocker with no agreed remediation path inside the sprint window.

### Protocol
1. Backup owner auto-assumes responsibility within 4 hours of trigger.
2. O-PL logs escalation in gate packet and requests decision sync.
3. O-PO issues binding hold/advance determination.
4. If unresolved: gate status remains HOLD; no downstream gate work is promoted.

---

## 6) Interfaces & Dependencies

- Upstream: T032 approval record governs whether any gate decision can become effective.
- Cross-stream: WS-E and O-QA are mandatory at every gate for objective evidence.
- Downstream: T034 (sizing/capacity), T035 (traceability), and T036 (gate ops runbook) consume this ownership model directly.

Hard-stop dependency:
- If any gate has missing owner assignment (primary or backup), that gate cannot enter review.

---

## 7) Risks & Mitigations

| Risk | Impact | Mitigation | Rollback seam |
|---|---|---|---|
| Ownership ambiguity at gate time | Delayed or contested decisions | Pre-assign primary+backup for every owner ID | Freeze gate and re-run with explicit assignment |
| Overloaded single owner across multiple streams | Slow triage + quality drift | Backup activation protocol + shared evidence template | Hold advancement one sprint, redistribute scope |
| Perf/QA treated as optional | Regressions pass undetected | WS-E + O-QA mandatory in all gate R sets | Invalidate gate pass and return to prior gate |

---

## 8) Completion Checks (T033 DoD)

- [x] Workstream ownership defined for WS-A through WS-E.
- [x] Gate-level decision authority explicitly defined for Gates A-E.
- [x] RACI includes responsible/approver/support/informed roles.
- [x] Backup coverage included for each owner domain.

---

## 9) Exit Criteria Check (Mirror T033)

- [x] RACI matrix maps each workstream and gate to responsible/approver/support roles with backup coverage.
