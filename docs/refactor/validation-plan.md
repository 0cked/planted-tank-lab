# Validation & Research Plan (T017)

Date: 2026-02-14
Scope: Define pre/post-refactor validation approach to verify dashboard-feel reduction and immersion/control improvements.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/acceptance-criteria-matrix.md` (T016)
- `docs/refactor/camera-ux-spec.md` (T010)
- `docs/refactor/substrate-ux-spec.md` (T011)
- `docs/refactor/inspiration-analysis.md` (T006)

## 1) Validation Objectives

1. Confirm Builder feels like a creative tool, not a SaaS dashboard.
2. Confirm camera agency expectations are met (no snap-back, stable persistence).
3. Confirm substrate editing is tactile, precise, and understandable.
4. Confirm performance remains acceptable during core creative flows.

## 2) Validation Strategy

Run two modes of validation:

## A. Criteria-driven verification (objective)
- Execute pass/fail checks tied to AC-01..AC-18 in T016.
- Capture evidence per criterion (screenshots, traces, metrics, notes).

## B. Task-based user research (experience)
- Observe users completing representative creative tasks.
- Capture confidence, friction points, and perceived product feel.

## 3) Participant Profile

Target participant mix (small but diverse):
- 2–3 planted tank hobbyists (domain users)
- 2–3 general creative-tool users (non-domain)
- 1–2 internal/product reviewers for benchmark consistency

Experience bands:
- Beginner
- Intermediate
- Advanced

## 4) Test Scenarios (high level)

1. **Onboarding + first composition move**
   - Start new build, choose tank, establish first scene edits.
2. **Camera control confidence pass**
   - Orbit, pan, zoom, change steps, return, restore pose.
3. **Substrate shaping pass**
   - Create slope, mound, valley using node-grid workflow.
4. **Hardscape/plant composition pass**
   - Place/edit assets while maintaining spatial control.
5. **Review readiness pass**
   - Inspect compatibility/BOM context without losing creative flow.

(Concrete scripted steps are authored in T018.)

## 5) Success Metrics

## Product-feel metrics
- % participants rating Builder as creative-tool-first (target: >= 80%)
- % participants explicitly citing “dashboard feel” as low/minimal (target: >= 80%)

## Camera metrics
- % runs with no reported snap-back incidents (target: 100%)
- % successful pose persistence checks across step changes and reloads (target: >= 95%)

## Substrate metrics
- % participants able to create requested terrain forms unaided (target: >= 85%)
- Mean confidence score in terrain control (target: >= 4/5)

## Performance perception metrics
- % sessions reporting smooth interaction during camera/substrate tasks (target: >= 85%)

## 6) Data Collection Plan

Collect:
- Pass/fail sheet for AC criteria
- Task completion time and failure points
- Observational notes (confusion moments, recovery behavior)
- Quick post-task ratings (confidence, perceived control, immersion)
- Instrumented metrics (linked in T019)

## 7) Decision Thresholds

## Green (ship-ready for phase)
- All P0 acceptance criteria pass
- >= 80% creative-tool perception
- Camera/substrate confidence targets met

## Yellow (iterate before proceeding)
- 1–2 P0/P1 misses but clear mitigation path
- usability gaps localized and fixable within next sprint

## Red (do not advance)
- repeated camera snap-back/reliability failures
- substrate workflow fails precision confidence targets
- dashboard-feel still dominant in qualitative feedback

## 8) Cadence

- **Pre-implementation baseline capture:** current state benchmark (already partially done in T001–T006)
- **Mid-implementation checkpoints:** after camera/substrate milestones
- **Pre-release validation:** full scripted pass + user sessions against AC matrix

## 9) Roles / Responsibilities (planning placeholders)

- Facilitator: runs sessions and scripts
- Observer: records qualitative notes and issue tags
- Metrics recorder: logs AC pass/fail + performance traces
- Decision owner: approves advance/iterate/stop based on thresholds

## 10) Risks & Mitigations

- Small sample bias -> include mixed experience participants
- Confirmation bias -> use standardized scripts/ratings
- Instrumentation gaps -> align with T019 before formal runs

## Exit Criteria Check (T017 DoD)

- [x] Validation approach defined (objective + user research)
- [x] Participant profile and scenarios defined
- [x] Success metrics and decision thresholds defined
- [x] Ready input for T018 and T019
