# Theme Misalignment Audit (T002)

Date: 2026-02-14
Scope: Diagnose where `/builder` visual styling diverges from site-wide brand experience.
Status: Planning artifact (no implementation).

## Method

- Compared current builder baseline states (Step 1–3 captures) against the broader site shell and product-page tone.
- Evaluated five axes required by T002: color, typography, spacing, component style, and overall tone.
- Rated each mismatch by severity (Critical / High / Medium / Low) based on impact to product coherence and immersion goals.

## Summary

The builder currently presents as a dark, high-density control surface with persistent dashboard chrome, while the rest of the site presents as a lighter, calmer, commerce/content-first web experience. The mismatch is not just palette; it is also component density, hierarchy, and tone.

Result: the builder feels like a visually separate product rather than a coherent “creative mode” extension of the same brand.

## Mismatch Matrix

| Axis | Current Builder | Current Site Shell | Misalignment | Severity | Why it matters |
|---|---|---|---|---|---|
| Color system | Near-black/navy dominant surface with neon-like accent emphasis across many controls | Light background, restrained accents, simpler contrast bands | Builder palette shifts brand personality abruptly instead of feeling like intentional mode escalation | **High** | Reinforces “different app” feeling rather than cohesive brand journey |
| Contrast distribution | High contrast distributed across many panels/buttons at once | Contrast concentrated in navigation and primary CTAs | Too many simultaneous high-attention elements create visual noise | **High** | Weakens scene focus and contributes to dashboard feel |
| Typography rhythm | Dense uppercase labels, compact utility text, many simultaneous labels | More relaxed reading rhythm and lower control density | Builder text hierarchy is utility-heavy and operational in tone | **Medium** | Feels tool-admin oriented, not creative/immersive |
| Spacing cadence | Tight stacking of strips/panels (header actions + stepper + side panels + footer diagnostics) | More breathable spacing and simpler sectional layout | Vertical and lateral breathing room is reduced in builder | **High** | Makes interface feel cramped and “control room” like |
| Component style | Repeated rounded cards/chips/buttons with similar visual weight | Simpler web components with fewer concurrent framed containers | Excess card/chip repetition creates dashboard grammar | **Critical** | Primary root of SaaS/admin visual language |
| Surface hierarchy | Multiple persistent framed surfaces compete with viewport | Standard pages prioritize main content area with less competing chrome | Viewport does not dominate attention consistently | **Critical** | Conflicts with product goal: tank viewport as hero |
| Information posture | Always-visible BOM/compatibility/diagnostics while composing | Information generally contextual to page purpose | Builder defaults to “monitoring” posture | **High** | Product feels like data workflow over creative workflow |
| Tonal language | Operational actions exposed early (save/duplicate/share/export/reset + diagnostics) | Simpler user journey framing in top-level site | Immediate operational density before creation intent is established | **Medium** | Increases perceived complexity and distance from “game-like” goal |

## Root Cause Pattern (Theme Layer)

1. **Mode transition is visual hard-cut, not brand-coherent escalation.**
2. **Panel/card repetition dominates over scene composition.**
3. **Operational metadata remains default-visible during creation.**
4. **Hierarchy distributes attention broadly instead of concentrating it on the tank.**

## Severity-Prioritized Fix Targets (Planning Direction)

1. **Critical:** Reduce persistent card stacks and rebalance hierarchy so viewport is primary.
2. **Critical:** Rework surface grammar from dashboard framing to stage + contextual overlays.
3. **High:** Rebuild contrast strategy so accents are purposeful, not omnipresent.
4. **High:** Increase spacing/breathing room; remove simultaneous high-noise strips.
5. **Medium:** Retone labels/copy from operational utility to creative guidance.

## Evidence References

- Step 1 baseline: `/Users/jacob/.openclaw/media/browser/a60819f6-3127-45b9-8be7-bb01ed4a3370.jpg`
- Step 2 baseline: `/Users/jacob/.openclaw/media/browser/b29dd64a-d625-4a02-8956-3b648e0042ae.jpg`
- Step 3 baseline: `/Users/jacob/.openclaw/media/browser/b72a3fd1-eea9-4de7-8e94-a5ce2cac664a.jpg`
- Baseline notes: `docs/refactor/builder-baseline.md`

## Exit Criteria Check (T002 DoD)

- [x] Documented mismatches across color, typography, spacing, component style, and tone
- [x] Mapped each mismatch to impact severity
- [x] Included evidence references
