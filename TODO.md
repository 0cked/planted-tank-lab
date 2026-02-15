# Planted Tank Lab Builder Refactor TODO (Planning Only)

Purpose: Convert product feedback into an actionable, architecture-first refactor plan for the Builder.


---

## Milestones

### M1 — Audit / Diagnosis
- T001–T006

### M2 — Design Spec
- T007–T011

### M3 — Architecture Decisions
- T012–T016

### M4 — Validation Plan
- T017–T019

### M5 — Implementation Prep (Still Planning Only)
- T020–T022

### M6 — Full UI/UX Overhaul (Wednesday-Skills-Governed)
- T023–T030

---

## Task List

- [x] **T001 — Capture Baseline Builder State**
  - **Goal:** Document the current builder UX/state from live environment and repo docs as a shared baseline.
  - **Why it matters:** Establishes objective starting point before fixing theme mismatch and dashboard-like presentation.
  - **Definition of Done:** A baseline note exists with current flow, visible panels, step states, and screenshots referenced.
  - **Dependencies:** None
  - **Artifacts:** `docs/refactor/builder-baseline.md` (new), screenshot references/paths (existing captures)

- [x] **T002 — Diagnose Visual Theme Misalignment**
  - **Goal:** Identify where builder styling diverges from site-wide brand language.
  - **Why it matters:** Directly addresses feedback that dark builder feels visually disconnected from the rest of the site.
  - **Definition of Done:** A documented list of mismatches across color, typography, spacing, component style, and tone; each mismatch mapped to impact severity.
  - **Dependencies:** T001
  - **Artifacts:** `docs/refactor/theme-misalignment-audit.md` (new)

- [x] **T003 — Diagnose “SaaS Dashboard” Feel**
  - **Goal:** Identify structural/UI causes that make builder read like admin software instead of a creative tool.
  - **Why it matters:** Targets feedback that builder currently feels like Stripe/Notion/Figma rather than immersive aquascaping.
  - **Definition of Done:** A root-cause matrix listing layout, panel density, control hierarchy, and language issues with evidence from current UI.
  - **Dependencies:** T001
  - **Artifacts:** `docs/refactor/dashboard-feel-root-causes.md` (new)

- [x] **T004 — Diagnose Camera Lock / Reset Behavior**
  - **Goal:** Trace where camera pose is being reset or overridden in current architecture.
  - **Why it matters:** Camera snap-back is a core immersion breaker and directly blocks user control expectations.
  - **Definition of Done:** A documented event/lifecycle trace showing camera initialization, update triggers, and reset points, with suspected ownership flaws.
  - **Dependencies:** T001
  - **Artifacts:** `docs/refactor/camera-reset-diagnosis.md` (new)

- [x] **T005 — Diagnose Current Substrate Sculpting Model**
  - **Goal:** Document current substrate editing model, constraints, and UX friction points.
  - **Why it matters:** Existing sculpting is reported as frustrating/unintuitive and needs replacement-level planning.
  - **Definition of Done:** Current sculpt pipeline is mapped end-to-end (input -> data -> mesh update -> feedback), with pain points categorized by usability and technical limitations.
  - **Dependencies:** T001
  - **Artifacts:** `docs/refactor/substrate-current-model-diagnosis.md` (new)

- [x] **T006 — Analyze Inspiration Images (`/inspiration-photos`)**
  - **Goal:** Extract concrete visual principles from inspiration references.
  - **Why it matters:** Ensures refactor aligns with desired game-like, stylized, dimensional benchmark rather than abstract taste.
  - **Definition of Done:** A visual analysis doc with lighting, composition, depth/layering, and UI-overlay principles plus explicit “current vs target” deltas.
  - **Dependencies:** T001
  - **Artifacts:** `docs/refactor/inspiration-analysis.md` (new)

- [x] **T007 — Define Builder Experience Principles (v1)**
  - **Goal:** Create explicit product principles for immersive, creative-first builder behavior.
  - **Why it matters:** Prevents drifting back to dashboard patterns and anchors all decisions to product owner intent.
  - **Definition of Done:** 6–10 principles approved internally in doc (e.g., viewport dominance, user camera agency, progressive disclosure, tactile editing).
  - **Dependencies:** T002, T003, T006
  - **Artifacts:** `docs/refactor/experience-principles.md` (new)

- [x] **T008 — Produce Layout & Information Architecture Spec**
  - **Goal:** Specify stage-first layout with contextual HUD/panels and reduced always-on chrome.
  - **Why it matters:** Directly addresses SaaS dashboard feel and lack of immersion.
  - **Definition of Done:** Annotated IA spec includes always-visible vs contextual UI, panel behavior rules, and step-to-surface mapping.
  - **Dependencies:** T003, T007
  - **Artifacts:** `docs/refactor/layout-ia-spec.md` (new)

- [x] **T009 — Produce Visual Direction Spec**
  - **Goal:** Define visual system updates to align with site brand while adding immersive depth.
  - **Why it matters:** Solves theme disconnect and enables richer, game-like atmosphere without clutter.
  - **Definition of Done:** Token-level direction for color/contrast/material/light/motion plus “do/don’t” examples tied to inspiration analysis.
  - **Dependencies:** T002, T006, T007
  - **Artifacts:** `docs/refactor/visual-direction-spec.md` (new)

- [x] **T010 — Produce Camera UX Spec**
  - **Goal:** Define required camera capabilities and user-facing interactions.
  - **Why it matters:** Restores immersion via predictable orbit/zoom/pan and no forced resets.
  - **Definition of Done:** Spec includes interaction contract, explicit auto-frame rules, persistence expectations, and acceptance criteria.
  - **Dependencies:** T004, T007
  - **Artifacts:** `docs/refactor/camera-ux-spec.md` (new)

- [x] **T011 — Produce Substrate Editing UX Spec (Node-Grid Concept)**
  - **Goal:** Define tactile node-grid editing behavior and user workflow.
  - **Why it matters:** Replaces frustrating sculpting interaction with precise, game-engine-like terrain control.
  - **Definition of Done:** Spec includes node manipulation interactions, feedback states, constraints, and undo/redo behavior.
  - **Dependencies:** T005, T006, T007
  - **Artifacts:** `docs/refactor/substrate-ux-spec.md` (new)

- [x] **T012 — Camera Architecture Decision Record**
  - **Goal:** Select and document camera control architecture/state ownership model.
  - **Why it matters:** Prevents repeat camera lock/reset regressions through explicit lifecycle and ownership boundaries.
  - **Definition of Done:** ADR lists chosen design, rejected alternatives, trigger rules for framing, and persistence model.
  - **Dependencies:** T004, T010
  - **Artifacts:** `decisions/ADR-camera-control-architecture.md` (new)

- [x] **T013 — Substrate Data & Mesh Architecture Decision Record**
  - **Goal:** Select data model and interpolation strategy for node-grid substrate system.
  - **Why it matters:** Core technical foundation for tactile sculpting and reliable performance.
  - **Definition of Done:** ADR defines control lattice model, interpolation method, mesh update strategy, and constraints.
  - **Dependencies:** T005, T011
  - **Artifacts:** `decisions/ADR-substrate-node-grid-architecture.md` (new)

- [x] **T014 — Performance Budget & Risk Model**
  - **Goal:** Quantify performance constraints and high-risk scenarios across camera, rendering, and substrate updates.
  - **Why it matters:** Immersion fails if controls lag or frame rate collapses under richer visuals and live mesh edits.
  - **Definition of Done:** Document defines target budgets (interaction latency/frame stability), risk matrix, and mitigation strategies.
  - **Dependencies:** T009, T010, T011, T012, T013
  - **Artifacts:** `docs/refactor/performance-risk-model.md` (new)

- [x] **T015 — Dependency & Sequence Map**
  - **Goal:** Create a system dependency graph and recommended implementation order.
  - **Why it matters:** Ensures high-impact immersion fixes (layout/camera) happen before polish and reduces rework.
  - **Definition of Done:** A sequenced map exists with critical path, blockers, and parallelizable workstreams.
  - **Dependencies:** T008, T009, T012, T013, T014
  - **Artifacts:** `docs/refactor/dependency-sequence-map.md` (new)

- [x] **T016 — Acceptance Criteria Matrix by Subsystem**
  - **Goal:** Define objective pass/fail criteria for theme, immersion, camera, substrate, and inspiration fidelity.
  - **Why it matters:** Turns qualitative product feedback into testable outcomes before implementation starts.
  - **Definition of Done:** Matrix contains measurable criteria per subsystem and validation method per criterion.
  - **Dependencies:** T008, T009, T010, T011, T014
  - **Artifacts:** `docs/refactor/acceptance-criteria-matrix.md` (new)

- [x] **T017 — Validation & Research Plan**
  - **Goal:** Define how pre/post-refactor UX validation will be run.
  - **Why it matters:** Confirms the product no longer feels like a dashboard and verifies improved immersion/control.
  - **Definition of Done:** Plan includes test scenarios, participant profile, scripted tasks, and decision thresholds.
  - **Dependencies:** T016
  - **Artifacts:** `docs/refactor/validation-plan.md` (new)

- [x] **T018 — Test Scenario Scripts (Planning Artifacts)**
  - **Goal:** Draft concrete scenario scripts for camera control, substrate editing, and creative-flow completion.
  - **Why it matters:** Ensures camera lock and sculpting usability are validated explicitly, not implicitly.
  - **Definition of Done:** Scenario set includes setup, steps, expected outcomes, and failure capture fields.
  - **Dependencies:** T017
  - **Artifacts:** `docs/refactor/test-scenarios.md` (new)

- [x] **T019 — Instrumentation & Observability Plan**
  - **Goal:** Plan telemetry/events needed to measure immersion and control quality after implementation.
  - **Why it matters:** Needed to objectively confirm camera persistence, editing fluency, and flow completion improvements.
  - **Definition of Done:** Event dictionary and KPI mapping documented; no code added.
  - **Dependencies:** T016, T017
  - **Artifacts:** `docs/refactor/instrumentation-plan.md` (new)

- [x] **T020 — Phase-by-Phase Delivery Plan**
  - **Goal:** Convert architecture/design outputs into an implementation phase roadmap with scoped deliverables.
  - **Why it matters:** Keeps execution focused on highest product-feel impact first.
  - **Definition of Done:** Roadmap defines phase goals, deliverables, exit criteria, and explicit non-goals per phase.
  - **Dependencies:** T015, T016, T019
  - **Artifacts:** `docs/refactor/phased-delivery-plan.md` (new)

- [x] **T021 — Build Implementation Backlog Skeleton (No Coding)**
  - **Goal:** Create a prioritized backlog template ready for engineering execution once approved.
  - **Why it matters:** Smooth handoff from planning to implementation while preserving strategic intent.
  - **Definition of Done:** Backlog file exists with epics/stories placeholders mapped to phases and acceptance criteria links.
  - **Dependencies:** T020
  - **Artifacts:** `docs/refactor/implementation-backlog-skeleton.md` (new)

- [x] **T022 — Plan Review Packet (Approval Gate)**
  - **Goal:** Produce concise review packet summarizing diagnosis, strategy, architecture choices, risks, and roadmap.
  - **Why it matters:** Final approval gate to ensure no implementation begins before product owner sign-off.
  - **Definition of Done:** Single review packet delivered with executive summary, decision highlights, open questions, and explicit “approve to implement” checkbox.
  - **Dependencies:** T001, T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020, T021
  - **Artifacts:** `docs/refactor/PLAN_REVIEW_PACKET.md` (new)

- [x] **T023 — Wednesday Skill Enforcement Baseline (Dev + Design)**
  - **Goal:** Define repo-level enforcement rules that require `wednesday-dev` and `wednesday-design` for all Builder overhaul implementation work.
  - **Why it matters:** Ensures the overhaul consistently follows the new global design/dev system and prevents regression into ad-hoc patterns.
  - **Definition of Done:** A written enforcement checklist exists that maps major implementation areas to Wednesday skill requirements and reference docs.
  - **Dependencies:** T022
  - **Artifacts:** `docs/refactor/wednesday-enforcement-checklist.md` (new)

- [x] **T024 — Overhaul UI Composition Blueprint (Screen-by-Screen)**
  - **Goal:** Translate stage-first IA into concrete screen/state blueprints for each Builder step and key interaction mode.
  - **Why it matters:** Converts strategic layout direction into implementable UI structure and reduces execution ambiguity.
  - **Definition of Done:** Blueprint includes step states, responsive behavior, panel visibility rules, and viewport-safe zones for overlays.
  - **Dependencies:** T022, T023
  - **Artifacts:** `docs/refactor/ui-composition-blueprint.md` (new)

- [x] **T025 — Overhaul Visual Spec Package (Tokens + Components + Motion)**
  - **Goal:** Produce implementation-ready visual spec package aligned to Wednesday design tokens and approved component usage.
  - **Why it matters:** Ensures the visual overhaul is immersive, brand-coherent, and standardized across components.
  - **Definition of Done:** Spec maps all primary Builder surfaces/components to approved patterns/tokens and includes motion behavior guidance.
  - **Dependencies:** T022, T023
  - **Artifacts:** `docs/refactor/visual-spec-package.md` (new)

- [x] **T026 — Camera UX Implementation Plan (Task Breakdown)**
  - **Goal:** Break camera redesign into sequenced implementation tasks under the accepted camera ADR.
  - **Why it matters:** Camera agency is a critical immersion blocker and must be executed with high confidence.
  - **Definition of Done:** Task breakdown includes milestones, test points, failure rollback strategy, and explicit completion checks.
  - **Dependencies:** T022, T023
  - **Artifacts:** `docs/refactor/camera-implementation-plan.md` (new)

- [x] **T027 — Substrate Node-Grid Implementation Plan (Task Breakdown)**
  - **Goal:** Break node-grid substrate redesign into sequenced implementation tasks under the substrate ADR.
  - **Why it matters:** Tactile terrain editing is a core product differentiator and highest-risk engineering stream.
  - **Definition of Done:** Plan includes data migration approach, mesh update strategy, interaction milestones, and perf checkpoints.
  - **Dependencies:** T022, T023
  - **Artifacts:** `docs/refactor/substrate-implementation-plan.md` (new)

- [ ] **T028 — Performance Guardrail Integration Plan**
  - **Goal:** Map performance budgets/risk mitigations into concrete engineering guardrails for overhaul implementation.
  - **Why it matters:** Prevents immersion gains from being undermined by latency, stutter, or unstable frame pacing.
  - **Definition of Done:** Guardrail plan defines budget gates per phase, profiling checkpoints, and remediation paths for budget failures.
  - **Dependencies:** T022, T023, T026, T027
  - **Artifacts:** `docs/refactor/perf-guardrail-integration-plan.md` (new)

- [ ] **T029 — Full UI/UX Overhaul Sprint Plan (Execution-Ready)**
  - **Goal:** Produce a sequenced sprint plan combining UI, visual, camera, substrate, and performance streams into one cohesive delivery program.
  - **Why it matters:** Coordinates cross-system changes and reduces integration risk during overhaul execution.
  - **Definition of Done:** Sprint plan includes workstream owners/ordering, dependency gates, and milestone demos with acceptance criteria links.
  - **Dependencies:** T022, T024, T025, T026, T027, T028
  - **Artifacts:** `docs/refactor/overhaul-sprint-plan.md` (new)

- [ ] **T030 — UI/UX Overhaul Kickoff Packet (Approval-to-Implement Gate)**
  - **Goal:** Produce a final packet that requests explicit kickoff approval for full UI/UX overhaul execution.
  - **Why it matters:** Ensures final stakeholder alignment before large-scale implementation begins.
  - **Definition of Done:** Packet includes scope, sequence, risks, success criteria, and explicit “approve overhaul implementation” decision checkbox.
  - **Dependencies:** T029
  - **Artifacts:** `docs/refactor/OVERHAUL_KICKOFF_PACKET.md` (new)
