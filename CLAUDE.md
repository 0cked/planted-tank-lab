# Planted Tank Lab -- Agent Operating Guide

## CRITICAL CONTEXT: Why this file exists

The previous AI agent spent 48 hours on this project and produced **34 planning documents and an internal diagnostics panel** before making a single user-visible change. Camera pan is still disabled. Substrate editing is still the old slider system. Plants are still colored cones. Test data is visible on the production site.

**Your job is to write code that changes what users see.** Not to plan. Not to document. Not to build dev tools. To ship.

## What is this project?

"PCPartPicker for planted aquariums" -- a web app where hobbyists build planted tank setups by selecting compatible gear and plants, with a 3D visual builder, instant compatibility feedback, and price comparisons via affiliate offers.

**Production:** https://plantedtanklab.com
**Repo:** Next.js 16 + tRPC + Drizzle + React Three Fiber + Zustand + Fly.io

## What to work on

**Read `TODO.md` first.** It has the full roadmap with phased tasks. Work top-to-bottom within each phase. Phase 0 tasks are the highest priority.

**Do not skip ahead.** Do not reorder tasks. Do not "prepare" for future tasks. Complete the current task, verify it, commit it, move to the next one.

## How to verify your work

```bash
pnpm verify        # lint + typecheck + unit tests + e2e tests + build
pnpm dev           # local dev server at localhost:3000
pnpm test          # unit tests only (Vitest)
pnpm test:e2e      # e2e tests only (Playwright, requires built app)
```

Always run `pnpm typecheck` before considering a task done. If you change the visual builder, visually verify in `pnpm dev` by navigating to `/builder`.

## Execution rules

1. **CODE CHANGES ONLY.** Every task you complete must result in modified `.ts`, `.tsx`, `.css`, `.yml`, or config files. If you find yourself creating `.md` files, writing summaries, or producing analysis -- stop immediately. That is not your job. The planning is done.

2. **Do not create new documentation files.** Not "just a small one." Not "to clarify the approach." Not "for future agents." Zero new markdown files. The 34 planning docs in `docs/refactor/` are more than sufficient.

3. **Do not build, extend, or polish internal tooling.** No diagnostics panels, debug overlays, evidence capture systems, scenario badges, or developer dashboards. The previous agent burned 19 tasks on a camera diagnostics panel that users never see. That work is done. Move on.

4. **Do not fragment tasks.** Each task in TODO.md is scoped to ~1-3 hours of focused work. Do not break it into sub-tasks. Do not create a checklist. Do not "phase" it. Open the files, make the changes, run the tests, commit.

5. **Do not modify the compatibility engine** (`src/engine/`) or **ingestion pipeline** (`src/server/ingestion/`) without being explicitly asked. These are well-tested and stable.

6. **The visual builder is the only builder.** `VisualBuilderPage.tsx` is the primary builder. `BuilderPage.tsx` (form-based) is legacy. Never invest time in the legacy builder.

7. **Test your changes.** If you add new logic, add tests. Vitest for unit tests (`tests/`), Playwright for e2e (`tests/e2e/`).

8. **Keep files small.** Target <500 lines per file. When adding to a large file, extract a component or hook.

9. **When confused, default to action.** If you're unsure how to approach something, make your best attempt in code. A wrong implementation you can iterate on beats a perfect plan you never execute.

## Builder design direction (updated 2026-02-18)

The builder uses a **Scaper-style layout**: full-viewport 3D scene, thin icon rail on the left, floating contextual panels. No wide sidebars.

**Substrate editing** uses preset shapes + draggable control-point dots. **Do NOT** add back:
- Gaussian brush sculpting (raise/lower/smooth/erode modes)
- Brush size/strength sliders
- Multi-material zone painting
- The "B" keyboard shortcut for brush toggle

The `SubstrateToolbar` should only contain: terrain presets, helper text about dragging dots, and volume/bag estimate.

**Glass-morphism UI** pattern: `border-white/8 bg-white/[0.03]` containers, `white/40` labels, `white/85-90` content, cyan accent for active/selected states.

## Architecture quick reference

```
src/
  app/              # Next.js App Router pages + API routes
  components/
    builder/        # Both builders live here
      visual/       # 3D scene, utilities, types
      BuilderPage.tsx         # Legacy form builder (don't invest here)
      VisualBuilderPage.tsx   # Primary 3D builder (main work target)
  server/
    db/             # Drizzle schema + migrations
    trpc/           # tRPC routers
    ingestion/      # Data pipeline (stable, don't touch)
  stores/
    visual-builder-store.ts   # Zustand store for visual builder state
  engine/           # Compatibility checking (stable, don't touch)
  lib/              # Utilities
```

## Current state of the 3D builder

- **Camera:** Two modes (step-owned auto-framing, free user-controlled orbit). Works well. Pan is disabled and needs to be enabled (see TODO P0-4).
- **Substrate:** 7-point interpolated profile with brush editing. Needs replacement with heightfield node-grid (see TODO Phase 1).
- **Assets:** Placeholder procedural geometry (cones for plants, dodecahedrons for rocks). Needs real GLB models (see TODO Phase 2).
- **Diagnostics:** Extensive camera diagnostics panel exists but should be dev-only. Gate it behind `NODE_ENV === 'development'` (see TODO P0-3).

## Deployment

Push to `main` triggers Fly.io deploy via GitHub Actions. There is no staging environment. Be careful with main.

## Code quality

- TypeScript strict mode enabled
- ESLint with Next.js recommended config
- Wednesday dev/design skills available in `.wednesday/skills/` for reference
- Max cyclomatic complexity: 8
