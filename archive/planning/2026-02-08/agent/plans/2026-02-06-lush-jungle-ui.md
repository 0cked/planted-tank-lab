# Lush Jungle UI Overhaul (Foundation Styling Pass)

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Turn the current sterile, mostly-white MVP into a beautiful, aquascape-themed site that:

- Feels like a real brand (lush jungle direction, light theme only).
- Is useful without live pricing (builder + catalog browsing + care cards).
- Is “affiliate-ready” in presentation (trust pages, disclosure, nav clarity).

Constraints:

- Use the user-provided assets in `visual-assets/` (logo, hero, favicons).
- Keep it light-theme only for now.
- Avoid large dependency adds; prefer `next/font` and Tailwind.

## Current State (Observed)

- Global shell is white/neutral (sterile).
- `src/app/globals.css` sets `body` to `Arial`, overriding `next/font`.
- Header/footer are inline in `src/app/layout.tsx` and use generic borders.
- Pages are functional, but have no atmospheric background, texture, or strong typographic system.

## Deliverables

- Brand shell: header/footer, container rhythm, and a distinct aquascape-themed background.
- Home page redesigned with a hero image and brand voice.
- Products and plants pages restyled (cards, filters, detail pages).
- Builder restyled for the same visual system.
- Favicons + web manifest wired.
- Tests + build pass.

## Milestones

### Milestone 1: Assets + Metadata Wiring

Steps:

1. Copy assets into `public/`:
   - `visual-assets/ptl-logo.svg` -> `public/brand/ptl-logo.svg`
   - `visual-assets/aquascape-hero-16-by-9.svg` -> `public/images/aquascape-hero-16-by-9.svg`
   - Favicons from `visual-assets/favicons/*` -> `public/*`
2. Update `public/site.webmanifest` name/short_name/theme colors for PlantedTankLab.
3. Update `src/app/layout.tsx` metadata `icons` and `manifest`.

Validation:

- `pnpm build` succeeds.
- Browser shows correct favicon (manual).

### Milestone 2: Design Tokens + Global Background

Steps:

1. Update `src/app/globals.css`:
   - Remove dark-mode switching (light theme only).
   - Define CSS variables for lush-jungle palette.
   - Set `body` to use `var(--font-sans)` from `next/font`.
2. Add subtle background pattern file (SVG) under `public/patterns/` and use it via CSS.
3. Add a small set of reusable Tailwind component classes in `@layer components` (cards, buttons, pills).

Validation:

- Visual: background is no longer flat white; cards feel intentional.
- `pnpm lint && pnpm typecheck`.

### Milestone 3: Site Shell Components

Steps:

1. Create `src/components/layout/SiteHeader.tsx` and `src/components/layout/SiteFooter.tsx`.
2. Update `src/app/layout.tsx` to use those components.
3. Add trust pages:
   - `src/app/about/page.tsx`
   - `src/app/contact/page.tsx`
   - `src/app/privacy/page.tsx`

Validation:

- Navigation works.
- Pages render with consistent styling.

### Milestone 4: Home Page Redesign

Steps:

1. Redesign `src/app/page.tsx` with:
   - Hero with image + gradient mask.
   - Strong typographic hierarchy.
   - Clear CTAs.
2. Replace “Try the MVP” copy with “useful now” messaging (builder-first).

Validation:

- `pnpm test:e2e` smoke test still passes.

### Milestone 5: Catalog + Builder Restyle

Steps:

1. Restyle:
   - `src/app/products/page.tsx`
   - `src/app/products/[category]/page.tsx`
   - `src/app/products/[category]/[slug]/page.tsx`
   - `src/app/plants/page.tsx`
   - `src/app/plants/[slug]/page.tsx`
2. Restyle builder UI in `src/components/builder/BuilderPage.tsx` to match.

Validation:

- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`.
- Manual spot-check:
  - `/` looks branded and non-sterile.
  - `/builder` feels cohesive and readable.
  - `/products/tank` and `/plants` look like real catalog pages.

## Progress

- [x] Milestone 1: Assets + metadata wiring
- [x] Milestone 2: Design tokens + global background
- [x] Milestone 3: Site shell components
- [x] Milestone 4: Home page redesign
- [x] Milestone 5: Catalog + builder restyle
