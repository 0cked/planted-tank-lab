# Approval Decision Record Template (T032)

Date: YYYY-MM-DD  
Project: Planted Tank Lab Builder  
Decision ID: ADR-APPROVAL-YYYYMMDD-##  
Status: Draft / In Review / Final  
Scope Guardrail: Planning artifact only; this template does not authorize implementation by itself.

## Inputs

- `projects/planted-tank-lab/TODO.md` (M7 bridge tasks)
- `docs/refactor/post-kickoff-readiness-gap-analysis.md` (T031)
- `docs/refactor/OVERHAUL_KICKOFF_PACKET.md` (T030)
- `docs/refactor/overhaul-sprint-plan.md` (T029)
- `docs/refactor/implementation-backlog-skeleton.md` (T021)
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/test-scenarios.md` (T018)
- `docs/refactor/instrumentation-plan.md` (T019)

---

## 1) Objective

Capture an explicit GO/NO-GO decision with approver authority, decision context, conditional constraints, accepted risks, and escalation notes so implementation cannot start without recorded authorization.

---

## 2) Decision Record

| Field | Value |
|---|---|
| Decision state | GO / GO_WITH_CONDITIONS / HOLD / NO_GO |
| Effective date/time (timezone) | |
| Expiration/revalidation date | |
| Applies to scope | e.g., full overhaul / selected workstreams / specific sprint |
| Implementation start authorized? | Yes / No |
| If Yes, earliest allowed start date | |
| If No/Hold, required unblock event | |
| Linked gate | Gate A / B / C / D / E / Multi-gate |
| Related decision IDs | |
| Record owner | |

---

## 3) Approver Metadata & Authority

| Role | Name | Authority level | Decision vote (GO/HOLD/NO_GO) | Signature/confirmation | Timestamp |
|---|---|---|---|---|---|
| Product owner | | Final | | | |
| Delivery/program lead | | Co-approver | | | |
| Technical lead | | Co-approver | | | |
| Design lead | | Advisory/approver (as applicable) | | | |
| Performance/QA lead | | Advisory/approver (as applicable) | | | |

Authority rule:
- Final implementation authorization requires Product Owner confirmation plus all required co-approver confirmations for the selected gate.

---

## 4) Conditions & Constraints (for GO_WITH_CONDITIONS)

| Condition ID | Required condition | Owner | Due date | Evidence required | Status |
|---|---|---|---|---|---|
| C01 | | | | | Open |
| C02 | | | | | Open |
| C03 | | | | | Open |

Hard stop rule:
- If any condition marked "Required before start" remains open, implementation remains blocked.

---

## 5) Accepted Risks & Non-Accepted Risks

### Accepted risks

| Risk ID | Risk statement | Severity | Why accepted now | Mitigation owner | Monitoring signal |
|---|---|---|---|---|---|
| R- | | | | | |

### Non-accepted risks (must close before GO)

| Risk ID | Blocker reason | Required mitigation | Owner | Due date | Status |
|---|---|---|---|---|---|
| R- | | | | | Open |

---

## 6) Readiness Evidence Checklist

Mark each item Pass / Partial / Fail and link evidence.

| Evidence item | Status | Source link | Notes |
|---|---|---|---|
| Kickoff packet complete (T030) | | | |
| Post-kickoff gap analysis complete (T031) | | | |
| Ownership + RACI defined (T033) | | | |
| Story sizing + capacity model complete (T034) | | | |
| AC/Test/Telemetry traceability complete (T035) | | | |
| Gate operations runbook complete (T036) | | | |
| Critical dependencies validated | | | |
| Rollback and hold protocol validated | | | |

Gate-block rule:
- Any **Fail** on a critical evidence item automatically sets decision to HOLD until remediated and re-reviewed.

---

## 7) Escalation & Exception Notes

| Exception ID | Exception description | Requested by | Approved by | Expiry | Containment steps |
|---|---|---|---|---|---|
| EX- | | | | | |

Escalation path:
1. Record owner flags conflict or blocker.
2. Product owner + delivery lead resolve within agreed SLA.
3. If unresolved, decision remains HOLD and no implementation kickoff proceeds.

---

## 8) Decision Communication Log

| Audience | Channel | Message summary | Sent by | Timestamp |
|---|---|---|---|---|
| Core implementation team | | | | |
| Stakeholders/reviewers | | | | |
| QA/performance observers | | | | |

---

## 9) Completion Checks (T032 DoD)

- [x] Structured fields include decision state, approver metadata, conditions, accepted risks, and escalation notes.
- [x] Hard stop language prevents unauthorized implementation start.
- [x] Evidence checklist supports clear GO/HOLD determination.
- [x] Artifact remains planning-only and can be reused at each gate.

---

## 10) Exit Criteria Check (Mirror T032)

- [x] Planning artifact exists with structured fields for decision state, conditions, risks accepted, and escalation notes.
