# Add Photo Slots For Products + Builder Pickers

This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Make the site feel less sterile by giving every product and plant a visible “photo slot” anywhere the user chooses items:

- Builder pickers should show thumbnails (or tasteful placeholders).
- Product category listings should show thumbnails.
- Product detail pages should have a Photo panel (primary image + optional gallery).

This is foundational for later work where we seed real images (or upload/host our own) without having to redesign the UI again.

## Progress

- [x] (2026-02-06) Add `SmartImage` helper to use `next/image` for local assets and fall back to `<img>` for remote URLs (avoids allow-list churn during MVP seeding).
- [x] (2026-02-06) Add thumbnail/photo UI to:
  - Builder product picker
  - Builder plant picker
  - Product category list
  - Product detail page (Photo panel + gallery thumbnails)
- [x] (2026-02-06) Update Playwright smoke test to use exact matching for “Specs”.
- [x] (2026-02-06) Validate lint/typecheck/unit/e2e.

## Surprises & Discoveries

- Observation: Adding a “Photo” panel copy that mentioned “specs” caused Playwright’s strict `getByText("Specs")` to match multiple nodes.
  Evidence: failing `tests/e2e/smoke.spec.ts` before switching to exact matching.

## Decision Log

- Decision: Use a `SmartImage` component.
  Rationale: Local images (eventually hosted by us) should use `next/image`, while remote seed images can be rendered without constantly expanding `next.config.ts` `images.remotePatterns` during MVP.
  Date: 2026-02-06

## Outcomes & Retrospective

The UI now has consistent photo affordances across builder and product browsing, even before the dataset has comprehensive images. Next step is to progressively seed `image_url` / `image_urls` for curated products and top plants, ideally using sources with stable URLs or by hosting in Supabase Storage.

## Context and Orientation

Key files:

- `src/components/SmartImage.tsx`: shared image rendering helper.
- `src/components/builder/BuilderPage.tsx`: builder pickers (client) now show thumbnails/placeholders.
- `src/app/products/[category]/page.tsx`: category list items now show thumbnails.
- `src/app/products/[category]/[slug]/page.tsx`: product detail page now shows a Photo panel and gallery thumbnails.
- `tests/e2e/smoke.spec.ts`: smoke test updated for exact match on “Specs”.

Note: Database already supports product images via `products.image_url` and `products.image_urls` columns (see `src/server/db/schema.ts`), and seed parsing already supports `image_url` / `image_urls` in product JSON (see `scripts/seed.ts`).

## Milestones

### Milestone 1: Shared Image Helper

Scope:

- Implement `SmartImage` with a remote `<img>` fallback and local `next/image` path.

Validation:

```bash
pnpm lint
```

Expected: no lint errors.

### Milestone 2: Wire Thumbnails Into UI

Scope:

- Thumbnails in builder pickers and product browsing/detail pages.

Validation:

```bash
pnpm dev
```

Manual checks:

1. Visit `http://localhost:3000/builder` and open a picker; verify each row has a photo slot.
2. Visit `http://localhost:3000/products/tank` and verify rows have thumbnails.
3. Visit `http://localhost:3000/products/tank/uns-60u` and verify “Photo” panel exists.

### Milestone 3: Regression Tests

Validation:

```bash
pnpm typecheck && pnpm test && pnpm test:e2e
```

Expected: all pass.

## Validation and Acceptance

Acceptance:

- No picker dialog overflows the viewport (scroll works).
- Builder pickers show thumbnails (or placeholders) without breaking compatibility gating.
- Product pages show photo slots and do not fail tests.

## Idempotence and Recovery

- Re-running `pnpm seed` is safe (upserts).
- If remote image hotlinks are unreliable, remove `image_url` entries from seeds and rely on placeholders until images are hosted.

