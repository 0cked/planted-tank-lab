# Acceptance Criteria Matrix by Subsystem (T016)

Date: 2026-02-14
Scope: Define objective pass/fail criteria for theme, immersion, camera, substrate, and inspiration fidelity.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/layout-ia-spec.md`
- `docs/refactor/visual-direction-spec.md`
- `docs/refactor/camera-ux-spec.md`
- `docs/refactor/substrate-ux-spec.md`
- `docs/refactor/performance-risk-model.md`
- `docs/refactor/inspiration-analysis.md`

## Matrix

| ID | Subsystem | Criterion (Pass/Fail) | Measurement Method | Target / Threshold |
|---|---|---|---|---|
| AC-01 | Layout/IA | Viewport remains dominant visual surface in default builder states | Structured UI review against IA map | Stage occupies primary hierarchy; no competing persistent equal-weight panels |
| AC-02 | Layout/IA | Default composition mode shows only minimal always-visible surfaces | UI state checklist across steps 1–5 | Top rail + step indicator + mode rail + active contextual tray only |
| AC-03 | Layout/IA | BOM/Compatibility/Diagnostics are contextual, not always expanded | Step walkthrough audit | Secondary drawers collapsed by default outside review context |
| AC-04 | Visual Direction | Scene-first contrast budget upheld | Visual review with contrast-map checklist | Strongest contrast on tank content + active control only |
| AC-05 | Visual Direction | Brand coherence maintained with immersive mode | Side-by-side shell/builder heuristic review | Builder reads as same product family, not separate dashboard app |
| AC-06 | Visual Direction | Central composition zone remains unobstructed | Screenshot overlays per step | No persistent UI block occupying focal composition zone |
| AC-07 | Camera | Orbit/zoom/pan operate without snap-back | Scripted camera interaction test | 30s continuous navigation with no forced drift/reset |
| AC-08 | Camera | Step transitions do not mutate camera pose implicitly | Deterministic step transition test | Pose delta ~= 0 unless explicit frame/focus/reset command |
| AC-09 | Camera | Draft reload restores prior camera pose | Save/reload integration test | Restored pose matches saved pose within tolerance |
| AC-10 | Substrate | Users can create slope/mound/valley with local control | Task-based UX script | 3 terrain forms created predictably without global unintended deformation |
| AC-11 | Substrate | Node hover/selection/drag feedback is always unambiguous | Interaction state checklist | Distinct visual states for idle/hover/selected/constraint-hit |
| AC-12 | Substrate | Undo/redo restores terrain edit transactions deterministically | Transaction replay test | Revert/redo reproduces exact node height state and visible mesh |
| AC-13 | Performance | Camera interaction latency meets budget | Instrumented interaction timing | <= 50ms p95 input-to-visible response |
| AC-14 | Performance | Substrate drag latency meets budget | Instrumented interaction timing | <= 60ms p95 input-to-visible response |
| AC-15 | Performance | Frame stability maintained per quality tier | Frame-time histogram by tier | Meets T014 thresholds (High>=50 typ, Med>=40 typ, Low>=30 typ) |
| AC-16 | Inspiration Fidelity | Lighting resembles fixture-led reference grammar | Art-direction review rubric | Explicit fixture/key/fill structure present with controlled bloom/falloff |
| AC-17 | Inspiration Fidelity | Depth layering readability achieved | Composition/depth rubric + screenshot review | Clear foreground/midground/background separation in primary views |
| AC-18 | Product Feel | Builder no longer reads as SaaS dashboard | Qualitative rubric + user test prompt | Majority rating indicates creative-tool feel over dashboard feel |

## Validation Method Notes

- Use scripted step walkthroughs for deterministic pass/fail logging.
- Tie instrumentation IDs from T019 to AC-13/14/15.
- Tie research scripts from T017/T018 to AC-18 and selected IA/visual criteria.

## Traceability Map

- Layout criteria: AC-01..03 <- T008
- Visual criteria: AC-04..06 <- T009 + T006
- Camera criteria: AC-07..09 <- T010 + T012
- Substrate criteria: AC-10..12 <- T011 + T013
- Performance criteria: AC-13..15 <- T014
- Inspiration/Product feel criteria: AC-16..18 <- T006/T007/T009

## Exit Criteria Check (T016 DoD)

- [x] Measurable criteria defined per subsystem
- [x] Validation method identified per criterion
- [x] Criteria map back to prior specs/decisions
- [x] Ready input for T017/T019/T020
