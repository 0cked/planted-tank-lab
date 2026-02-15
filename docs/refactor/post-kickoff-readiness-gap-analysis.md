# Post-Kickoff Readiness Gap Analysis (Planning-Only) (T031)

Date: 2026-02-15  
Project: Planted Tank Lab Builder  
Status: Planning artifact; no implementation authorized by this document.

## Inputs

- `projects/planted-tank-lab/TODO.md` (T001-T030 baseline)
- `docs/refactor/OVERHAUL_KICKOFF_PACKET.md` (T030)
- `docs/refactor/overhaul-sprint-plan.md` (T029)
- `docs/refactor/PLAN_REVIEW_PACKET.md` (T022)
- `docs/refactor/implementation-backlog-skeleton.md` (T021)
- `TASKS.md` (global pointer state)
- Recent project commits (`53f58b6` back through `fc5560a`)

## Objective

Identify remaining planning gaps between "kickoff packet complete" and "safe implementation start," then sequence small, explicit planning tasks that close those gaps without writing code.

## Current State Snapshot

- T001-T030 planning chain is complete and documented.
- Kickoff packet includes explicit GO/NO-GO checkbox, but approval metadata is still blank.
- Implementation backlog skeleton exists, but readiness checklist fields are still unresolved (owners, sizing, AC-test attachment, telemetry ticket linkage, dependency validation).
- Program-level sequencing is defined, but operational gate-review mechanics are still implicit across documents.

## Gap Register

| Gap ID | Type | Evidence | Impact if unresolved | Planned closure |
|---|---|---|---|---|
| G1 | Approval governance | T030 approval metadata + GO checkbox unfilled | Implementation could start without explicit authority/conditions | T032 approval decision record template |
| G2 | Ownership clarity | T029 ownership section marked as template only | Diffused accountability at gates A-E | T033 workstream ownership + RACI |
| G3 | Delivery calibration | T021 backlog has no sizing/capacity calibration | Sprint plan risk: unrealistic load or hidden critical path drift | T034 story sizing + capacity calibration |
| G4 | Traceability completeness | T021 checklist item AC/test/telemetry linkage still open at story level | Harder GO/NO-GO decisions; evidence gaps in reviews | T035 AC/test/telemetry traceability ledger |
| G5 | Gate operations rigor | Gate pass/fail cadence appears across docs, but no single operating runbook | Inconsistent gate decisions and slow rollback response | T036 gate review operations runbook |

## Sequencing Corrections

1. Keep implementation blocked until G1 closes (explicit approval capture path in place).
2. Resolve ownership (G2) before sizing and final planning calibration to avoid assignment churn.
3. Complete sizing and traceability (G3/G4) before creating final gate-ops runbook.
4. Treat T036 as the final planning bridge artifact before implementation kickoff execution.

## Risks & Mitigations (New/Updated)

| Risk | Trigger | Mitigation | Rollback seam |
|---|---|---|---|
| R6: Premature implementation drift | Code work begins before approval metadata/conditions are captured | Enforce T032 completion + explicit GO record as precondition | Pause active implementation branch intake until GO is logged |
| R7: Gate ambiguity under schedule pressure | Sprint demo ends without uniform pass/fail packet | Standardize T036 evidence checklist and escalation rule | Hold advancement one sprint and execute targeted remediation plan |
| R8: Accountability gaps in cross-stream blockers | Camera/UI/substrate perf issues span multiple owners | Define RACI authority at gate level in T033 | Temporary incident owner assignment with 24h decision SLA |

## Higher-Impact Opportunities

1. Convert backlog readiness checklist into quantitative readiness score (0-100) for each sprint gate.
2. Add a single evidence index per sprint linking AC status, scenario evidence, and telemetry snapshots.
3. Predefine NO-GO communication template to reduce decision latency in high-risk gates.

## Exit Criteria Check (T031)

- [x] Current-state planning gaps identified from TODO + refactor artifacts + commits
- [x] Sequencing issues and risk deltas documented
- [x] New planning tasks proposed to close high-impact gaps
- [x] Planning-only scope maintained (no code/UI implementation changes)
