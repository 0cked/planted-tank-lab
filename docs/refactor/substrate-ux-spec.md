# Substrate Editing UX Spec (Node-Grid Concept) (T011)

Date: 2026-02-14
Scope: Define tactile node-grid substrate editing behavior, interaction model, and constraints.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/substrate-current-model-diagnosis.md`
- `docs/refactor/inspiration-analysis.md`
- `docs/refactor/experience-principles.md`

## 1) UX Objective

Replace brush-only, parameter-coupled sculpting with **direct, tactile terrain shaping** that feels game-engine-like:
- users manipulate visible surface control points,
- edits are precise and locally understandable,
- mesh responds in real time with clear feedback.

## 2) Mental Model

Substrate is a **control lattice** over the tank floor:
- each node represents local surface height,
- dragging a node up/down reshapes nearby terrain via interpolation,
- users sculpt composition intentionally (slope, mound, valley) rather than “painting” uncertain profile changes.

## 3) Interaction Design

## A. Modes
- **Select Node** (default in substrate step)
- **Sculpt Drag** (drag selected node vertically)
- **Soft Influence** (optional radius/falloff around selected node)
- **Preset Apply** (flat/island/slope/valley as starting templates)

## B. Pointer behavior
1. Hover node -> hover highlight appears.
2. Click node -> selected state + handle gizmo appears.
3. Drag vertically -> node height updates continuously.
4. Adjacent surface deforms smoothly according to falloff/interpolation.
5. Release -> edit transaction committed (undo checkpoint).

## C. Multi-node operations (phaseable)
- Shift-select multiple nodes.
- Group raise/lower for broad shape moves.
- Optional flatten-to-plane command for selected nodes.

## 4) Visual Feedback States

Required visual states:
- **Idle grid:** subtle but visible enough to discover.
- **Hover node:** clear highlight (color + scale pulse optional).
- **Selected node:** strong active state + vertical handle.
- **Drag in progress:** height delta indicator (value or simple bar).
- **Constraint hit:** clear clamped-state feedback (color or small warning).

Scene feedback requirements:
- Terrain mesh deformation must be visible during drag.
- Shading/contour should preserve readability of grade changes.
- Keep viewport unobstructed by heavy panel overlays while sculpting.

## 5) Controls & Parameters

## Core controls (always available in substrate step)
- Node/grid density preset (coarse/medium/fine; adaptive default)
- Influence radius (for neighboring nodes)
- Falloff curve (soft/medium/sharp)
- Height clamp indicator
- Undo / Redo

## Secondary controls (progressive disclosure)
- Smoothing pass intensity
- Erosion/noise operators (advanced)
- Edge lock behavior (hard/soft boundary)

## 6) Constraints & Safety

- Clamp node heights to plausible tank-relative bounds.
- Clamp local slope to avoid unrealistic cliffs unless explicitly enabled.
- Preserve boundary stability at glass edges (edge constraints).
- Prevent accidental extreme edits with drag speed damping at limits.

## 7) Undo/Redo Transaction Model

- One drag gesture = one transaction.
- Preset apply = one transaction.
- Group operations = one transaction per command.
- Undo/redo should restore both node heights and resulting mesh state deterministically.

## 8) Integration with Product Outputs

During substrate editing:
- Update fill estimate and bag count as terrain changes.
- Keep BOM substrate line synchronized with current volume target.
- Avoid excessive panel churn while values update (stable UI).

## 9) Performance UX Targets

- Continuous drag should feel smooth with no visible stutter under target scene complexity.
- Mesh updates should prioritize local patch updates over full rebuilds where possible.
- Node overlay rendering should stay lightweight and decluttered at high densities.

## 10) Acceptance Criteria (Objective)

1. User can create a visible slope by editing a small subset of nodes in <30s.
2. User can create a mound and a valley at distinct locations with predictable local control.
3. Adjacent interpolation appears smooth without abrupt seams.
4. Selected/hovered node states are always visually unambiguous.
5. Undo returns terrain to pre-gesture state accurately.
6. Fill target/bag estimate updates reflect terrain changes.
7. Interaction remains responsive during sustained drag operations.

## 11) Out-of-Scope (for this spec)

- Final interpolation algorithm selection (handled in T013 ADR).
- Final perf budget thresholds (handled in T014).
- Final implementation backlog decomposition (T020+).

## Exit Criteria Check (T011 DoD)

- [x] Node manipulation interactions defined
- [x] Feedback states defined
- [x] Constraints and undo/redo behavior defined
- [x] Testable acceptance criteria provided
