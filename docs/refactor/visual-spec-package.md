# Overhaul Visual Spec Package (Tokens + Components + Motion) (T025)

Date: 2026-02-15
Scope: Provide implementation-ready visual guidance aligned with Wednesday design standards and immersive Builder goals.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/visual-direction-spec.md` (T009)
- `docs/refactor/ui-composition-blueprint.md` (T024)
- `docs/refactor/wednesday-enforcement-checklist.md` (T023)
- `skills/wednesday-design/SKILL.md`

## 1) Visual System Intent

Design target: Builder should feel like a premium, game-like creative environment, not an admin dashboard.

Principles:
1. Scene-first composition and depth.
2. Quiet-but-legible control surfaces.
3. Strong hierarchy: creative action > supporting metadata.
4. Cohesive token-driven styling across all steps.

## 2) Token Baseline (Builder)

## Color roles
- **Primary action gradient:** `#4ADE80 -> #0D9488`
- **Surface dark base:** `#18181B` to `#27272A` tonal steps for overlays/panels
- **Text primary:** high-contrast off-white on dark surfaces
- **Text secondary:** muted gray for descriptions/help
- **State colors:** success/warning/error mapped to semantic tokens, not ad-hoc hex

## Typography roles
- **Display headings:** Instrument Serif (step headers, key moments)
- **UI/body text:** DM Sans
- **Data labels/overlines:** uppercase, increased tracking

## Spacing/radius/shadow
- 4px base spacing system
- Compact control cluster spacing for high-frequency tools
- Card/panel radius follows Wednesday baseline (soft premium curves)
- Layered shadows/glows only where hierarchy requires emphasis

## 3) Component Mapping (Approved Libraries Only)

## Foundational controls
- Buttons, inputs, selects, dialogs, sheets: **shadcn/ui**
- Step forms + structured configuration: **shadcn/ui** primitives

## Immersive enhancements
- Ambient backgrounds/effects: **Aceternity UI** (sparingly)
- Premium CTA/button micro-delight: **Magic UI** button variants
- Optional advanced motion transitions: **Motion Primitives**

## Hard rule
- No custom components unless explicitly approved exception is documented.
- Prefer composition of approved primitives over bespoke widgets.

## 4) Surface-by-Surface Visual Spec

## A. Top HUD
- Low visual weight, high readability.
- Semi-transparent dark surface with subtle blur (performance-safe fallback required).
- Step identity + mode indicators + save state only.
- Avoid dense metric blocks.

## B. Context Panel
- Single active panel surface; secondary tools in nested accordions/tabs.
- Tonal layering differentiates sections without card-stacking overload.
- Selected-object information gets highest local contrast.

## C. Tool Rail
- Icon-first, compact, clear active state ring/fill.
- Hover/active states use restrained glow + scale transform.
- Tooltip style consistent with panel surface tokens.

## D. Stage Overlays
- Minimal helper overlays (guides, hints, selection feedback).
- Auto-fade non-critical overlays after interaction idle.
- Keep center scene area clear by default.

## E. Review Surfaces
- Checklist/BOM surfaces stay subordinate to rendered scene.
- Use density controls (collapsed groups by default).
- Highlight blockers with semantic states, not alarm-heavy styling.

## 5) Motion Behavior Spec

## Timing model
- Micro interactions: 100-150ms
- Hover transitions: 200-300ms
- Panel/sheet transitions: 300-400ms
- Ambient loops: 3-6s subtle cycles

## Motion rules
1. Animate only transform/opacity for frequent interactions.
2. No large-layout-shifting transitions during precision tasks.
3. Respect `prefers-reduced-motion` with deterministic fallback states.
4. Motion should reinforce focus (selection, mode switch, confirmation), never distract.

## 6) Accessibility Requirements (Visual)

- Contrast minimums per Wednesday standard.
- Focus visibility mandatory on all keyboard-reachable controls.
- State changes not color-only; pair with icon/text where needed.
- Motion reduction support across all animated surfaces.

## 7) Quality Tier Styling Guidance

- **High tier:** full atmosphere stack (subtle glows, richer depth cues).
- **Medium tier:** reduced post effects, preserve hierarchy and legibility.
- **Low tier:** stripped decoration, maintain token consistency and interaction clarity.

Visual quality scaling must never break control clarity or hierarchy semantics.

## 8) Implementation Handoff Checklist

For each Builder surface/story:
- [ ] Token map attached (color/typography/spacing/state)
- [ ] Approved component source identified
- [ ] Motion spec attached with reduced-motion fallback
- [ ] Accessibility checks listed
- [ ] Performance notes for visual effects included

## 9) Acceptance Mapping

- Visual coherence + brand fit: AC-04, AC-05
- Atmosphere + depth cues: AC-06, AC-16, AC-17
- Flow-supportive visual behavior: AC-18

## Exit Criteria Check (T025 DoD)

- [x] Primary Builder surfaces mapped to token/component guidance
- [x] Motion behavior guidelines defined with accessibility constraints
- [x] Approved-library-only constraint explicitly integrated
- [x] Ready input for T026/T027/T028 planning tracks
