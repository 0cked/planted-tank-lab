# Visual Direction Spec (T009)

Date: 2026-02-14
Scope: Define visual system direction that aligns Builder with site brand while delivering immersive, game-like depth.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/theme-misalignment-audit.md`
- `docs/refactor/inspiration-analysis.md`
- `docs/refactor/experience-principles.md`
- `docs/refactor/layout-ia-spec.md`

## 1) Visual Direction Objective

Create a **brand-coherent immersive mode**:
- unmistakably the same product family as the rest of the site,
- but optimized for cinematic, scene-first creative work.

## 2) Visual System Model

## Layer A — Brand Shell
- Header/navigation typography and core spacing rhythm remain consistent with site identity.
- Keep shell calm and minimal; avoid dramatic accents in global chrome.

## Layer B — Creative Stage Mode
- Viewport adopts richer atmosphere (lighting/fog/depth) while preserving readability.
- UI overlays become lighter, edge-aligned instruments rather than dominant card blocks.

## 3) Color & Contrast Strategy

## A. Contrast budget rules
1. Highest contrast belongs to tank content and active interaction target.
2. Secondary contrast belongs to currently relevant tool surfaces.
3. Lowest contrast belongs to non-active chrome and metadata.

## B. Surface hierarchy tokens (directional)
- **Stage background:** deep aquatic neutrals (blue/teal-black family)
- **Panel base:** translucent dark-neutral overlays with lower opacity than current cards
- **Accent:** restrained cyan/emerald family for active states only
- **Danger/reset actions:** isolated warm accent, never co-equal with primary creative controls

## C. Saturation policy
- Scene elements (plants/hardscape/light) carry most saturation.
- UI saturation should be moderate and intentional to avoid dashboard noise.

## 4) Typography & Labeling Direction

- Reduce utility-heavy uppercase density in persistent surfaces.
- Keep micro labels where necessary, but increase breathing room around key creative controls.
- Favor action language that supports composition (e.g., “Shape”, “Place”, “Focus”) over system-state jargon.

## 5) Material & Depth Language

## A. Stage materials
- Prioritize believable material response in glass, substrate, rock, plant mass.
- Preserve specular highlights and soft shadowing for depth readability.

## B. UI materials
- Prefer subtle glass/frost overlays with soft borders over heavy boxed cards.
- Use elevation sparingly: one primary active surface at a time.

## C. Depth cues
- Use vignette/fog/bloom as supporting cinematic cues, not primary spectacle.
- Ensure post effects never obscure hardscape/plant silhouette legibility.

## 6) Lighting Direction

- Keep explicit fixture-led key lighting as compositional anchor.
- Use controlled fill and rim lights to separate foreground/midground/background.
- Maintain per-quality-tier lighting consistency in mood, with scaled complexity.

## 7) Motion & Transition Language

- Step and panel transitions should be soft and spatially coherent, not abrupt tab-like switches.
- Mode changes should emphasize continuity of scene control.
- Avoid flashy UI motion that distracts from composition tasks.

## 8) Do / Don’t Examples

## Do
- Do keep scene center visually clear.
- Do show only one dominant contextual panel at a time.
- Do reserve bright accents for active tool/selected object.
- Do let aquascape massing be the primary visual story.

## Don’t
- Don’t stack multiple equal-weight high-contrast cards simultaneously.
- Don’t use persistent KPI/status strips in default creative mode.
- Don’t let action bars crowd top + sides + bottom with equal prominence.
- Don’t overbrighten UI to the point it competes with scene lighting.

## 9) Quality Tier Visual Policy

- **High:** full cinematic pipeline (richer AO/bloom/noise), strict clarity safeguards.
- **Medium:** reduced effect intensity, preserved scene readability.
- **Low:** minimal post stack, keep composition and material legibility first.

## 10) Validation Hooks (feeds T016)

1. Can users identify scene focal point within 1 second?
2. Is central composition area unobstructed by persistent UI?
3. Are active controls visually obvious without overwhelming scene?
4. Does Builder feel brand-coherent with site shell but clearly more immersive?
5. Does low/medium quality preserve same visual hierarchy intent?

## Exit Criteria Check (T009 DoD)

- [x] Token-level visual direction provided (color/contrast/material/light/motion)
- [x] Includes concrete do/don’t guidance
- [x] Explicitly tied to inspiration-derived principles
- [x] Ready to inform acceptance criteria and implementation planning
