# Visual Builder 3D Overhaul

## 1) Refactor Plan (Implemented)

### Module architecture
- `src/components/builder/VisualBuilderPage.tsx`
  - Reworked layout to viewport-first composition.
  - Keeps guided step flow, catalog/context overlays, BOM/compatibility/save/share controls.
  - Orchestrates scene tool modes and per-step UX actions.
- `src/components/builder/visual/VisualBuilderScene.tsx`
  - New R3F scene root and render loop hot path.
  - Implements cinematic camera, PBR-ish tank/water/substrate look, placement pipeline, hover/select feedback, substrate sculpting, and postprocessing.
- `src/components/builder/visual/scene-utils.ts`
  - Deterministic world/normalized transform helpers.
  - Placement/depth-zone math, collision radius estimation, substrate sampling/brush deformation/presets.
- `src/components/builder/visual/types.ts`
  - Extended visual scene schema for deterministic reconstruction and constraints metadata.

### State model changes
- `src/stores/visual-builder-store.ts`
  - Canvas state upgraded to version `3`.
  - Added scene settings (`qualityTier`, post FX toggle, guides toggle).
  - Added deterministic item metadata: `sku`, `variant`, `anchorType`, `depthZone`, `constraints`, `transform`.
  - Backward normalization from older payloads into v3.
- `src/server/trpc/routers/visual-builder.ts`
  - Server-side parser accepts legacy versions and normalizes to v3.
  - Save/load path preserves planner contracts while extending scene metadata.

### Rendering pipeline
- Web stack: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`.
- Lighting: ambient + hemisphere + key directional + fill/rim lights + HDR environment.
- Materials: glass/water/transmission-based tank shell, sculpted substrate mesh, category-specific hardscape/plant materials.
- Post FX: SSAO + bloom + vignette + noise + tone mapping (quality tier aware).
- Camera: step presets with smooth interpolation and optional review idle orbit.

## 2) Phased Implementation (A-D)

### Phase A: Camera/Lighting/Tank/Placement foundation
- Viewport-first UI architecture implemented.
- New cinematic camera preset system per step.
- Premium scene lighting, fog, reflections, soft shadows, and post-FX baseline.
- Ghost placement preview and initial validity feedback integrated.

### Phase B: Substrate sculpting + snapping + interaction polish
- Substrate sculpt tools: raise/lower/smooth/erode with adjustable brush/strength.
- Terrain presets: flat/island/slope/valley.
- Deterministic placement constraints and collision checks.
- Hover/select highlights and context-sensitive place/move/rotate/delete/sculpt tool behaviors.

### Phase C: Plants workflow
- Plant placement integrated into guided flow.
- Depth zone metadata and cluster brush placement behavior added.
- Surface/anchor-aware placement path retained through deterministic scene schema.

### Phase D: Postprocessing/performance/final polish
- Adaptive quality tiers (`auto/high/medium/low`) with graceful degradation.
- Effect disabling order favors preserving framerate on slower devices.
- E2E interactions stabilized for heavier scene runtime.

## 3) Definition of Done Checklist

### Looks premium (PBR + lighting + shadows)
- [x] Premium 3D tank scene with cinematic lighting and depth cues.
- [x] PBR-style/transmission materials for glass/water and improved substrate shading.
- [x] Environment reflections, soft shadows, haze/fog, and tasteful postprocessing.

### Feels like a game (smooth interactions + ghost preview + feedback)
- [x] Smooth orbit camera with step presets and transitions.
- [x] Ghost previews and placement validity feedback.
- [x] Surface-aware placement, snapping behavior, and interaction tool modes.
- [x] Hover/select scene feedback with step-focused controls.

### Works like a planner (BOM + compatibility + export/share)
- [x] BOM generation preserved.
- [x] Compatibility checks preserved and interactive toggles intact.
- [x] Save/share/export pathways preserved with backward-compatible state normalization.

### Runs smoothly with graceful degradation
- [x] Quality tier controls with runtime fallbacks.
- [x] Reduced expensive effects on lower tiers.
- [x] Verified via lint/typecheck/unit/API/E2E/build validation.

## Validation
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm exec vitest run tests/api/visual-builder.test.ts tests/builder/visual-compatibility.test.ts` ✅
- `pnpm exec playwright test tests/e2e/builder.spec.ts` ✅
- `pnpm build` ✅
