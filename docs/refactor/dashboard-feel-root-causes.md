# “SaaS Dashboard” Feel Root-Cause Diagnosis (T003)

Date: 2026-02-14
Scope: Identify why current Builder reads like admin software instead of an immersive creative tool.
Status: Planning artifact (no implementation).

## Executive Diagnosis

The current Builder presents as a **panel-dense operations console** rather than a **scene-first creative stage**. The dominant grammar is management-oriented (cards, controls, metrics, status text), so users experience it like a workflow dashboard instead of a game-like composition environment.

## Root-Cause Matrix

| Category | Current behavior | Why it reads as SaaS | Product impact | Severity |
|---|---|---|---|---|
| Layout hierarchy | Multiple always-on bands/panels (top action strip, step strip, left tool panel, right BOM/compat, diagnostics footer) | Resembles command center information stacking | Scene is visually demoted; immersion breaks | **Critical** |
| Panel density | Many framed containers with similar visual weight | Dashboard systems rely on repeated cards and equal-weight modules | No clear hero surface; attention fragments | **Critical** |
| Information posture | BOM + compatibility + diagnostics shown during early creation steps | Continuous KPI/status exposure implies monitoring tool | Creative intent diluted by operational data | **High** |
| Action posture | Save/duplicate/share/export/reset all exposed early and persistently | Tooling feels document/admin lifecycle-first | Premature “management” burden before creative flow | **High** |
| Step model expression | Wizard-like procedural step strip with rigid progression cues | Feels like enterprise onboarding/task workflow | Limits exploratory creation feel | **Medium** |
| Control language | Labels emphasize system/tool state (“tool mode”, “diagnostics”, “line items”) | Utility-centric language is typical in internal tools | Emotional/aesthetic creative framing is weak | **Medium** |
| Visual composition | UI frames occupy substantial viewport border area | Dense chrome is common in dashboards; not in stage-centric tools | Tank view loses dominance and cinematic effect | **High** |
| Feedback distribution | Many simultaneous status indicators compete for attention | Dashboards maximize at-a-glance telemetry | Reduces focus and increases cognitive noise | **High** |

## Structural Misalignments vs Desired Product Direction

Desired direction: immersive, stylized, game-like aquascape builder with viewport hero.

Current structural conflicts:
1. **Scene is one module among many**, not the primary stage.
2. **Operational metadata is default-visible**, not progressively disclosed.
3. **Controls are “always present” rather than contextual**, causing visual crowding.
4. **System/status vocabulary dominates**, weakening creative identity.

## Evidence from Baseline

- Step 1 baseline: `/Users/jacob/.openclaw/media/browser/a60819f6-3127-45b9-8be7-bb01ed4a3370.jpg`
- Step 2 baseline: `/Users/jacob/.openclaw/media/browser/b29dd64a-d625-4a02-8956-3b648e0042ae.jpg`
- Step 3 baseline: `/Users/jacob/.openclaw/media/browser/b72a3fd1-eea9-4de7-8e94-a5ce2cac664a.jpg`
- Supporting notes: `docs/refactor/builder-baseline.md`, `docs/refactor/theme-misalignment-audit.md`

## Why this matters for refactor ordering

This is a **structural** issue, not a superficial styling issue. Changing colors alone will not remove dashboard feel. Refactor priority should first address hierarchy + disclosure + stage dominance, then visual polish.

## Exit Criteria Check (T003 DoD)

- [x] Root-cause matrix exists
- [x] Covers layout, panel density, control hierarchy, and language issues
- [x] Includes concrete evidence references
- [x] Clearly ties issues to immersive creative-tool goal
