# Inspiration Analysis (`/inspiration-photos`) (T006)

Date: 2026-02-14
Scope: Extract visual principles from inspiration images and compare to current Builder baseline.
Status: Planning artifact (no implementation).

## Source Set Reviewed

- `inspiration-photos/Screenshot 2022-09-02 at 2.40.06 AM.webp`
- `inspiration-photos/Screenshot 2022-09-08 at 10.32.17 PM.png`

## What these references consistently do well

## 1) Lighting pattern

### Key observations
- Dominant **overhead fixture** acts as an in-world light source and compositional anchor.
- Strong **top-down key light** with controlled bloom around fixture hotspot.
- Dark scenes preserve detail through **targeted local highlights** on hardscape/plant forms.
- Contrast is **scene-centric**, not UI-centric.

### Extracted principle
Use cinematic, physically legible tank lighting where light direction and fixture presence shape mood and readability.

## 2) Composition structure

### Key observations
- Tank is centered or near-centered as the hero object.
- Hardscape follows a clear massing rhythm (primary/secondary clusters, directional flow).
- UI sits at edges as a thin utility layer, not a competing center mass.

### Extracted principle
Compose the screen as stage-first: scene massing and tank silhouette lead; controls support from periphery.

## 3) Depth and layering techniques

### Key observations
- Strong foreground/midground/background separation inside the tank.
- Subtle atmospheric depth in darker scenes (falloff, vignette, selective illumination).
- Material differentiation (glass, stone, substrate, plant) creates dimensionality without excessive UI effects.

### Extracted principle
Depth should be communicated primarily by scene geometry/material/light layering, not by extra dashboard chrome.

## 4) Interaction atmosphere

### Key observations
- Tool rails/icons are minimal and low-contrast relative to scene.
- Interfaces feel “creative instrument” rather than data table.
- Ambient darkness/lightness adjusts by scene mode but keeps attention on tank.

### Extracted principle
The UI should feel like a lightweight instrument overlay on a living scene, not a card-stack web app.

## Current Builder vs Target Delta

| Dimension | Current Builder Baseline | Inspiration Target | Delta Severity |
|---|---|---|---|
| Viewport dominance | Competes with top/left/right/bottom persistent panels | Tank stage clearly dominates with thin peripheral controls | **Critical** |
| Lighting dramaturgy | Stylized but generalized; scene shares attention with UI containers | Lighting directs eye to aquascape mass and focal zones | **High** |
| UI visual weight | Many similarly weighted framed modules | Lightweight rails + contextual overlays | **Critical** |
| Creative mood | Mixed: cinematic scene + dashboard control grammar | Unified “creative tool” mood | **High** |
| Depth communication | Present in scene, diluted by heavy UI framing | Depth read is immediate and unobstructed | **High** |
| Composition guidance | Operational tool state dominates early | Visual composition and placement intent dominate | **High** |

## Concrete Visual Principles to Carry Forward

1. **Fixture-led lighting:** Keep a legible overhead light source and tuned key/fill structure.
2. **Stage-first framing:** Maintain clear tank silhouette with unobstructed focal composition area.
3. **Peripheral UI discipline:** Keep controls low-noise and contextual at edges.
4. **Scene-first contrast budget:** Reserve strongest contrast for tank content, not every UI card.
5. **Layered depth cues:** Emphasize occlusion, shadow, material response, and atmospheric falloff.
6. **Massing readability:** Preserve rock/plant cluster readability at a glance from primary camera angles.

## Implications for upcoming planning tasks

- Feeds T007 (experience principles) with concrete scene-first rules.
- Feeds T008/T009 with layout + visual direction constraints.
- Supports T010/T011 by reinforcing camera agency and tactile terrain shaping as primary creative mechanics.

## Exit Criteria Check (T006 DoD)

- [x] Lighting patterns extracted
- [x] Composition structure extracted
- [x] Depth/layering techniques extracted
- [x] Current vs target deltas documented explicitly
