# Builder Baseline State (T001)

Date: 2026-02-14
Scope: Current `/builder` behavior/design baseline from live environment + repo docs.
Status: Planning artifact (no implementation).

## Baseline Summary

The builder currently functions as a multi-step flow with live BOM/compatibility coupling, but the interaction model and visual hierarchy read closer to a dashboard than an immersive creative tool.

## Current User Flow (Observed)

1. Step 1: Choose tank
   - Tank model selection enabled.
   - Continue becomes enabled after tank selection.
   - BOM receives tank line item and estimated total updates.
2. Step 2: Sculpt substrate
   - Terrain presets + brush controls (tool, size, strength, mound position).
   - Selecting substrate product updates fill target and bag count.
   - BOM updates substrate line item and total.
3. Step 3: Place hardscape
   - Hardscape catalog visible with per-item Place action.
   - Place action arms placement mode (e.g., “Placement mode armed for Branchwood Arch”).
   - Continue remains disabled until placement requirements are met.

## Persistent UI Surfaces (Current)

- Top strip: title/description + save/duplicate/share/export/reset
- Stepper strip with per-step buttons + back/continue controls
- Left panel: step-specific tools/catalog
- Right panel: scene quality, BOM, compatibility
- Bottom tool bar: place/move/rotate/delete/sculpt/hide guides (mode-dependent)
- Diagnostics footer: object/hardscape/plants counts + tool mode + substrate percentages

## Behavior Notes

- Cookie consent initially overlays right-side panel content.
- Step gating is present but not always obvious from first-time perspective.
- Camera and stage currently feel constrained and not fully user-owned.
- Interface remains information-dense during core creative actions.

## Screenshot Evidence

- Baseline Step 1 (choose tank):
  - `/Users/jacob/.openclaw/media/browser/a60819f6-3127-45b9-8be7-bb01ed4a3370.jpg`
- Baseline Step 2 (sculpt substrate):
  - `/Users/jacob/.openclaw/media/browser/b29dd64a-d625-4a02-8956-3b648e0042ae.jpg`
- Baseline Step 3 (hardscape place armed):
  - `/Users/jacob/.openclaw/media/browser/b72a3fd1-eea9-4de7-8e94-a5ce2cac664a.jpg`

## Repo Context Cross-Check

- Deployment/process model documented in `README.md` + `fly.toml`.
- Planning roadmap captured in root `TODO.md` (T001–T022).

## Exit Criteria Check (T001 DoD)

- [x] Baseline note exists
- [x] Current flow documented
- [x] Visible panels/surfaces documented
- [x] Step states and gating observations documented
- [x] Screenshots referenced
