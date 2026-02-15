# Overhaul UI Composition Blueprint (Screen-by-Screen) (T024)

Date: 2026-02-15
Scope: Translate stage-first IA into concrete Builder screen/state blueprints across steps and key interaction modes.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/layout-ia-spec.md` (T008)
- `docs/refactor/visual-direction-spec.md` (T009)
- `docs/refactor/wednesday-enforcement-checklist.md` (T023)
- Product-taste constraints (viewport-first, contextual controls, anti-dashboard)

## Global Composition Rules

1. **Viewport is dominant** at all steps; overlays never visually outweigh scene.
2. **One primary panel at a time**; secondary controls collapse into contextual trays/popovers.
3. **Step-specific control surfaces** only; no persistent multi-panel dashboard shell.
4. **Metadata defers to review moments**; avoid KPI/admin framing during creation flow.
5. **Safe-zone discipline:** no persistent critical controls in center scene zone.

## Layout Zones (shared across steps)

- **Zone A (Primary Stage):** Full-bleed 3D scene (hero)
- **Zone B (Top HUD):** Lightweight progress + project identity + mode indicators
- **Zone C (Primary Context Panel):** Right-side or bottom-drawer (single active surface)
- **Zone D (Quick Tool Rail):** Compact left/bottom icon rail for mode switching
- **Zone E (Transient Assist):** Toasts/hints/shortcuts, non-blocking

## Responsive Behavior Blueprint

### Desktop (>=1024)
- Stage fills majority width/height.
- Context panel docks right by default, collapsible.
- Tool rail persists in compact icon-only state.

### Tablet (768-1023)
- Context panel becomes bottom sheet.
- Tool rail shifts to bottom segmented control.
- HUD density reduced (labels become icons/short text).

### Mobile (<768)
- Stage remains primary; controls appear as stacked sheets.
- One task surface visible at a time.
- Gesture + explicit mode toggles prioritized over dense inline controls.

## Screen/State Blueprint by Step

## Step 1 — Tank Selection / Scene Initialization

**Primary intent:** Commit scene canvas quickly without admin overhead.

- **Always visible:** stage preview, minimal step header, core CTA
- **Context panel:** tank presets + dimensions summary only
- **Hidden/deferred:** detailed cost/compatibility analytics
- **Interaction emphasis:** rapid browse, immediate scene update preview

**Viewport-safe zones:**
- Top-center reserved for unobstructed tank preview silhouette
- Selection cards constrained to side/bottom bands

## Step 2 — Substrate Composition

**Primary intent:** Tactile terrain shaping with clear local feedback.

- **Always visible:** terrain mode indicator, undo/redo affordance, compact tool rail
- **Context panel:** brush/node parameters, constraints, quick presets
- **Transient overlays:** node/terrain feedback ghosts, local deltas
- **Hidden/deferred:** non-terrain configuration controls

**Viewport-safe zones:**
- Center/mid-depth stays clear for terrain form reading
- Editing helper overlays fade when interaction stops

## Step 3 — Hardscape Placement

**Primary intent:** Composition rhythm with placement confidence.

- **Always visible:** placement mode, snap/align toggles (compact)
- **Context panel:** selected asset properties + transform controls
- **Contextual popovers:** library filters/search; close after selection
- **Hidden/deferred:** unrelated system settings

**Viewport-safe zones:**
- Keep focal hardscape cluster unobstructed
- Property panel never overlays selected object center by default

## Step 4 — Plants / Equipment / Detailing

**Primary intent:** Layered scene refinement without visual clutter.

- **Always visible:** step progress, selected tool/mode, save status
- **Context panel:** category-specific controls (plants/equipment/details)
- **Secondary surfaces:** optional batch edit tray appears only with multi-select
- **Hidden/deferred:** final review outputs until requested

**Viewport-safe zones:**
- Foreground composition band left visually open for depth judgment
- Dense control groups collapse to accordions

## Step 5 — Review & Readiness

**Primary intent:** Validate output while preserving scene-first reading.

- **Always visible:** final scene, concise readiness summary ribbon
- **Context panel:** compatibility/BOM/readiness checklist (single scroll surface)
- **Comparison view:** split/overlay toggle for before/after edits
- **Hidden/deferred:** editing-heavy controls unless user re-enters edit mode

**Viewport-safe zones:**
- Scene remains dominant even in review; checklist panel capped width

## Key Interaction Modes Blueprint

## Camera mode
- Persistent compact camera indicator in HUD.
- Commands (focus/reset/frame) as explicit contextual controls near rail/panel.
- No implicit camera resets during step changes.

## Substrate edit mode
- Mode chip + active tool state anchored near lower periphery.
- Parameter controls grouped by "Shape / Smooth / Constraint" sections.
- High-frequency controls accessible without opening full panel.

## Selection/edit mode (assets)
- Selection outline in scene + mirrored compact inspector in panel.
- Multi-select promotes temporary action bar; disappears when no selection.

## Overlay Behavior Rules

1. **Priority stack:** critical interaction feedback > step context > supportive hints.
2. **Timeouts:** non-critical helper overlays auto-fade.
3. **Collision avoidance:** overlays avoid active object bounding area when possible.
4. **Escapability:** every transient surface can be dismissed via keyboard/pointer quickly.

## Screen-State Matrix (condensed)

| Step | Primary panel content | Secondary surface | Deferred content |
|---|---|---|---|
| 1 Tank | Preset + dimensions | Quick browse strip | Analytics-heavy metadata |
| 2 Substrate | Terrain controls | Local feedback overlays | Non-terrain settings |
| 3 Hardscape | Asset inspector | Library popover | Review/BOM details |
| 4 Plants/Detail | Category controls | Multi-select action bar | Final readiness outputs |
| 5 Review | Readiness checklist | Before/after toggle | Deep edit controls |

## Acceptance Mapping

- Stage dominance + hierarchy: AC-01, AC-02, AC-03
- Overlay/visual balance: AC-04, AC-05
- Flow continuity: AC-18

## Exit Criteria Check (T024 DoD)

- [x] Screen/state blueprint provided per Builder step
- [x] Responsive behavior defined for desktop/tablet/mobile
- [x] Panel visibility and contextual rules documented
- [x] Viewport-safe zone guidance included
