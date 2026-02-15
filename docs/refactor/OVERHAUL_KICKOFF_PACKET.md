# UI/UX Overhaul Kickoff Packet (Approval-to-Implement Gate) (T030)

Date: 2026-02-15
Project: Planted Tank Lab Builder
Status: Final pre-implementation kickoff packet (planning complete).

---

## 1) Decision Request

Please approve kickoff of full UI/UX overhaul implementation for Builder, following the sequenced sprint/gate model documented in prior planning artifacts.

- [ ] **Approve overhaul implementation kickoff**
- [ ] **Request revisions before kickoff**

---

## 2) Scope (What is included)

Included:
1. Stage-first UI composition overhaul (viewport-dominant experience)
2. Visual system overhaul aligned to Wednesday standards and immersive product taste
3. Camera architecture implementation (user-owned control, explicit intents, persistence)
4. Substrate node-grid interaction implementation (local precision + deterministic undo/redo)
5. Performance guardrail integration and gate-based validation

Excluded (for this kickoff):
- New feature expansion unrelated to refactor goals
- Non-critical long-tail enhancements outside AC-defined outcomes

---

## 3) Program Sequence Snapshot

Execution follows documented stream and gate order:
- Sprint 0: kickoff + telemetry readiness
- Sprint 1: stage-first shell + camera foundations
- Sprint 2: camera reliability + substrate core bootstrap
- Sprint 3: substrate completion + visual pass 1
- Sprint 4: atmosphere integration + cross-system hardening
- Sprint 5: integrated validation + release recommendation

Hard gates A-E must pass before progression.

---

## 4) Success Criteria

Kickoff success is defined by eventual delivery against AC-01..AC-18 with evidence-backed validation:
- No camera snap-back and reliable camera persistence
- Substrate local-control precision and deterministic undo/redo
- Scene-first immersive UX replacing dashboard feel
- Performance budgets met for camera/substrate interaction and frame stability
- End-to-end creative flow completion at target confidence levels

---

## 5) Risks & Controls

Primary risks:
1. Cross-stream integration conflicts (UI/visual/camera/substrate)
2. Performance regressions during visual enrichment and terrain editing
3. Scope creep beyond gated sprint objectives

Controls in place:
- ADR-driven architecture boundaries (camera/substrate)
- Wednesday design/dev enforcement checklist
- Performance guardrail gates + profiling cadence
- Scripted validation scenarios S01-S09 + instrumentation evidence

---

## 6) Required Operating Rules During Implementation

1. Follow Wednesday component/library constraints (no ad-hoc custom UI bypasses without approved exception).
2. Keep viewport-first product taste constraints active at all review points.
3. Block progression on unresolved P0 gate failures.
4. Maintain AC + telemetry traceability per story and per sprint gate.

---

## 7) Evidence Index (Planning Artifacts)

Core packet references:
- `docs/refactor/PLAN_REVIEW_PACKET.md`
- `docs/refactor/overhaul-sprint-plan.md`
- `docs/refactor/perf-guardrail-integration-plan.md`
- `docs/refactor/camera-implementation-plan.md`
- `docs/refactor/substrate-implementation-plan.md`
- `docs/refactor/visual-spec-package.md`
- `docs/refactor/ui-composition-blueprint.md`
- `docs/refactor/wednesday-enforcement-checklist.md`
- `docs/refactor/acceptance-criteria-matrix.md`

---

## 8) Approval Metadata (to fill)

- Approver:
- Date:
- Conditions/notes:
- Approved sprint start target:

---

## 9) Final Go/No-Go Checkbox

- [ ] **GO — Begin overhaul implementation under defined sprint/gate protocol**
- [ ] **NO-GO — Rework requested before implementation starts**

---

## Exit Criteria Check (T030 DoD)

- [x] Scope/sequence/risks summarized
- [x] Success criteria and controls specified
- [x] Explicit kickoff approval checkbox included
- [x] Final approval-to-implement gate packet delivered
