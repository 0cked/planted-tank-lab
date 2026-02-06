# Builder Gating, Auth Scaffolding, Media + Modal Fixes

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Make the MVP feel *functionally* “PCPartPicker-like” by:

- Using compatibility to **gate** what’s selectable (hide incompatible options by default).
- Providing a clear **toggle** to enable/disable compatibility enforcement.
- Fixing picker modals so long lists are usable (scrolling, not off-screen).
- Adding clear support for **images** on products/plants in UI + seed ingestion.
- Shipping initial **auth** scaffolding so users can start creating accounts and we can later tie builds to users.
- Adding basic **cookie consent** for tracking/disclosure hygiene.

Non-goals (separate follow-up work):

- Deep dataset curation and full plant fact sheets sourced for every plant.
- Multi-retailer pricing refresh jobs.

## Milestones

### Milestone 1: Picker Modal Scroll Fix

Steps:

1. Update builder picker dialog (`src/components/builder/BuilderPage.tsx`) to:
   - Use `max-h-[85dvh] overflow-y-auto` on dialog content.
   - Keep header/footer sticky where useful.

Validation:

- A long picker list can be scrolled on a laptop-sized viewport.

### Milestone 2: Builder State Improvements (Persist + Toggles)

Steps:

1. Add Zustand persistence for builder state (`src/stores/builder-store.ts`) using `zustand/middleware`.
2. Add builder UI toggles:
   - `compatibilityEnabled` (default true)
   - `lowTechNoCo2` (default false)

Validation:

- Reloading the page keeps the build selections.
- Toggle states persist.

### Milestone 3: Compatibility-Gated Selection

Steps:

1. Product pickers:
   - When `compatibilityEnabled` is true, hide candidates that would produce a blocking **error** evaluation.
   - Always allow “Show incompatible” by disabling compatibility toggle.
2. Plants picker:
   - When `lowTechNoCo2` is true, hide `co2Demand === "required"`.
   - When a light is selected, optionally hide `lightDemand === "high"` if PAR is too low (rule-aligned).
   - Hide carpet plants if no CO2 or insufficient PAR (rule-aligned).
3. Add “X hidden by compatibility filter” hint inside pickers.

Validation:

- Picking a tank filters out lights that don’t fit.
- “Low-tech (no CO2)” hides CO2-required plants.
- Turning compatibility off shows all options again.

### Milestone 4: Media (Images) Support in Seed + UI

Steps:

1. Update `scripts/seed.ts` to accept plant `image_url` and `image_urls` (and store into DB).
2. Update product + plant list/detail pages to render images when present (with graceful placeholders).

Validation:

- No runtime errors with missing images.
- When an image is provided for at least one record, it renders.

### Milestone 5: Cookie Consent Banner

Steps:

1. Add a small client component banner storing decision in a cookie:
   - Accept/decline
   - No tracking is performed unless accepted (future-proofing)

Validation:

- Banner appears until a choice is made; choice persists.

### Milestone 6: Auth Scaffolding (NextAuth)

Steps:

1. Implement NextAuth route handler at `src/app/api/auth/[...nextauth]/route.ts`.
2. Add `/login` page and header sign-in/out UI.
3. Support Google + Email providers if env vars exist; allow an optional dev-only credentials provider behind an env flag.

Validation:

- `pnpm build` succeeds.
- In dev mode with bypass enabled, auth flow can be tested end-to-end.

## Progress

- [x] Milestone 1: Picker modal scroll fix
- [x] Milestone 2: Builder state improvements (persist + toggles)
- [x] Milestone 3: Compatibility-gated selection
- [x] Milestone 4: Media (images) in seed + UI
- [x] Milestone 5: Cookie consent banner
- [x] Milestone 6: Auth scaffolding (NextAuth)
