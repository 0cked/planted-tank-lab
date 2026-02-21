# Planted Tank Lab -- Execution Roadmap

> **North star:** Planted Tank Lab is the definitive planted aquarium planning platform -- a beautiful, interactive 3D aquascape builder where hobbyists design their dream tanks, get intelligent compatibility guidance, and purchase everything they need in one flow.

---

## MANDATORY SELF-CHECK (read this BEFORE every task)

**Before you start any task, ask yourself these three questions:**

1. **"When I finish, will a user visiting plantedtanklab.com see or experience something different?"** If no, STOP. You are about to waste time on internal tooling, process scaffolding, or documentation that nobody asked for. Go back to the task list and pick a task that changes the product.

2. **"Am I about to create a new file that isn't source code?"** If yes, STOP. You are falling into the planning trap. This project already has 34 planning documents, 6 ADRs, and a comprehensive review. No more are needed. The plans are done. Execute them.

3. **"Am I about to subdivide this task into smaller tasks, create a checklist, write a summary, or 'prepare' before coding?"** If yes, STOP. That is procrastination disguised as diligence. Open the source file. Make the change. Run the tests. Commit.

**The previous agent spent 48 hours producing 34 planning documents and polishing an internal diagnostics panel before making a single user-visible change.** That is the failure mode you must avoid. The plans exist. The architecture is decided. Your job is to write code that changes what users see.

---

## Definition of Done (every task must meet ALL of these)

1. `pnpm typecheck` passes
2. `pnpm test` passes
3. `pnpm lint` passes
4. **The production site would look or behave differently after deploying this change** (this is the critical one)
5. No new markdown files, planning docs, or diagnostic tooling were created

If you completed a task and #4 is false, you did not complete a task. Undo your work and pick the right task from the list below.

---

## Product Vision

- **Immersive, game-like feel.** The builder should feel like a creative tool, not a SaaS dashboard. Think terrarium-building sim, not Stripe settings page.
- **Viewport is hero.** The 3D scene dominates. Controls are minimal, contextual, and get out of the way.
- **Camera agency is non-negotiable.** Users orbit, pan, zoom freely. No snap-back. No implicit resets. Explicit intents only.
- **Substrate editing = preset + control-point dots.** Users pick a terrain preset (flat/island/slope/valley) then drag control-point dots to fine-tune. No Gaussian brush, no multi-material painting, no brush mode/size/strength sliders.
- **Real assets matter.** Placeholder geometry (cones, dodecahedrons) must be replaced with recognizable plants and hardscape.
- **`/inspiration-photos` in the workspace is the visual benchmark.** Compare against those, not against other web apps.

---

## Trap Patterns (the previous agent fell into ALL of these -- you must not)

| Trap | What it looks like | What to do instead |
|---|---|---|
| **Planning theater** | Creating a markdown doc "to clarify the approach" before writing code | The approach is already in the task description below. Start coding. |
| **Diagnostics addiction** | Adding logging, debug panels, evidence capture, scenario badges | Users don't see diagnostics. Write the feature, not the instrumentation. |
| **Task fragmentation** | Breaking P1-1 into 8 sub-tasks before starting any of them | Just start P1-1. If you hit a blocker, solve it inline. |
| **Process scaffolding** | Creating status reports, review templates, gate checklists, RACI matrices | Ship features. The only status update is a git commit. |
| **Codebase tourism** | Reading every file "to understand the architecture" before making a change | Read the 2-3 files the task mentions. Make the change. Read more only if stuck. |
| **Perfectionism stalling** | Refactoring adjacent code, adding types to unrelated functions, "improving" things not in the task | Do exactly what the task says. Nothing more. Move to the next task. |
| **Legacy investment** | Working on `BuilderPage.tsx` (the form-based builder) | `VisualBuilderPage.tsx` is the only builder that matters. Ignore the legacy one. |

---

## Architecture Context (for agents)

| Layer | Tech | Key files |
|---|---|---|
| Framework | Next.js 16 (App Router) | `next.config.ts`, `src/app/` |
| API | tRPC | `src/server/trpc/` |
| Database | Supabase Postgres + Drizzle | `src/server/db/schema.ts` |
| 3D | React Three Fiber + Three.js | `src/components/builder/visual/` |
| State | Zustand (persisted) | `src/stores/visual-builder-store.ts` |
| Auth | NextAuth | `src/server/auth.ts` |
| Deploy | Fly.io (Docker) | `fly.toml`, `Dockerfile` |
| Errors | Sentry | `src/server/observability/sentry.ts` |

**Big files that need decomposition:**
- `src/components/builder/VisualBuilderPage.tsx` (~2500 lines) -- camera diagnostics, UI, state, analytics all mixed
- `src/components/builder/visual/VisualBuilderScene.tsx` (~1100 lines) -- scene, camera rig, interactions, rendering
- `src/components/builder/BuilderPage.tsx` (~2500 lines) -- legacy form builder

**Key domain logic (well-tested, don't break):**
- `src/engine/evaluate.ts` -- compatibility rule engine (852 lines of tests)
- `src/server/ingestion/` -- data pipeline (1000+ lines of tests)
- `src/stores/visual-builder-store.ts` -- canvas state with migration logic

---

## Completed Planning Phase (archived)

T001-T036 produced 34 planning documents in `docs/refactor/`. Key artifacts for reference:
- `docs/refactor/camera-ux-spec.md` -- camera interaction contract
- `docs/refactor/substrate-ux-spec.md` -- node-grid editing spec
- `docs/refactor/experience-principles.md` -- 10 product principles
- `docs/refactor/acceptance-criteria-matrix.md` -- AC-01 through AC-18
- `docs/refactor/visual-spec-package.md` -- visual design tokens and specs
- `decisions/ADR-camera-control-architecture.md` -- camera ownership model
- `decisions/ADR-substrate-node-grid-architecture.md` -- heightfield node-grid

T037-T055 implemented camera ownership modes and diagnostics panel. The camera step/free model works. No more camera diagnostics work is needed.

---

## Active Roadmap

### Phase 0 -- Production Fixes (do these first, in order)

- [x] **P0-1: Remove test data from production**
  - The `/products` page shows "Vitest Overrides Category 1771049447928" to all users.
  - Find and delete this test category from the production database.
  - Add a filter in the products query to exclude categories with names containing "vitest" or "test" as a safety net.
  - Add test isolation: ensure `tests/server/admin-overrides.test.ts` creates AND cleans up test data reliably, or uses a separate test schema/prefix.
  - **Verify:** Visit `https://plantedtanklab.com/products` -- only real categories should appear.

- [x] **P0-2: Add CI testing before deploy**
  - Create `.github/workflows/ci.yml` that runs on pull requests to `main`:
    ```yaml
    steps: checkout, setup node/pnpm, pnpm install, pnpm lint, pnpm typecheck, pnpm test
    ```
  - Keep the existing `fly-deploy.yml` unchanged (deploys on push to main).
  - **Verify:** Open a PR with a type error -- CI should fail and block merge.

- [x] **P0-3: Gate diagnostics panel behind dev mode**
  - In `VisualBuilderPage.tsx`, wrap the entire camera diagnostics section (scene diagnostics toggle, scenario badges, evidence snapshot, all gate-review UI) in a condition:
    ```tsx
    {process.env.NODE_ENV === "development" && ( /* diagnostics UI */ )}
    ```
  - This removes hundreds of lines of internal tooling from production without deleting code.
  - **Verify:** Run `pnpm build && pnpm start`, visit `/builder` -- no diagnostics panel visible. Run `pnpm dev` -- diagnostics still available.

- [x] **P0-4: Fix camera controls**
  - In `VisualBuilderScene.tsx`, update OrbitControls:
    - `enablePan={true}` (was `false` -- users need to pan for composition)
    - `dampingFactor={0.18}` (was `0.08` -- too sluggish)
    - `maxPolarAngle={Math.PI * 0.55}` (was `Math.PI * 0.48` -- let users look more steeply into the tank)
  - **Verify:** In the builder, orbit the camera, then pan (right-click drag or two-finger drag). Camera should move smoothly. Looking down into the tank from above should work at steeper angles.

- [x] **P0-5: Fix meta tags**
  - Fix duplicate site name in title: Products page shows "Products | PlantedTankLab | PlantedTankLab". Same bug on Builds page.
  - Add page-specific `og:url` per route (currently hardcoded to root on all pages).
  - Add unique title/description for `/builder` (currently inherits generic site metadata).
  - **Verify:** View page source on `/products`, `/builds`, `/builder` -- each should have a unique `<title>` and correct `og:url`.

### Phase 1 -- Substrate Node-Grid (highest-impact feature)

- [x] **P1-1: Implement heightfield data model**
  - Replace the 7-parameter `VisualSubstrateProfile` with a `Float32Array` heightfield grid (32x32 = 1024 values).
  - Add a `SubstrateHeightfield` type to `src/components/builder/visual/types.ts`.
  - Update `visual-builder-store.ts` to store the heightfield in canvas state.
  - Write a migration in the store's `migrate` function that converts old `VisualSubstrateProfile` data to a heightfield by sampling the existing interpolation function at each grid point.
  - The existing presets (flat, island, slope, valley) should generate heightfield grids instead of setting 7 parameters.
  - **Verify:** Existing saved builds load without errors. New builds start with a flat heightfield. Store migration test passes.

- [x] **P1-2: Implement per-vertex mesh updates**
  - Update `VisualBuilderScene.tsx` substrate geometry generation to read from the heightfield grid instead of `sampleSubstrateDepth`.
  - Use `BufferGeometry` with a position attribute that maps grid values to vertex Y positions.
  - On heightfield change, update only the affected vertex positions and recompute normals (don't rebuild the entire geometry).
  - Keep quality-tier-dependent resolution: low=24x24, medium=32x32, high=48x48 (interpolate from the 32x32 source grid).
  - **Verify:** Substrate renders correctly. Smooth normals. No visual regression from current implementation.

- [x] **P1-3: Implement Gaussian brush editing**
  - Replace `applySubstrateBrush` in `scene-utils.ts` with a function that modifies individual heightfield grid cells.
  - Brush applies a Gaussian falloff: `delta * exp(-distance^2 / (2 * radius^2))` to each grid cell within the brush radius.
  - Keep the four modes: raise, lower, smooth, erode.
  - Smooth mode: blend each cell toward the average of its 4-neighbors weighted by brush strength.
  - Erode mode: lower + slight smoothing for natural erosion feel.
  - Brush size and strength sliders in the UI remain as-is.
  - **Verify:** Paint a localized mound on the left side of the tank. The right side should be unaffected. This is the key test -- the old system couldn't do this.

- [x] **P1-4: Implement substrate undo/redo**
  - Add a stroke-level undo stack to the visual builder store.
  - Each `pointerDown` -> `pointerUp` sculpting sequence is one transaction.
  - Store the heightfield delta (diff) for each stroke, not the full grid snapshot.
  - Undo reverts the last stroke. Redo reapplies it.
  - Keyboard shortcuts: Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z for redo.
  - Cap the undo stack at 30 entries.
  - **Verify:** Sculpt 3 strokes. Undo twice. The first stroke's shape should be visible. Redo once. Two strokes visible.

### Phase 2 -- 3D Asset System & Procedural Geometry

> **Note:** Real GLB models (plants, rocks, wood) will be provided by Jacob later. Do NOT block on external assets. Build the systems and procedural placeholders first — real models drop in via the manifest when ready.

- [x] **P2-1: Build GLTF asset loader and manifest system**
  - Create `src/components/builder/visual/AssetLoader.tsx` using `useGLTF` from `@react-three/drei` with Suspense.
  - Create `public/visual-assets/manifest.json` mapping asset IDs to file paths, category (plant/rock/wood), default scale, placement zone, and triangle count.
  - Create `src/components/builder/visual/useAsset.ts` hook: looks up asset ID in manifest, loads GLB if available, falls back to current procedural geometry (cone/dodecahedron/capsule) if the GLB is missing or fails.
  - For plants with the same species, use `InstancedMesh` to batch draw calls.
  - Keep the existing plant sway animation — apply subtle sine rotation to loaded models too.
  - **Verify:** Builder still works identically with no GLB files present (procedural fallback). Add a test GLB to the manifest — it loads and renders.

- [x] **P2-2: Procedural plant geometry**
  - Replace the colored cones with parametric plant meshes generated in code (no external files needed).
  - Create `src/components/builder/visual/ProceduralPlants.tsx` with 5 generators:
    - **Rosette** (sword/crypt): radial leaf arrangement using elongated ellipsoid geometries fanning from a central point.
    - **Stem plant**: vertical cylinder stalk with pairs of flat leaf planes at intervals, slight random rotation per pair.
    - **Moss**: cluster of small irregular spheres/blobs using icosahedron geometry with vertex noise displacement.
    - **Carpet plant**: low flat disc of tiny leaf planes tiled in a grid with slight Y jitter.
    - **Floating plant**: flat disc with radial leaf shapes on the water surface plane.
  - Each generator takes a `seed` number for deterministic variation (so same plant ID always looks the same but different IDs look different).
  - Use vertex colors or simple material colors matching real plant greens (vary hue slightly per species).
  - Register these as the fallback geometries in the asset manifest system (P2-1) so they display when no GLB is available.
  - **Verify:** Place each plant type in the builder. They should be visually distinguishable and recognizably plant-like — not cones.

- [x] **P2-3: Procedural hardscape geometry**
  - Replace dodecahedrons/capsules with parametric rock and wood meshes generated in code.
  - Create `src/components/builder/visual/ProceduralHardscape.tsx` with generators:
    - **Rock**: start with icosahedron geometry, displace vertices using 3D simplex noise scaled by a roughness parameter. 3 variants via different noise seeds/scales (rounded boulder, jagged seiryu-style, flat slate).
    - **Driftwood**: start with a tapered cylinder, apply twist via vertex shader or CPU vertex manipulation, add 2-3 branch offshoots as smaller twisted cylinders. 2 variants (spiderwood-style branchy, manzanita-style flowing).
  - Use earthy material colors (grays/browns) with slight vertex color variation for natural look.
  - Register as fallback geometries in the asset manifest.
  - **Verify:** Place rocks and wood in the builder. They should look like rocks and wood, not geometric primitives.

- [x] **P2-4: Asset hot-swap and preloading**
  - When a GLB file is added to `public/visual-assets/` and registered in `manifest.json`, it should automatically replace the procedural fallback — no code changes needed.
  - Add `useGLTF.preload()` calls for all assets in the current build's item list (preload on builder mount, not on place).
  - Add a loading progress indicator in the 3D scene (small spinner or progress bar) while assets load.
  - **Verify:** Add a test GLB to the manifest for one plant type. That plant renders as the GLB model while others still use procedural geometry. Remove the GLB — it falls back to procedural without errors.

### Phase 3 -- Builder UX Consolidation

- [x] **P3-1: Decompose VisualBuilderPage.tsx**
  - Extract these into separate files:
    - `src/components/builder/visual/SubstrateToolbar.tsx` -- sculpt mode selector, brush size/strength, presets
    - `src/components/builder/visual/BuildMetadataPanel.tsx` -- build name, description, save/share/export actions
    - `src/components/builder/visual/BOMSidebar.tsx` -- bill of materials with pricing
    - `src/components/builder/visual/QualitySettings.tsx` -- scene quality tier selector
    - `src/hooks/useCameraEvidence.ts` -- all camera diagnostics state (dev-only)
  - `VisualBuilderPage.tsx` should orchestrate these components and be under 600 lines.
  - **Verify:** All builder functionality works identically. `pnpm typecheck` passes. No visual regressions.

- [x] **P3-2: Add touch gesture support**
  - OrbitControls from drei already supports touch by default. Verify it works on mobile/tablet.
  - Add touch-friendly hit targets for toolbar buttons (minimum 44x44px tap targets).
  - Test substrate sculpting with touch (pointer events should work but verify).
  - Add a simple responsive layout: on viewports <768px, move the workflow stepper to the bottom and stack panels vertically.
  - **Verify:** Open the builder on an iPad or phone emulator. Orbit, pan, zoom with touch. Tap to place items. Sculpt substrate with finger drag.

- [x] **P3-3: Build screenshot thumbnails**
  - When a user saves or shares a build, capture the current 3D scene as a PNG using the existing `preserveDrawingBuffer` canvas.
  - Store the screenshot as the build's thumbnail (upload to Supabase storage or encode as base64 in the build record).
  - Display thumbnails on the `/builds` gallery page instead of text-only cards.
  - Use the screenshot as the `og:image` for shared build URLs.
  - **Verify:** Save a build. Visit `/builds`. The build card shows a 3D scene screenshot. Share the build URL on a social platform preview tool -- the screenshot appears.

### Phase 4 -- Community & Growth

- [x] **P4-1: Build remix/fork feature**
  - On any shared build page (`/builder/[shareSlug]`), add an "Open in builder" or "Remix" button.
  - Clicking it loads the build's canvas state into a new unsaved build in the visual builder.
  - The remixed build should be independent (changes don't affect the original).
  - **Verify:** View a shared build. Click Remix. Make changes. Save as a new build. Original build is unchanged.

- [x] **P4-2: Add build voting**
  - Logged-in users can upvote builds on the `/builds` page.
  - Add a `build_votes` table to the Drizzle schema (user_id + build_id, unique constraint). Run migration.
  - Add a tRPC mutation `builds.vote` and query `builds.getVotes`.
  - Sort builds by vote count (descending) by default on the `/builds` page.
  - Show vote count on each build card with an upvote button (heart or arrow icon).
  - **Verify:** Log in. Upvote a build. Refresh the page. Vote persists. Vote count updates. Cannot vote twice.

- [x] **P4-3: Homepage content expansion**
  - Add a "How it works" section below the hero with 3 steps (Pick your gear -> Check compatibility -> Share your build). Use icons or simple illustrations (CSS/SVG, not external images).
  - Add a "Featured builds" row pulling the top 3 voted builds with their screenshot thumbnails (depends on P3-3 and P4-2, but can use placeholder cards if those aren't done yet).
  - Add a "Browse plants" preview row showing 6 popular plants with images from the existing plant data.
  - Add a "Start building" CTA section at the bottom linking to `/builder`.
  - **Verify:** Homepage has meaningful content below the fold. Content sections render correctly. Links work.

- [x] **P4-4: Build comments**
  - Add a `build_comments` table (id, build_id, user_id, body text, created_at, parent_id for threading). Run migration.
  - Add tRPC routes: `builds.addComment`, `builds.listComments`.
  - On the shared build page (`/builds/[shareSlug]`), add a comments section below the build.
  - Show commenter name, timestamp, and body. Support one level of reply threading (parent_id).
  - Only authenticated users can comment. Show a "sign in to comment" prompt for guests.
  - **Verify:** Log in, view a shared build, post a comment. Refresh — comment persists. Reply to a comment — reply appears nested.

- [x] **P4-5: User profile page**
  - On `/profile`, show the user's display name, join date, and a grid of their saved builds (with thumbnails if P3-3 is done, otherwise text cards).
  - Add a public profile route `/profile/[userId]` showing the same info for any user.
  - Show vote count and build count as stats.
  - **Verify:** Visit `/profile` while logged in — see your builds. Visit another user's profile — see their public builds.

- [x] **P4-6: Build tags and filtering**
  - Add a `build_tags` table (build_id, tag slug). Predefined tag set: iwagumi, dutch, nature, jungle, nano, low-tech, high-tech, shrimp, paludarium.
  - When saving a build, show a tag picker (multi-select from the predefined list).
  - On `/builds`, add tag filter chips at the top. Clicking a tag filters the gallery.
  - Store selected tags in URL query params (`?tag=iwagumi`).
  - **Verify:** Save a build with tags. Visit `/builds`. Filter by tag — only matching builds appear.

- [x] **P4-7: Build search**
  - On `/builds`, add a search bar that filters builds by name, description, and equipment names.
  - Use a simple `ILIKE` query on the builds table (no full-text search engine needed yet).
  - Combine with tag filters (P4-6) — search + tag work together.
  - Add sort options: newest, most voted, most items, alphabetical.
  - **Verify:** Create builds with distinct names. Search by name — correct results appear. Sort by votes — order changes.

### Phase 5 -- Scene Visual Polish

> **All code-only tasks.** No external assets needed — these are shaders, materials, and rendering improvements.

- [x] **P5-1: Water surface shader**
  - Add a semi-transparent animated water surface plane at the tank's water line height.
  - Use a custom `ShaderMaterial` with scrolling normal map (generate procedurally from 2D simplex noise baked to a DataTexture).
  - The surface should have slight opacity (~0.3), blue-green tint, and gentle wave animation via vertex displacement.
  - Water plane should not obstruct item selection (set `raycast` to null or use a separate interaction layer).
  - **Verify:** Water surface visible in the builder. Gently animates. Items below water are visible through it. Clicking items through water still works.

- [x] **P5-2: Glass tank walls**
  - Render the tank walls as transparent glass using `MeshPhysicalMaterial` with `transmission: 0.9`, `roughness: 0.05`, `thickness: 0.3`.
  - Only render the back and side walls (front is open for visibility). Use `BackSide` rendering for the interior faces.
  - Add subtle edge highlights (Fresnel effect via the built-in `MeshPhysicalMaterial` IOR).
  - Toggle glass walls on/off in the quality settings (off by default on low quality tier).
  - **Verify:** Tank walls visible as transparent glass. Scene items visible through walls. Toggling quality setting hides/shows walls.

- [x] **P5-3: Environment and backdrop**
  - Add a simple gradient background behind the tank (dark blue-gray at top to lighter at bottom) using a `<color>` or fullscreen quad.
  - Add a subtle floor plane below the tank (soft shadow receiver, dark material) to ground the scene.
  - Add soft ambient lighting + one directional light from above-front to simulate room lighting.
  - **Verify:** Scene has visual depth. Tank doesn't float in a void. Lighting looks natural.

- [x] **P5-4: Caustic light patterns**
  - Project animated caustic light patterns onto the substrate surface.
  - Generate a caustic texture procedurally: tile 2-3 layers of scrolling Voronoi noise in a `DataTexture`, update each frame.
  - Apply as a projected light texture using a `SpotLight` with a `map` property, or multiply into the substrate material's emissive channel.
  - Intensity should be subtle — accent, not distraction. Reduce on low quality tier.
  - **Verify:** Moving light patterns visible on the substrate, reminiscent of real aquarium caustics. Subtle and pleasant.

- [x] **P5-5: Post-processing pipeline**
  - Add `@react-three/postprocessing` (or use drei's `EffectComposer`).
  - Enable: subtle bloom (threshold: 0.8, intensity: 0.3) for specular highlights on water and glass, tone mapping (ACES filmic), and mild vignette.
  - Gate behind quality setting: no post-processing on low tier, bloom-only on medium, full on high.
  - Ensure post-processing doesn't break screenshot capture (P3-3).
  - **Verify:** Scene looks richer with post-processing on high quality. No visual artifacts. Toggle quality tier — effects scale appropriately.

- [x] **P5-6: Ambient particles**
  - Add floating particles in the water volume (subtle, slow-moving specks like real aquarium debris/microorganisms).
  - Use a `Points` geometry with ~200 points randomly distributed within the tank bounds.
  - Animate with slow upward drift + slight sine wobble. Recycle particles that leave bounds.
  - Semi-transparent, tiny (1-2px), white/pale green.
  - Toggle on/off with a scene setting. Off on low quality tier.
  - **Verify:** Tiny particles floating in the water. Adds life to the scene without being distracting.

### Phase 6 -- Builder Power Features

- [x] **P6-1: Keyboard shortcuts**
  - Add keyboard shortcuts to the builder (listen on the builder page, not globally):
    - `Delete` / `Backspace`: remove selected item
    - `D`: duplicate selected item (place copy offset by 1 inch)
    - `R`: rotate selected item 45 degrees
    - `Escape`: deselect
    - `1-5`: switch workflow steps
    - `B`: toggle substrate brush mode
  - Show a small "?" button in the builder that opens a shortcuts overlay.
  - **Verify:** Select an item, press Delete — it's removed. Press D — duplicate appears. Press ? — shortcuts list shown.

- [x] **P6-2: Item rotation and scale handles**
  - When an item is selected in the 3D scene, show a rotation ring (Y-axis only — plants don't tip sideways) and scale handles.
  - Rotation ring: a torus around the item's base. Drag to rotate freely.
  - Scale: two small spheres on opposite sides. Drag outward to scale up, inward to scale down. Uniform scale only.
  - Store rotation (Y radians) and scale (uniform float) in the canvas item state.
  - **Verify:** Select a plant. Drag the rotation ring — it spins. Drag the scale handle — it grows/shrinks. Save and reload — transforms persist.

- [x] **P6-3: Multi-select and group operations**
  - Shift+click to add/remove items from selection. Show selection highlight (outline or glow) on all selected items.
  - When multiple items selected: Delete removes all, D duplicates all (maintaining relative positions), drag moves all together.
  - Add a "Select all" (Ctrl+A) and "Deselect all" (Escape) shortcut.
  - **Verify:** Shift+click 3 plants. Press D — all 3 duplicated. Drag one — all 3 move. Delete — all 3 removed.

- [x] **P6-4: Snap-to-grid placement**
  - Add a toggleable grid overlay on the substrate surface (1-inch grid lines).
  - When grid snap is on, items placed via click snap to the nearest grid intersection.
  - Grid visibility toggle: small button in the builder toolbar.
  - Grid uses a `GridHelper` from Three.js or a custom shader on the substrate.
  - **Verify:** Toggle grid on — grid lines visible on substrate. Place an item — it snaps to the nearest grid point. Toggle off — free placement.

- [x] **P6-5: Item inventory sidebar**
  - Add a collapsible sidebar panel listing all items currently placed in the build.
  - Each row: item name, small icon/thumbnail, quantity (if duplicated species), and a click-to-select action.
  - Clicking a row selects that item in the 3D scene and orbits the camera to frame it.
  - Show a "remove" button per row.
  - Sort by placement order (most recent first) or alphabetically.
  - **Verify:** Place 5 items. Open sidebar — all 5 listed. Click a row — item highlights in scene. Remove via sidebar — item disappears.

- [x] **P6-6: Measurement overlay**
  - Display tank dimensions as floating labels in the 3D scene: width, height, depth in inches (and cm toggle).
  - Show dimension lines along the tank edges (thin lines with end caps and text labels, similar to CAD dimension annotations).
  - Toggle on/off via a toolbar button. Off by default.
  - Use drei's `Html` component for text labels positioned at tank edges.
  - **Verify:** Toggle measurements on — dimension labels appear along tank edges showing correct measurements. Toggle off — labels disappear.

- [x] **P6-7: Build templates**
  - Add 3-5 starter templates that pre-populate a build with curated items and substrate:
    - "Low-tech beginner" (anubias, java fern, simple substrate)
    - "Nature Aquarium" (stem plants, rocks, sloped substrate)
    - "Iwagumi" (carpet plant, dragon stone arrangement, flat substrate with mound)
    - "Dutch style" (many stem plant species, no hardscape, terraced substrate)
    - "Nano tank" (small tank dimensions, moss, shrimp-safe)
  - Show templates as cards on the first workflow step (tank selection) with a "Use template" button.
  - Loading a template replaces the current canvas state (with a confirmation dialog if the current build has items).
  - **Verify:** Click a template — build populates with pre-placed items and substrate. Modify and save as your own build.

### Phase 7 -- Calculators & Tools

> **Standalone utility pages that drive organic search traffic and provide value even for non-builder users.**

- [x] **P7-1: Substrate volume calculator**
  - Create `/tools/substrate-calculator` page.
  - Inputs: tank length, width (inches or cm), desired substrate depth at front and back.
  - Calculate: volume in liters and pounds for common substrate types (aquasoil, sand, gravel) using known densities.
  - Show a simple side-view SVG diagram of the tank cross-section with the substrate slope.
  - Add SEO metadata: "Aquarium Substrate Calculator - How Much Substrate Do I Need?"
  - **Verify:** Enter 36x18 tank, 1" front / 3" back. Calculator shows correct volume. Diagram updates.

- [x] **P7-2: CO2 calculator**
  - Create `/tools/co2-calculator` page.
  - Inputs: tank volume (gallons or liters), desired CO2 level (ppm), KH (carbonate hardness).
  - Output: pH target from CO2/KH/pH table, suggested bubble rate, estimated CO2 consumption (g/day).
  - Include a reference table showing the CO2/KH/pH relationship.
  - Add a link to CO2 equipment on the `/products` page.
  - **Verify:** Enter 20 gallon, 30ppm CO2, 4 KH. Calculator shows correct pH target (~6.6) and consumption estimate.

- [x] **P7-3: Lighting calculator (PAR estimator)**
  - Create `/tools/lighting-calculator` page.
  - Inputs: light wattage, tank depth, light type (LED/T5/T8), mounting height above water.
  - Output: estimated PAR at substrate level using simplified inverse-square + absorption model.
  - Show plant requirement zones: low light (<40 PAR), medium (40-80), high (80+).
  - Classify result as "suitable for low-tech", "medium", or "high-tech" setups.
  - **Verify:** Enter a 30W LED at 18" depth. Calculator shows estimated PAR and light category.

- [x] **P7-4: Fertilizer dosing calculator**
  - Create `/tools/fertilizer-calculator` page.
  - Support two methods: EI (Estimative Index) and PPS-Pro.
  - Inputs: tank volume, dosing method.
  - Output: weekly dosing schedule for KNO3, KH2PO4, K2SO4, and CSM+B trace mix.
  - Show amounts in teaspoons and grams. Include a printable/copyable weekly schedule.
  - **Verify:** Enter 40 gallon tank, EI method. Calculator shows correct daily/weekly doses matching known EI targets.

- [x] **P7-5: Stocking calculator**
  - Create `/tools/stocking-calculator` page.
  - Inputs: tank volume, selected fish/shrimp species (from a predefined list of 30-40 common species with bioload ratings).
  - Output: stocking level as a percentage (0-100%+), with green/yellow/red indicator.
  - Use the classic "1 inch per gallon" as a baseline with species-specific modifiers (active swimmers need more space, bottom dwellers less).
  - Warn when incompatible species are combined (e.g., shrimp + aggressive fish).
  - **Verify:** Add 10 neon tetras to a 20 gallon tank — shows ~40% stocked (green). Add 5 more large fish — goes to yellow/red.

- [x] **P7-6: Tools index page**
  - Create `/tools` page listing all calculators with descriptions and icons.
  - Each tool card links to its page.
  - Add to the main navigation (between Products and Builds).
  - Add structured data (JSON-LD `WebApplication` schema) for each tool for SEO.
  - **Verify:** Visit `/tools` — all calculators listed. Click each — navigates correctly. Nav menu shows Tools link.

### Phase 8 -- E-commerce Enhancement

- [x] **P8-1: Shopping list export**
  - On the builder's BOM (bill of materials) panel, add an "Export shopping list" button.
  - Generate a formatted text list: item name, category, best price, retailer, and affiliate link.
  - Support copy-to-clipboard and download as .txt.
  - Include total estimated cost at the bottom.
  - **Verify:** Build a tank with 5 items. Click export. Clipboard contains formatted shopping list with prices and links.

- [x] **P8-2: Price comparison improvements**
  - On product detail pages (`/products/[category]/[slug]`), show all available offers in a comparison table: retailer name, price, shipping info, last updated date.
  - Highlight the best price. Show price history spark chart using the `price_history` table data (small inline SVG, no charting library needed).
  - Add an "Out of stock" indicator when a retailer has no current offer.
  - **Verify:** View a product with multiple offers. Comparison table shows all retailers. Price spark chart renders.

- [x] **P8-3: "Buy this build" flow**
  - On shared build pages and the builder BOM, add a "Buy all items" button.
  - Show a modal with all items, selected retailer per item (defaulting to cheapest), and total cost.
  - "Open all links" button opens each retailer's affiliate link in a new tab.
  - Track the click event in `offer_clicks` for each item.
  - **Verify:** View a build with 4 items. Click "Buy all." Modal shows items with prices. "Open all links" opens 4 tabs.

- [x] **P8-4: Price alerts**
  - Add a `price_alerts` table (user_id, product_id, target_price, active, last_notified_at). Run migration.
  - On product pages, add a "Set price alert" button for logged-in users. Enter target price.
  - Create a tRPC route to check alerts: query products where current best offer < target price and last_notified_at is null or >24h ago.
  - For now, just mark alerts as "triggered" in the database and show them on the user's profile page. Email notifications can come later.
  - **Verify:** Set a price alert for $20 on a product. If the product's best offer drops below $20, alert shows as triggered on profile.

### Phase 9 -- Performance & Polish

- [x] **P9-1: Code splitting for 3D builder**
  - The 3D builder (React Three Fiber, Three.js, drei) is a large JS bundle. Lazy-load it with `next/dynamic` and `{ ssr: false }`.
  - Create a loading skeleton for `/builder` that shows while the 3D code loads (tank outline placeholder, toolbar skeleton).
  - Ensure the non-builder pages (home, products, plants, builds, tools) don't load any Three.js code.
  - **Verify:** Load `/products` — check network tab, no Three.js bundles loaded. Navigate to `/builder` — loading skeleton appears, then 3D scene loads.

- [x] **P9-2: Skeleton loading states**
  - Add skeleton loading states to the main content pages:
    - `/plants`: skeleton grid of plant cards (gray rectangles pulsing).
    - `/products`: skeleton category grid.
    - `/products/[category]`: skeleton product list.
    - `/builds`: skeleton build card grid.
  - Use CSS `@keyframes` pulse animation, not a library. Match the existing card dimensions.
  - **Verify:** Throttle network to 3G in dev tools. Navigate to `/plants` — skeleton appears before data loads. No flash of empty content.

- [x] **P9-3: Error boundaries with recovery**
  - Add React error boundaries to:
    - The 3D scene (catch Three.js/WebGL crashes — show "Scene failed to load" with a "Reload" button).
    - Each page's data-fetching section (catch tRPC errors — show "Failed to load" with retry).
  - Create a reusable `ErrorBoundary` component in `src/components/ui/ErrorBoundary.tsx`.
  - The builder should never white-screen. If the 3D scene crashes, the toolbar and sidebar should still be usable.
  - **Verify:** Intentionally break a tRPC call in dev — error boundary catches it and shows recovery UI. Builder scene error doesn't crash the whole page.

- [x] **P9-4: SEO structured data**
  - Add JSON-LD structured data to key pages:
    - `/plants/[slug]`: `Product` schema with name, image, description.
    - `/products/[category]/[slug]`: `Product` schema with offers (price, retailer, availability).
    - `/builds/[shareSlug]`: `CreativeWork` schema with name, author, description.
    - `/tools/*`: `WebApplication` schema with name and description.
  - Use `<script type="application/ld+json">` in the page metadata.
  - **Verify:** View page source on a plant page — JSON-LD block present and valid. Test with Google's Rich Results Test tool.

- [x] **P9-5: Accessibility audit and fixes**
  - Audit and fix keyboard navigation:
    - All interactive elements reachable via Tab.
    - Toolbar buttons have `aria-label` attributes.
    - Modals trap focus and close with Escape.
    - Color contrast meets WCAG AA (4.5:1 for text).
  - Add `role` and `aria` attributes to the builder's non-standard UI (custom sliders, color pickers, toolbar).
  - Ensure all images have `alt` text (plant images, product images).
  - **Verify:** Navigate the entire builder using only keyboard. Screen reader announces all controls meaningfully. No contrast failures on key UI.

- [x] **P9-6: PWA offline support**
  - Add a service worker using `next-pwa` or manual Workbox configuration.
  - Cache strategy: network-first for API calls, cache-first for static assets (JS, CSS, images).
  - When offline, show cached pages with a subtle "You're offline — some data may be outdated" banner.
  - The builder should work fully offline with localStorage-persisted state (it already uses localStorage).
  - **Verify:** Load the app. Go offline (airplane mode). Navigate to `/builder` — it works. Navigate to `/plants` — cached data shown. Banner indicates offline state.

### Phase 10 -- Advanced Simulation & Visualization

> **High-impact features that make Planted Tank Lab uniquely valuable — no other aquascaping tool offers these.**

- [x] **P10-1: Lighting PAR distribution heatmap**
  - In the builder, add a "Light simulation" toggle that overlays a color heatmap on the substrate.
  - Input: the selected light fixture's wattage and type (from the build's selected products), tank depth, mounting height (new field in scene settings).
  - Calculate PAR at each substrate grid point using simplified inverse-square with depth absorption: `PAR = (watts * efficiency) / (4π * distance²) * exp(-absorption * depth)`.
  - Render as a color overlay on the substrate mesh: blue (low <30 PAR) → green (30-60) → yellow (60-100) → red (100+).
  - **Verify:** Select a light in the builder. Toggle simulation — heatmap appears showing PAR distribution. Areas directly under the light are brightest.

- [x] **P10-2: Plant growth projection**
  - Add a "Growth timeline" slider (1 month / 3 months / 6 months) to the builder toolbar.
  - For each placed plant, scale its size over time based on growth rate data from the `plants` table.
  - Fast growers (stem plants) scale 2-3x at 6 months. Slow growers (anubias) scale 1.2x.
  - Carpet plants expand their footprint (scale XZ more than Y).
  - Stem plants grow taller (scale Y more than XZ).
  - Show a subtle timeline scrubber in the toolbar.
  - **Verify:** Place a stem plant and a carpet plant. Drag slider to 6 months — stem plant is much taller, carpet has spread. Back to 1 month — smaller.

- [x] **P10-3: Multi-material substrate zones**
  - Allow the substrate to have multiple material zones (e.g., dark aquasoil in the back, light sand in the front).
  - Add a "material" brush mode alongside raise/lower/smooth/erode. Material options: soil (dark brown), sand (tan), gravel (gray).
  - Store material assignment per heightfield cell as a second grid (Uint8Array, 32x32, values 0-2 mapping to material types).
  - Render using vertex colors on the substrate mesh, blending at zone boundaries.
  - **Verify:** Paint the back half as soil (dark) and front as sand (light). Boundary blends smoothly. Save and reload — materials persist.

- [x] **P10-4: Tank dimension customizer**
  - Replace the current fixed tank size presets with a custom dimension input.
  - Three sliders or number inputs: width, height, depth (in inches, with cm conversion).
  - Common presets as quick-select buttons: 10g (20x10x12), 20g Long (30x12x12), 29g (30x12x18), 40B (36x18x16), 55g (48x13x21), 75g (48x18x21).
  - Changing dimensions live-updates the 3D tank geometry, substrate, and camera framing.
  - Store custom dimensions in the canvas state.
  - **Verify:** Enter custom dimensions 40x20x16. Tank geometry updates. Select "20g Long" preset — dimensions change to 30x12x12. Save and reload — custom dimensions persist.

- [x] **P10-5: Equipment visualization**
  - Add simple 3D representations of equipment in the scene:
    - **Filter**: small box on the back wall with a subtle "flow" particle stream (10-20 particles animating in an arc).
    - **Light fixture**: flat rectangle hovering above the tank at configurable height.
    - **CO2 diffuser**: small cylinder on the back wall with rising bubble particles.
    - **Heater**: vertical cylinder on a side wall.
  - Equipment auto-appears when the corresponding product category is selected in the build.
  - Use simple procedural geometry (boxes, cylinders) — not GLB models.
  - **Verify:** Select a filter product in the builder. A box with flow particles appears on the back wall. Select a light — rectangle above the tank.

### Phase 11 -- Plant Encyclopedia & Content

> **Content-rich pages that drive organic SEO traffic and establish authority in the planted tank niche.**

- [x] **P11-1: Plant care guide pages**
  - On each plant detail page (`/plants/[slug]`), add a structured care guide section below the existing info.
  - Pull data from the `plants` table fields (difficulty, light, co2, placement, growth_rate, etc.) and render as a visual care card: parameter name, value, and a colored indicator bar (green = easy, yellow = moderate, red = demanding).
  - Add a "Compatible with" section listing equipment categories that match the plant's requirements (e.g., high-light plants → link to high-output LED lights).
  - **Verify:** Visit a plant page. Care guide section shows structured parameters with visual indicators. Equipment links work.

- [x] **P11-2: Plant comparison tool**
  - Create `/plants/compare` page.
  - Users select 2-4 plants via search/autocomplete. Display a side-by-side comparison table: light, CO2, difficulty, growth rate, placement, size, propagation method.
  - Highlight differences in red/green (easier vs harder parameters).
  - Shareable URL with plant slugs as query params (`?plants=anubias-nana,java-fern`).
  - **Verify:** Select 3 plants. Comparison table renders with all parameters. Share URL — comparison loads from URL params.

- [x] **P11-3: Plant placement guide**
  - Create `/guides/plant-placement` page.
  - Interactive SVG diagram of a tank cross-section showing foreground, midground, and background zones.
  - Each zone lists recommended plants (pulled from `plants` table filtered by `placement` field).
  - Clicking a plant name links to its detail page.
  - Add SEO metadata: "Planted Aquarium Layout Guide - Where to Place Your Plants."
  - **Verify:** Page shows tank diagram with labeled zones. Each zone lists appropriate plants. Links work.

- [x] **P11-4: Beginner's planted tank guide**
  - Create `/guides/beginners-guide` page.
  - Sections: What is a planted tank?, Essential equipment (with links to /products categories), Choosing your first plants (link to /plants filtered by difficulty=easy), Setting up the tank (step by step), The nitrogen cycle, First month care schedule.
  - Use the project's existing design system. No external images needed — use CSS illustrations or emoji for visual breaks.
  - Internal links to products, plants, and tools throughout.
  - **Verify:** Guide page renders with all sections. Internal links navigate correctly. Page has proper SEO metadata.

- [x] **P11-5: Aquascaping styles guide**
  - Create `/guides/aquascaping-styles` page.
  - Cover 5 styles: Nature Aquarium (Amano), Dutch, Iwagumi, Jungle, and Walstad/Low-tech.
  - Each style section: description, key characteristics, recommended plants, recommended hardscape, example tank dimensions, difficulty rating.
  - Link each style to its build tag (P4-6) so users can browse builds in that style.
  - **Verify:** Styles page renders with all 5 styles. Links to build tags and plants work.

- [x] **P11-6: Glossary page**
  - Create `/guides/glossary` page.
  - Define 40-50 common planted tank terms: PAR, photoperiod, KH, GH, TDS, EI dosing, dry start method, carpet plant, rhizome, runner, emersed/submersed, algae types (BBA, GSA, GDA, staghorn), etc.
  - Alphabetically sorted with anchor links for each letter.
  - Terms that correspond to tools or pages should link to them (e.g., "PAR" links to lighting calculator).
  - **Verify:** Glossary page renders with all terms. Anchor navigation works. Cross-links to tools and guides work.

### Phase 12 -- Builder Advanced Features

- [x] **P12-1: Undo/redo for all builder actions**
  - Extend the substrate undo system (P1-4) to cover ALL builder actions: item placement, item removal, item move, item rotation/scale, tank size change.
  - Use a command pattern: each action creates an undoable command object with `execute()` and `undo()` methods.
  - Store commands in a single undo stack (shared with substrate strokes).
  - Keyboard shortcuts: Cmd+Z / Ctrl+Z for undo, Cmd+Shift+Z / Ctrl+Shift+Z for redo.
  - **Verify:** Place 3 items, move one, delete one. Undo 3 times — all actions reversed in order. Redo twice — actions replayed.

- [x] **P12-2: Build versioning**
  - When a user saves a build, store a version snapshot (increment version number, store previous canvas state).
  - Add a `build_versions` table (build_id, version_number, canvas_state JSON, created_at). Run migration.
  - On the build detail page, show version history with timestamps. Clicking a version loads it into a read-only preview.
  - Add a "Restore this version" button that creates a new version with the old state.
  - **Verify:** Save a build 3 times with changes. Version history shows 3 entries. Click an old version — preview loads. Restore — build reverts.

- [ ] **P12-3: Build export as image**
  - Add an "Export as image" button to the builder toolbar.
  - Capture the 3D scene at high resolution (2x canvas size) using `renderer.domElement.toDataURL()`.
  - Add a simple watermark in the corner: "PlantedTankLab.com" in small text.
  - Download as PNG with filename `{build-name}-plantedtanklab.png`.
  - **Verify:** Click export. High-res PNG downloads. Watermark visible in corner. Image looks like the 3D scene.

- [ ] **P12-4: Multi-angle screenshot gallery**
  - When saving a build, auto-capture 3 screenshots from different angles: front, top-down, and 3/4 view.
  - Store all 3 as the build's gallery images in Supabase storage.
  - On the builds gallery page and shared build page, show a small image carousel (3 images, click/swipe to rotate).
  - **Verify:** Save a build. View it on /builds — 3 images in carousel. Click through — different angles shown.

- [ ] **P12-5: Drag items from catalog to scene**
  - In the product/plant selection step, allow drag-and-drop directly into the 3D scene.
  - Drag a plant card from the sidebar → drop on the substrate → item placed at drop position.
  - Use HTML5 drag events on the catalog cards and a drop zone over the R3F canvas.
  - Convert the 2D drop coordinates to 3D world position using raycasting.
  - **Verify:** Drag a plant card from the sidebar. Drop on the substrate. Plant appears at the drop position.

- [ ] **P12-6: Depth zone indicators**
  - Add subtle zone markers on the substrate showing foreground, midground, and background areas.
  - Render as semi-transparent colored strips or dashed lines on the substrate surface.
  - When placing a plant, highlight the zone that matches the plant's preferred placement (e.g., foreground plants highlight the front zone in green).
  - Toggle on/off in scene settings.
  - **Verify:** Toggle zones on. Colored zones visible. Select a foreground plant — front zone highlights. Place it there — zone indicator confirms correct placement.

- [ ] **P12-7: Plant suggestions based on conditions**
  - When a user has selected equipment (light, CO2 system) and set up substrate, show a "Suggested plants" panel.
  - Query plants from the database where light_demand <= selected light output and co2_demand matches CO2 availability.
  - Show as a sidebar panel with plant cards sorted by compatibility score.
  - Include a "Why this plant?" tooltip explaining the match (e.g., "Low light demand matches your LED").
  - **Verify:** Select a low-output light and no CO2. Suggested plants are all low-light, low-CO2 species. Add a CO2 system — suggestions expand to include medium-CO2 plants.

- [ ] **P12-8: Contextual help tooltips**
  - Add "?" tooltip icons next to key builder controls: brush modes, quality settings, workflow steps, substrate presets.
  - Each tooltip shows a brief explanation (1-2 sentences) of what the control does.
  - Use a simple tooltip component (div positioned on hover, no tooltip library needed).
  - First-time users see a brief builder tour: 4 overlay steps highlighting key areas (tank, sidebar, toolbar, substrate). Show once, dismiss permanently via localStorage flag.
  - **Verify:** Hover over "?" icons — tooltips appear. First visit to builder — tour overlay guides through key areas. Dismiss — never shows again.

### Phase 13 -- Fish & Invertebrate Database

- [ ] **P13-1: Fish/invertebrate schema and seed data**
  - Add a `fauna` table to the Drizzle schema: id, slug, common_name, scientific_name, type (fish/shrimp/snail/crab), min_tank_size_gallons, temperament (peaceful/semi-aggressive/aggressive), water_temp_min/max, ph_min/max, max_size_inches, schooling (boolean, min_school_size), diet, description, image_url, shrimp_safe (boolean). Run migration.
  - Seed with 30-40 common species: neon tetra, cardinal tetra, betta, guppy, cherry shrimp, amano shrimp, nerite snail, otocinclus, corydoras, bristlenose pleco, rasbora, ember tetra, celestial pearl danio, rummy nose tetra, etc.
  - **Verify:** Migration runs. Seed data loads. Query returns all species.

- [ ] **P13-2: Fauna browse page**
  - Create `/fauna` page with a filterable grid similar to `/plants`.
  - Filters: type (fish/shrimp/snail), temperament, min tank size, temperature range, shrimp-safe.
  - Cards show: image (or placeholder icon by type), common name, scientific name, size, temperament badge, tank size requirement.
  - Add to main navigation.
  - **Verify:** Visit `/fauna`. Filter by type=shrimp — only shrimp shown. Filter by shrimp-safe — aggressive species hidden.

- [ ] **P13-3: Fauna detail pages**
  - Create `/fauna/[slug]` pages with care information.
  - Show: parameters card (temp, pH, size, tank size), diet info, temperament notes, compatibility warnings, description.
  - "Compatible plants" section: list plants that share similar water parameters.
  - "Compatible tankmates" section: list other fauna that are temperament-compatible.
  - **Verify:** Visit a fauna detail page. Care card shows correct parameters. Compatible species lists render.

- [ ] **P13-4: Fauna in build compatibility**
  - Allow adding fauna to builds (extend `build_items` or add a `build_fauna` junction table).
  - In the builder, add a "Livestock" workflow step after plants/hardscape.
  - Run compatibility checks: warn if tank is too small, temperature mismatch with plants, aggressive species with shrimp, overstocking.
  - Integrate with the existing compatibility engine rules format.
  - **Verify:** Add cherry shrimp to a build. Add a betta — compatibility warning appears (betta may eat shrimp). Add 20 fish to a 10-gallon — overstocking warning.

### Phase 14 -- Notifications & Engagement

- [ ] **P14-1: In-app notification system**
  - Add a `notifications` table (id, user_id, type, title, body, link, read boolean, created_at). Run migration.
  - Add a bell icon in the nav bar with unread count badge.
  - Clicking opens a dropdown showing recent notifications (most recent 20).
  - Notification types: vote_received, comment_received, price_alert_triggered, build_remixed.
  - tRPC routes: `notifications.list`, `notifications.markRead`, `notifications.unreadCount`.
  - **Verify:** Receive a vote on your build. Bell icon shows "1". Click — notification appears. Mark read — badge clears.

- [ ] **P14-2: Email notification preferences**
  - Add an `email_preferences` table (user_id, notify_votes boolean, notify_comments boolean, notify_price_alerts boolean, weekly_digest boolean). Run migration.
  - Add a notification settings page at `/profile/notifications` with toggles for each preference.
  - For now, just store preferences — actual email sending is a future task (requires email service integration).
  - **Verify:** Visit notification settings. Toggle preferences. Refresh — preferences persist.

- [ ] **P14-3: Weekly digest data aggregation**
  - Create a tRPC route `notifications.weeklyDigest` that aggregates the past week's activity for a user: new votes, new comments, price drops on saved builds, popular new builds.
  - Create a `/profile/digest` page that renders the weekly digest as a web page (same content that would go in an email).
  - **Verify:** View the digest page. It shows aggregated stats for the past week. If no activity, shows a friendly "quiet week" message.

### Phase 15 -- Admin & Data Quality

- [ ] **P15-1: Admin dashboard metrics**
  - On the admin dashboard (`/admin`), show key metrics cards: total users, total builds, total public builds, total products, total plants, total offers, total page views (from analytics_events).
  - Add a "Recent activity" feed showing the last 20 admin log entries.
  - Add quick links to each admin section.
  - **Verify:** Visit `/admin`. Metrics cards show real counts from the database. Recent activity feed populates.

- [ ] **P15-2: Bulk plant data editor**
  - On `/admin/plants`, add inline editing: click a plant row to expand an edit form.
  - Editable fields: common_name, scientific_name, difficulty, light_demand, co2_demand, placement, growth_rate, description, image_url.
  - Save button persists changes via tRPC mutation.
  - Add a "Add new plant" button that opens a blank form.
  - **Verify:** Click a plant in admin. Edit its difficulty. Save. Refresh — change persists. Add a new plant — it appears in the catalog.

- [ ] **P15-3: Data quality dashboard**
  - On `/admin/quality`, show data completeness metrics:
    - Plants missing images, plants missing descriptions, products with no offers, categories with no products.
  - Each section is a collapsible list with direct edit links.
  - Show an overall "data health" score (percentage of entities with complete data).
  - **Verify:** Visit `/admin/quality`. Lists show actual gaps in the data. Clicking an item links to its edit page.

- [ ] **P15-4: Ingestion monitoring improvements**
  - On `/admin/ingestion`, show a timeline of recent ingestion runs with status (success/failure/partial).
  - For each run, show: source, duration, entities processed, entities created, entities updated, errors.
  - Add a "Run now" button per source that triggers an immediate ingestion run via tRPC mutation.
  - **Verify:** Visit `/admin/ingestion`. Recent runs displayed with stats. "Run now" triggers a new run and shows its progress.

### Phase 16 -- Testing & Reliability

- [ ] **P16-1: E2E tests for critical user flows**
  - Add Playwright E2E tests for the 5 most critical flows:
    1. Homepage → Products → Category → Product detail (navigation works)
    2. Homepage → Plants → Plant detail (filters work)
    3. Builder → select tank → place plant → save build (core builder flow)
    4. Builder → share build → view shared build (sharing works)
    5. Sign up → sign in → save build → view profile (auth flow)
  - Place tests in `tests/e2e/`. Use existing Playwright config if present, or create one.
  - **Verify:** `pnpm test:e2e` runs all 5 tests and passes. Each test completes in under 30 seconds.

- [ ] **P16-2: Visual regression tests for builder**
  - Add Playwright screenshot tests for the builder:
    - Default empty builder state
    - Builder with items placed
    - Substrate with sculpted terrain
    - Mobile viewport (responsive layout)
  - Compare against baseline screenshots. Fail if pixel diff exceeds 1%.
  - Store baselines in `tests/e2e/screenshots/`.
  - **Verify:** `pnpm test:e2e` includes visual tests. Changing a builder CSS property causes a visual regression failure.

- [ ] **P16-3: API integration tests**
  - Add Vitest integration tests for key tRPC routes:
    - `builds.create` → `builds.get` → `builds.listPublic` (build lifecycle)
    - `plants.list` with filters (filter logic)
    - `products.categoriesList` (categories exclude test data)
    - `offers.forProduct` (price comparison logic)
  - Use the existing Supabase test database connection.
  - Clean up test data in `afterAll` hooks.
  - **Verify:** `pnpm test` passes all new integration tests. Tests create and clean up their own data.

- [ ] **P16-4: Performance budget enforcement**
  - Add a build-time check that fails if the main JS bundle exceeds 500KB gzipped (excluding the 3D builder chunk).
  - Add a check that the 3D builder chunk doesn't exceed 800KB gzipped.
  - Implement as a custom Next.js plugin or a post-build script that reads `.next/` output.
  - Add to CI workflow.
  - **Verify:** `pnpm build` outputs bundle sizes. If a bundle exceeds the budget, the build fails with a clear message showing which chunk is too large.

### Phase 17 -- Social Sharing & Growth

- [ ] **P17-1: Build embed widget**
  - Create an embeddable `<iframe>` endpoint at `/embed/[shareSlug]` that renders a read-only 3D preview of a shared build.
  - Minimal chrome: just the 3D scene with orbit controls, no toolbar or sidebar.
  - Add a "Get embed code" button on shared build pages that copies an `<iframe>` tag to clipboard.
  - iframe should be responsive (100% width, 16:9 aspect ratio).
  - **Verify:** Get embed code for a build. Paste the iframe into an HTML file. The 3D scene renders in the iframe with orbit controls.

- [ ] **P17-2: Social sharing with OG previews**
  - Ensure every shared build page has proper Open Graph and Twitter Card meta tags.
  - Use the build's screenshot (P3-3) as `og:image`. Fall back to a generic PlantedTankLab preview image if no screenshot.
  - Add share buttons on build pages: copy link, share to Twitter/X (pre-filled text), share to Reddit (pre-filled title + link).
  - **Verify:** Share a build URL on Twitter/X. Preview card shows the build screenshot, title, and description.

- [ ] **P17-3: Build of the Week feature**
  - Create a `featured_builds` table (build_id, featured_at, featured_until). Run migration.
  - Add an admin action on `/admin/builds` to feature a build for a week.
  - On the homepage and `/builds`, show the featured build prominently at the top with a "Build of the Week" badge.
  - Auto-expire features after 7 days.
  - **Verify:** Feature a build via admin. Homepage shows it with badge. After expiry date, badge disappears.

- [ ] **P17-4: Sitemap generation**
  - Create a dynamic sitemap at `/sitemap.xml` using Next.js App Router's `sitemap.ts` convention.
  - Include: all plant pages, all product pages, all category pages, all public build pages, all guide pages, all tool pages, static pages (home, about, contact).
  - Set `changeFreq` and `priority` appropriately (plants/products = weekly/0.7, builds = daily/0.5, tools = monthly/0.8).
  - **Verify:** Visit `/sitemap.xml`. All dynamic pages listed. No broken URLs. Submit to Google Search Console.

- [ ] **P17-5: RSS feed for builds**
  - Create an RSS feed at `/feeds/builds.xml` listing the 50 most recent public builds.
  - Each entry: title, description, link to build page, author, publish date, enclosure with screenshot image.
  - Add `<link rel="alternate" type="application/rss+xml">` to the HTML head on relevant pages.
  - **Verify:** Visit `/feeds/builds.xml`. Valid RSS XML renders. Add to an RSS reader — builds appear.

### Phase 18 -- Dark Mode & Theming

- [ ] **P18-1: Dark mode toggle**
  - Add a theme toggle button in the site header (sun/moon icon).
  - Implement using CSS custom properties and a `data-theme="dark"` attribute on `<html>`.
  - Dark mode colors: dark backgrounds (#0f172a slate-900), light text (#e2e8f0 slate-200), muted borders (#334155 slate-700).
  - Persist preference in localStorage. Default to system preference via `prefers-color-scheme` media query.
  - **Verify:** Click theme toggle — site switches to dark mode. Refresh — preference persists. Remove localStorage — follows system preference.

- [ ] **P18-2: Dark mode for all pages**
  - Apply dark mode styles to every page: home, products, plants, builds, tools, guides, profile, admin.
  - Ensure all text is readable (WCAG AA contrast in dark mode).
  - Images and plant photos should have a subtle border or shadow to not float on dark backgrounds.
  - Form inputs, modals, and dropdowns need dark variants.
  - **Verify:** Switch to dark mode. Navigate through every page. All content readable. No elements with invisible text or broken contrast.

- [ ] **P18-3: Dark mode for 3D builder**
  - Update the builder's UI panels and toolbars for dark mode.
  - The 3D scene itself is already dark (tank interior). Adjust the environment backdrop (P5-3) to be darker in dark mode.
  - Toolbar buttons, sliders, and panels should use dark backgrounds with light text.
  - **Verify:** Open builder in dark mode. All UI controls visible and usable. Scene looks cohesive with the dark UI.

### Phase 19 -- Internationalization Prep

- [ ] **P19-1: Extract UI strings**
  - Install `next-intl` or a similar lightweight i18n library.
  - Extract all user-facing strings from components into message files (`messages/en.json`).
  - Cover: navigation labels, builder UI text, form labels, error messages, tool page content, placeholder text.
  - Do NOT translate yet — just extract English strings into the message file and replace hardcoded text with `t('key')` calls.
  - **Verify:** App works identically. All visible text comes from the message file. No hardcoded user-facing strings remain in components.

- [ ] **P19-2: Unit system toggle (imperial/metric)**
  - Add a unit preference toggle in site settings (stored in localStorage).
  - Convert all measurements: tank dimensions (inches ↔ cm), substrate depth, plant sizes, fish sizes.
  - Builder dimensions update live when toggling units.
  - Calculator tools (Phase 7) support both unit systems.
  - Default to imperial for US locale, metric for others (based on `navigator.language`).
  - **Verify:** Toggle to metric. Tank dimensions show in cm. Calculator inputs accept liters. Toggle back — inches and gallons.

All completed planning docs live in `docs/refactor/`. Key ones for implementation reference:
- Camera architecture: `decisions/ADR-camera-control-architecture.md`
- Substrate architecture: `decisions/ADR-substrate-node-grid-architecture.md`
- Visual spec: `docs/refactor/visual-spec-package.md`
- Acceptance criteria: `docs/refactor/acceptance-criteria-matrix.md`
- Experience principles: `docs/refactor/experience-principles.md`
- (Review findings incorporated into TODO.md, CLAUDE.md, AGENTS.md on 2026-02-15)
