# VERIFY - Launch Readiness Playbook

This document defines what "launch-ready" means and the commands to prove it.

## Definition Of Done (v1 launch-ready)

PlantedTankLab is launch-ready when:

1. All P0 items in `PLAN_EXEC.md` are complete.
2. `pnpm verify` passes on a clean checkout.
3. `pnpm verify:gates` shows no `fail` gates (unknown is allowed only if explicitly signed off for a closed beta).
4. Manual QA checklist below is completed on both desktop and mobile.

## One-Command Verification

### `pnpm verify`

Runs lint + typecheck + unit tests + e2e smoke + build.

### `pnpm verify:gates`

Prints G0-G11 pass/fail/unknown from `config/gates.json` plus verification guidance.

## Local Setup (when needed)

1. Install deps: `pnpm install`
2. Ensure `.env.local` exists (do not commit it). See `.env.example`.
3. Apply DB schema: `pnpm drizzle-kit push`
4. Seed data: `pnpm seed`

## Manual QA Checklist (minimum)

### Plant Content Baseline (C-02)

For the current “top 30” plants in `data/plants.json`:
- Each plant has **description** (at least 1–2 sentences).
- Each plant has at least **one source/citation** (`sources[0]` present).
- Each plant has an **image_url** (remote URL or public path under `/public`).
- Sanity-check a handful in the UI:
  - `/plants` renders, images load.
  - Click through 5–10 plant detail pages; confirm sources render and no broken layouts.


- Home: loads fast, hero looks correct, nav works, no internal jargon.
- Builder: complete a build; compatibility hides incompatible items; Share works; Buy links go through `/go/*`.
- Products: category list works; product detail renders; offers show expected messaging when missing.
- Plants: filters work; plant detail shows sources; images load.
- Auth: Google login works; sign out works; session persists on refresh.
- Admin: signed-out and non-admin cannot access `/admin/*`; admin can edit products/plants/rules/offers.
- Cookies: banner appears once; consent choice persists; analytics respects opt-in (if enabled).
- SEO: sitemap and robots endpoints load (`/sitemap.xml`, `/robots.txt`).

## Production Spot Checks (before public launch)

- `curl -I https://plantedtanklab.com` confirms security headers (see `PLAN_EXEC.md` A-02).
- `curl -I https://plantedtanklab.com/sitemap.xml` returns 200.
- Verify `/go/{offerId}` rejects disallowed hosts (open redirect protection).
