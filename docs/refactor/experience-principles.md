# Builder Experience Principles v1 (T007)

Date: 2026-02-14
Scope: Product principles for immersive, creative-first Builder direction.
Status: Planning artifact (no implementation).

Inputs synthesized:
- `docs/refactor/theme-misalignment-audit.md`
- `docs/refactor/dashboard-feel-root-causes.md`
- `docs/refactor/inspiration-analysis.md`

## Principles

## P1 — Viewport Primacy (Non-Negotiable)
The tank viewport is the hero surface; all UI must be subordinate.

**Implication:** Any persistent UI that competes with the stage must be reduced, relocated, or made contextual.

## P2 — Peripheral, Contextual Controls
Controls appear near workflow context and recede when not needed.

**Implication:** Replace always-on panel stacks with context-aware trays/inspectors and progressive disclosure.

## P3 — Creative Intent Before Operational Metadata
During composition/editing, prioritize shaping/placement actions over admin/commerce/status details.

**Implication:** BOM, compatibility, and diagnostics should not dominate default creative states.

## P4 — Camera Agency is Product Quality
Users must retain perspective ownership (orbit/zoom/pan, persistence, no forced snap-back).

**Implication:** Camera architecture must preserve user pose and avoid implicit reset behaviors.

## P5 — Tactile Terrain Authoring
Substrate editing should feel direct, precise, and physically understandable.

**Implication:** Move toward node-grid/heightfield manipulation with clear handles, interpolation, and immediate feedback.

## P6 — Scene-First Contrast Budget
Strongest visual contrast belongs to aquascape composition, not UI chrome.

**Implication:** Use restrained UI emphasis and reserve highlight intensity for scene focal points and key actions.

## P7 — Brand-Coherent Immersive Mode
Builder can be moodier/cinematic, but must still feel like the same product family.

**Implication:** Evolve from hard visual split to intentional “creative mode” within shared brand language.

## P8 — Legible Depth & Composition
Foreground/midground/background layering and hardscape massing should be readable at a glance.

**Implication:** Lighting/material/shadow decisions must support spatial readability and focal composition.

## P9 — Progressive Complexity
Novice path should feel simple; advanced controls should emerge as intent deepens.

**Implication:** Keep default surfaces lightweight; reveal advanced tuning/context panels on demand.

## P10 — Measurable Quality Over Vague Taste
Each principle must map to objective acceptance checks.

**Implication:** Follow-up specs must define observable pass/fail outcomes (layout hierarchy, camera behavior, sculpt precision, performance).

## Principle Validation Checklist (for future specs)

1. Does this decision increase viewport dominance?
2. Does it reduce dashboard-like persistent chrome?
3. Does it preserve or improve camera agency?
4. Does it improve tactile directness of editing interactions?
5. Does it strengthen scene depth/composition readability?
6. Is the change testable with objective criteria?

## Exit Criteria Check (T007 DoD)

- [x] Defined 6–10 explicit principles (10 provided)
- [x] Principles align with immersive creative-tool direction
- [x] Principles include viewport dominance, camera agency, progressive disclosure, tactile editing
- [x] Ready to drive T008/T009/T010/T011
