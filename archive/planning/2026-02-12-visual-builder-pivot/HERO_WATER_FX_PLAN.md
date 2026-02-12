# HERO_WATER_FX_PLAN.md

## Objective
Build a premium homepage interaction where cursor movement drives realistic water motion, and the hero text appears to dissolve into that flow and reform naturally.

## Current Issue (baseline)
The current implementation is visually rudimentary (2D ripple circles + text jiggling transform). It does not meet the intended art direction.

## Target Experience
1. Water movement around cursor feels physically plausible (fluid-like, not stamped circles).
2. Hero text is coupled to the same motion field.
3. Text can partially disintegrate into flow and reform when interaction stops.
4. Effect remains readable, performant, and gracefully degrades on weak devices / reduced-motion users.

---

## Recommended Technical Approach

### Stack
- Next.js client component on homepage hero.
- WebGL pipeline using **OGL** (preferred lightweight) or **regl**.
- Offscreen framebuffers for simulation + compositing passes.

### Core Rendering Pipeline (multi-pass)
1. **Simulation pass**
   - velocity, pressure/divergence, dye (or disturbance) fields
   - cursor injects force proportional to pointer velocity
   - advection + dissipation + mild vorticity/curl noise
2. **Background pass**
   - use simulation normals/displacement to refract hero background
   - add subtle caustic/specular response
3. **Text pass**
   - render hero text to offscreen texture (or SDF mask)
4. **Text dissolve/reform pass**
   - particles/fragments advected by velocity field
   - spring-to-home attractor enables reformation
   - damped hysteresis for natural settle
5. **Composite pass**
   - combine background + disturbed text + particles
   - ensure CTA readability floor

---

## Implementation Phases

### Phase A — Replace simple ripple with fluid motion
- Remove current 2D ring ripple/jiggle effect.
- Implement GPU fluid field with cursor force injection.
- Distort only background first.
- Add tuning controls for force, viscosity, dissipation.

**Exit criteria**
- Cursor wake feels organic and non-repetitive.
- No obvious ring-stamp artifacts.

### Phase B — Couple text to fluid field
- Render hero text to offscreen texture.
- Distort text via same displacement field.
- Add directional drag and elastic return.

**Exit criteria**
- Text appears submerged in same fluid system.
- Motion remains legible and premium.

### Phase C — Cinematic disintegration + reform
- Introduce instanced text particles/fragments from mask/SDF.
- Particles detach under strong local force and trail with flow.
- Reassemble via home-position attraction + damping.

**Exit criteria**
- Convincing dissolve/reform behavior.
- No noisy chaos or permanent text degradation.

### Phase D — Production hardening
- Feature flag (`HERO_WATER_FX_V2`).
- Device-tier quality presets (desktop high / laptop medium / mobile subtle-or-off).
- `prefers-reduced-motion` fallback (static hero).
- Pause rendering when tab hidden.

**Exit criteria**
- Stable behavior across common desktop browsers.
- Graceful fallback paths verified.

---

## Performance Budget / Constraints
- Target 55–60 FPS modern desktop.
- Acceptable floor: 40+ FPS mid-tier laptops.
- Cap DPR for effect layer (e.g., 1.5 max).
- Use lower-resolution simulation buffers than viewport.
- Cap particle count with adaptive reduction.

---

## Accessibility / UX Constraints
- CTA text/buttons always readable and clickable.
- Honor `prefers-reduced-motion`.
- Effect should never block pointer events on controls.
- Keep visual intensity below seizure-risk thresholds.

---

## Validation Checklist
- [ ] No ring artifacts or fake-looking ripple loops.
- [ ] Text drag feels fluid-linked, not transform-jitter.
- [ ] Dissolve/reform reads clearly at normal interaction speed.
- [ ] Hero remains readable under interaction.
- [ ] Desktop performance and fallback behavior pass manual checks.

---

## Suggested File/Code Touchpoints
- `src/app/page.tsx`
- `src/components/home/*` (new WebGL effect module)
- `src/app/globals.css` (layering/fallback styles)
- Optional config/feature flag wiring

---

## Rollout Strategy
1. Ship Phase A+B behind flag and preview query param (`/?fx=water-v2`).
2. Tune with live visual review.
3. Add Phase C once A+B feel is approved.
4. Enable by default after performance checks.

---

## AI Agent Execution Prompt (copy/paste)

You are implementing a production-quality homepage water interaction for PlantedTankLab.

Repository:
`/Users/jacob/Projects/planted-tank-lab`

Primary spec:
`/Users/jacob/Projects/planted-tank-lab/HERO_WATER_FX_PLAN.md`

Goal:
Replace the current rudimentary cursor ripple/text jiggle with a high-end WebGL fluid effect where:
1) cursor drives realistic water motion,
2) hero text is coupled to the same field,
3) text can partially dissolve into flow and reform,
4) performance/accessibility guardrails are respected.

Requirements:
- Implement end-to-end in phases A→D as defined in HERO_WATER_FX_PLAN.md.
- Use OGL (preferred) or regl for a lightweight custom WebGL pipeline.
- Keep all changes scoped to homepage hero experience and related supporting modules.
- Add a feature flag `HERO_WATER_FX_V2` and a preview mode query param (`?fx=water-v2`).
- Ensure `prefers-reduced-motion` fallback is static and elegant.
- Ensure CTA readability and clickability are never compromised.

Deliverables:
- New/updated source files implementing the pipeline.
- Removal of old simple ripple/jiggle effect.
- Reasonable tuning constants with comments.
- Brief implementation notes in commit message(s).

Verification:
- Run `pnpm lint`
- Run `pnpm typecheck`
- Run targeted tests if present; add lightweight tests where practical.
- Manually verify on homepage in desktop browser for:
  - fluid realism
  - text dissolve/reform quality
  - readability
  - fallback behavior

Git workflow:
- Work on current branch.
- Commit with conventional commit messages.
- Push to `origin/main` only when checks pass.

Output summary at end:
- What changed
- Performance/fallback behavior
- Any known limitations
- Final commit SHA(s)
