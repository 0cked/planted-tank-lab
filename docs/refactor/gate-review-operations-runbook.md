# Gate Review Operations Runbook (T036)

Date: 2026-02-15  
Project: Planted Tank Lab Builder  
Status: Planning-only operational runbook (defines gate behavior; does not itself authorize implementation).

## Inputs

- `docs/refactor/approval-decision-record.md` (T032)
- `docs/refactor/workstream-ownership-raci.md` (T033)
- `docs/refactor/story-sizing-capacity-plan.md` (T034)
- `docs/refactor/traceability-ledger.md` (T035)
- `docs/refactor/overhaul-sprint-plan.md` (T029)
- `docs/refactor/perf-guardrail-integration-plan.md` (T028)

---

## 1) Objective

Standardize how gate reviews are run so every gate decision (advance/hold/rollback) is evidence-based, time-bounded, and operationally consistent under delivery pressure.

---

## 2) Gate Cadence & Schedule

- Gate reviews occur at end of each planned sprint cycle (A through E).
- Standard cadence:
  1. **T-24h:** Evidence packet freeze + pre-read distribution
  2. **T-0h:** Live gate review (60 minutes target)
  3. **T+4h:** Decision record finalized in approval template (T032)
  4. **T+24h:** Action follow-up posted (next sprint plan or remediation plan)

Time-box target by segment:
- 10 min: scope/objective recap
- 20 min: evidence walkthrough
- 15 min: risk + blocker review
- 10 min: decision vote + conditions
- 5 min: action assignment

---

## 3) Required Attendees by Gate

Mandatory attendees (all gates):
- O-PL (Program/Gate lead)
- O-PO (Product authority)
- O-WSE (Perf/Obs lead)
- O-QA (Validation lead)

Additional required attendees by gate:
- **Gate A:** O-WSA, O-WSC
- **Gate B:** O-WSC, O-WSD
- **Gate C:** O-WSD, O-WSC
- **Gate D:** O-WSB, O-WSA
- **Gate E:** O-WSA, O-WSB, O-WSC, O-WSD

Coverage rule:
- If a required attendee is unavailable, designated backup must attend. No backup = gate auto-HOLD.

---

## 4) Evidence Package Format (Required)

Each gate packet must include these sections in order:

1. Gate header
   - Gate ID, sprint window, decision scope
2. Story completion table
   - Story ID, status, linked AC IDs, owner sign-off
3. AC status summary
   - Green/Amber/Red by AC ID
4. Scenario evidence bundle
   - Scenario IDs run, outcomes, failure logs, repro confidence
5. Telemetry/perf summary
   - p50/p95 latency, frame stability, fallback incidents
6. Risk + blocker ledger
   - P0/P1 items, mitigation owner, due date
7. Recommendation section
   - Advance / Hold / Rollback recommendation per required owner
8. Approval record handoff block
   - pre-filled fields for T032 decision update

Evidence validity rule:
- Any stale/missing evidence older than the sprint window is treated as missing.

---

## 5) Decision Rubric (Advance / Hold / Rollback)

### ADVANCE
All are true:
- Critical ACs mapped to gate are green.
- Required scenarios executed with no unresolved P0 and no unowned P1.
- Perf thresholds meet gate budgets or approved condition-based exception exists.
- Required owners provide evidence-backed advance recommendation.

### HOLD
Any are true:
- One or more critical ACs are amber/red without approved condition path.
- Missing required scenario or telemetry evidence for a gate-critical story.
- Required attendee/backup missing.
- P0 unresolved or P1 risk ownership unclear.

### ROLLBACK (scope/state)
Trigger when:
- Gate regression invalidates previously accepted critical behavior.
- Perf or reliability degrades beyond pre-defined rollback thresholds.
- Fix-in-place path would exceed one sprint and risk downstream gates.

Rollback output required:
- rollback target, impacted stories, containment plan, re-entry criteria.

---

## 6) Severity & Escalation Protocol

Severity classes:
- **P0:** launch/safety-critical blocker; immediate HOLD
- **P1:** major functional/perf risk; may proceed only with explicit condition + owner + due date
- **P2:** non-critical quality issue; track without blocking gate by default

Escalation flow:
1. O-PL logs incident in gate packet.
2. O-PO and responsible owner align on decision path within meeting.
3. If no consensus in meeting, default to HOLD and schedule escalation within 24h.
4. Final binding decision recorded in T032 template.

---

## 7) Communication Templates

### A) Advance announcement
"Gate <ID> status: ADVANCE. Scope approved: <scope>. Conditions: <none/list>. Next gate target: <date>. Owners: <owner list>."

### B) Hold announcement
"Gate <ID> status: HOLD. Blocking items: <IDs>. Required remediation: <actions>. Re-review date: <date>."

### C) Rollback announcement
"Gate <ID> status: ROLLBACK. Rollback target: <scope/state>. Containment owner: <name>. Re-entry criteria: <criteria>."

---

## 8) Pre-Gate & Post-Gate Checklists

### Pre-Gate (T-24h)
- [ ] Story table aligned to latest traceability ledger (T035)
- [ ] AC status summary complete
- [ ] Scenario logs attached
- [ ] Perf/telemetry snapshots attached
- [ ] Required attendees confirmed (or backups assigned)
- [ ] Draft recommendation captured from each required owner

### Post-Gate (T+24h)
- [ ] T032 approval decision record updated and finalized
- [ ] Action items assigned with dates/owners
- [ ] Sprint board updated for advance/hold/rollback path
- [ ] Stakeholder communication sent
- [ ] Risk ledger refreshed

---

## 9) Dependencies & Interfaces

- Depends on T032 for formal decision recording.
- Depends on T033 for attendee/authority definitions.
- Depends on T035 for story/AC/test/telemetry link integrity.
- Feeds implementation kickoff operations once readiness bridge closes.

Hard-stop dependency rule:
- If T032/T033/T035 artifacts are unavailable or outdated, gate review cannot proceed.

---

## 10) Risks & Mitigations

| Risk | Impact | Mitigation | Rollback seam |
|---|---|---|---|
| Inconsistent evidence quality across gates | Noisy/contested decisions | Enforce fixed packet format and T-24h freeze | Auto-HOLD and packet rework |
| Attendance gaps at decision time | Delayed governance | Backup requirement + attendance hard-stop | Reschedule within 24h; no auto-advance |
| Pressure-driven bypass of hold criteria | Hidden regressions | Explicit rubric + default HOLD on ambiguity | Roll back to prior accepted scope |

---

## 11) Completion Checks (T036 DoD)

- [x] Cadence and attendees defined.
- [x] Decision rubric for advance/hold/rollback defined.
- [x] Rollback triggers and escalation path defined.
- [x] Communication templates included.

---

## 12) Exit Criteria Check (Mirror T036)

- [x] Runbook includes cadence, attendees, decision rubric, rollback triggers, and communication templates.
