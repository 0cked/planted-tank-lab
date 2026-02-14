# Layout & Information Architecture Spec (T008)

Date: 2026-02-14
Scope: Define stage-first layout and contextual information architecture for Builder.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/dashboard-feel-root-causes.md`
- `docs/refactor/experience-principles.md`
- `docs/refactor/inspiration-analysis.md`

## 1) IA Goal

Restructure Builder from **panel-dense dashboard** to **scene-first creative stage** where the tank viewport is dominant and supporting controls are contextual, lightweight, and progressive.

## 2) Target Screen Architecture

## A. Primary Stage (Center, persistent)
- The viewport is the primary surface and receives highest visual priority.
- Keep central composition zone unobstructed.
- UI overlays should hug edges and auto-recede when idle.

## B. Top Rail (Thin, persistent, low-noise)
- Keep only high-value session controls:
  - Save
  - Undo/Redo (if available)
  - Mode/step title
  - Exit/Back to app shell
- Move duplicate/share/export/reset out of default top rail into contextual menus or review/publish stage.

## C. Left Context Tray (step-scoped, collapsible)
- Hosts only controls/assets relevant to current step.
- Defaults:
  - Expanded on desktop initially
  - Collapsible with one-click toggle
  - Auto-scrollable asset lists
- Step-specific content examples:
  - Tank: tank selector + dimension presets
  - Substrate: sculpt controls / (future node-grid controls)
  - Hardscape/Plants: asset library + search/filter
  - Equipment: category-scoped product chooser

## D. Right Inspector (selection-scoped, conditional)
- Visible only when needed:
  - Selected object details
  - Transform controls
  - Placement metadata
- Empty state: minimal helper hint, not full card stack.

## E. Bottom Mode Rail (task-scoped, persistent during scene editing)
- Contains active interaction modes (place/move/rotate/delete/sculpt).
- Must always reflect current actionable tool state.
- Keep compact and centered; avoid dashboard-like full-width telemetry.

## F. Secondary Drawers (on-demand)
- BOM
- Compatibility
- Diagnostics (non-default; debug-friendly)

These should not be fully expanded by default during composition steps.

## 3) Always-Visible vs Contextual Rules

## Always-visible (default composition mode)
- Viewport
- Minimal top rail
- Step indicator (compact)
- Bottom mode rail
- Left tray toggle + active step tray (desktop)

## Contextual / on-demand
- Right inspector (only with selection)
- BOM panel
- Compatibility panel
- Diagnostics
- Publish/share/export surfaces

## Hidden unless in relevant step/state
- Substrate-specific sliders (outside substrate step)
- Hardscape placement list (outside hardscape step)
- Plant zone controls (outside plants step)
- Equipment browsing controls (outside equipment step)

## 4) Step-to-Surface Mapping

| Step | Primary stage behavior | Left tray | Right inspector | Secondary drawers |
|---|---|---|---|---|
| Tank | Frame tank sizing + shell preview | Tank model + dimension controls | Tank info when selected | BOM collapsed preview only |
| Substrate | Terrain authoring focus | Sculpt controls / node-grid controls | Selected node/object metadata | Compatibility collapsed |
| Hardscape | Placement composition focus | Hardscape library/search | Selected item transform | BOM optional expanded |
| Plants | Layering/depth composition focus | Plant library + zone filters | Selected plant controls | Compatibility optional expanded |
| Equipment | Functional fit pass | Equipment categories/products | Selected equipment details | BOM/compatibility available |
| Review/Publish | Summary + final framing | Publish checklist | Optional selection inspector | BOM + compatibility expanded by default |

## 5) Hierarchy & Density Rules

1. One dominant visual plane (scene), many subordinate utility planes.
2. Never show more than two expanded secondary information surfaces at once.
3. Default to one interaction intention per step (e.g., place OR sculpt emphasis).
4. Avoid equal-weight card stacks; enforce strong visual priority ranking.
5. Use progressive disclosure for operational detail.

## 6) Interaction Model Rules

- Step transitions should preserve continuity (no major layout jump unless entering review).
- Selection drives inspector visibility and controls.
- Tool changes should not trigger unrelated panel expansions.
- Context tray and inspector states should persist within session where helpful.

## 7) Mobile/Small Viewport Adaptation

- Stage remains top priority; side surfaces become bottom sheets/drawers.
- Left tray and right inspector convert to stacked tabs or segmented drawer.
- Keep mode rail thumb-reachable and concise.

## 8) Anti-Drift Constraints (from product taste)

- Do not reintroduce full-time KPI/diagnostic strip in default builder mode.
- Do not keep BOM/compatibility fully expanded during early composition by default.
- Do not let top bar become operationally overloaded.
- Do not obscure central scene composition area with persistent modal blocks.

## 9) Acceptance Hooks for Next Tasks

This IA spec creates direct inputs for:
- T009 visual direction (surface contrast/material priorities)
- T010 camera UX (scene agency and unobstructed navigation)
- T016 acceptance matrix (objective checks for hierarchy/progressive disclosure)

## Exit Criteria Check (T008 DoD)

- [x] Annotated IA model defined
- [x] Always-visible vs contextual UI rules defined
- [x] Panel behavior rules defined
- [x] Step-to-surface mapping documented
