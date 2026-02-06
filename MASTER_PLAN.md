# MASTER_PLAN — PlantedTankLab

## The Vision (Endgame State)

PlantedTankLab is a beautiful, aquascape-first “PCPartPicker for planted tanks” where users can plan a complete setup (gear + plants) with instant compatibility feedback, trustworthy care/spec data, and clear pricing from real retailers. It supports accounts, saved and shareable builds, community browsing, and an admin workflow that keeps products/plants/rules/offers current and verifiable. It is production-grade: fast, accessible, SEO-friendly, secure, observable, and backed by strong automated testing.

## Definition Of Done (100% Finished, Robust, Production-Ready)

The project is “done” when all of the following are true:

1. Core product: builder supports end-to-end setup creation with guided steps, compatibility gating, explanations, and alternatives; builds can be saved (anonymous + authenticated), shared, and optionally published; pricing works from multiple retailers via affiliate redirect + click tracking.
2. Data credibility: products have complete spec coverage for shipped rules; plants have photos, rich care data, and displayed citations; missing/uncertain data is surfaced honestly.
3. Aquascape UX: visual identity is unmistakably aquascape-themed (lush jungle, glass/water cues, image-forward browsing); the site is joyful on mobile/desktop and modals/lists never trap scrolling.
4. Production readiness: real auth (Google + magic links), secure sessions, role-based admin; monitoring/error reporting; rate limiting and abuse prevention on public endpoints.
5. Quality: unit tests cover engine + critical utilities; integration tests cover tRPC + DB; e2e covers key flows; CI blocks merges on lint/typecheck/tests failures.

## Expanded Roadmap (Phases + Checklist)

Notes on formatting:

- Items are intentionally “flat” (no nested bullets) but use IDs to preserve hierarchy.
- The “next immediate phase” is Phase 1 and is broken into atomic tasks.

### Phase 0 — Foundation + Infrastructure (Mostly Complete)

- [x] P0.01 Repo + `.gitignore` + initial commits.
- [x] P0.02 Supabase + Drizzle schema created and pushed.
- [x] P0.03 Vercel project + domain + Cloudflare DNS (plantedtanklab.com).
- [x] P0.04 Next.js App Router + Tailwind + tRPC + Zustand + Vitest + Playwright scaffold.
- [x] P0.05 Seed pipeline (`pnpm seed`) upserting categories/products/plants/rules/retailers/offers.

### Phase 1 — “Useful To Real People” Builder (NEXT IMMEDIATE PHASE; Atomic Tasks)

Goal: A user can build a credible shopping list that feels curated, explains tradeoffs, and prevents obvious mistakes, without needing to understand internal system terms.

- [x] P1.01 Builder stepper UX: turn the category list into a guided “workflow” (tank -> light -> filter -> CO2 -> substrate -> plants -> extras) with “next recommended step” and progress.
- [x] P1.02 Compatibility gating v2: make gating rule-driven and consistent for every category (not just “error rules” for products and a couple heuristics for plants).
- [x] P1.03 Hidden-options transparency: show “X hidden by compatibility” plus a “Show incompatible” toggle inside pickers (per-picker) without turning off the whole engine.
- [x] P1.04 Explainers: for any blocked/hidden item, provide a short “why” (top 1-2 rules triggered) and a “fix suggestion” (swap tank/light/etc.).
- [x] P1.05 Alternatives panel: on any selected item, a “Swap” view pre-filtered to compatible options and sorted by “best match”.
- [x] P1.06 Price accuracy UX: treat price as “estimate” unless at least 1 in-stock offer exists; show per-item best offer and total; handle missing offers gracefully.
- [x] P1.07 Offer selection: allow choosing a specific retailer offer per product (default: lowest in-stock).
- [x] P1.08 Build persistence v1a: anonymous builds saved locally with explicit versioning and migrations (Zustand persist already exists; harden it).
- [x] P1.09 Build persistence v1b: share links always load correctly (server route fetch + hydrate) and do not break after rule updates.
- [ ] P1.10 Rule set expansion (seed): expand DB-seeded rules to the “Starter 20” from `PLAN.md`.
- [ ] P1.11 Rule engine support: implement the operators/condition shapes required by those 20 rules (client-side engine).
- [ ] P1.12 Rule tests: add unit tests for every shipped rule (engine + fixtures).
- [ ] P1.13 Builder E2E: add Playwright tests covering gating behavior (tank length filters lights; low-tech hides required-CO2 plants; “Show incompatible” reveals hidden).

### Phase 2 — Accounts + Saved Builds + Sharing (Production Auth)

- [ ] P2.01 Auth providers: Google OAuth + email magic links (remove dev-only provider from production builds).
- [ ] P2.02 User profile: view builds, favorites, settings.
- [ ] P2.03 Save builds to DB (API): create/update build, items, and cached totals.
- [ ] P2.04 Save builds to DB (migration): auto-migrate local build into account on first login.
- [ ] P2.05 Public builds: publish/unpublish; canonical share pages; basic moderation hooks.
- [ ] P2.06 Authorization: enforce user ownership for build mutations; admin roles for admin routes.

### Phase 3 — Products/Plants Browsing That Feels Like Aquascaping (UX + SEO)

- [ ] P3.01 Plants browsing revamp: image-forward list, fast filters, and “curated” default view.
- [ ] P3.02 Plant detail: richer structured info (type, origin, growth form, height range, care notes), with displayed citations and last-updated.
- [ ] P3.03 Product pages: consistent photo slots, specs tables, and “works well with” suggestions based on build stats.
- [ ] P3.04 SEO: metadata polish, category index pages, canonical URLs, structured data where applicable, sitemap correctness.

### Phase 4 — Retail Pricing + Affiliate (Real-World Monetization)

- [ ] P4.01 Retailer model finalized: affiliate networks, retailer metadata, logo handling.
- [ ] P4.02 Offer ingestion (manual): manual offers for core categories until automated ingestion exists.
- [ ] P4.03 Offer ingestion (refresh): scheduled refresh job system (cron) and a clear “last checked” UI.
- [ ] P4.04 Affiliate redirect hardening: validation, allow-listing, bot protections, click attribution.
- [ ] P4.05 Price history UI: show “price over time” for popular items (optional before launch).
- [ ] P4.06 Legal/UX: clear affiliate disclosure near all purchase links; cookie policy accuracy.

### Phase 5 — Admin + Operations (Maintainability)

- [ ] P5.01 Admin auth + role-based access control.
- [ ] P5.02 Admin CRUD (products): spec-driven forms via `spec_definitions`.
- [ ] P5.03 Admin CRUD (plants): care fields + sources + image upload.
- [ ] P5.04 Admin CRUD (rules): create/edit/disable + preview evaluator.
- [ ] P5.05 Admin CRUD (offers): edit offers, trigger refresh, manage affiliate templates.
- [ ] P5.06 Moderation tools: public builds review and takedown.
- [ ] P5.07 Audit log: admin actions recorded.

### Phase 6 — Visual Identity + Brand Polish (Aquascape “Lush Jungle”)

- [x] P6.01 Theme tokens and background atmosphere are in place.
- [x] P6.02 Home hero is full-bleed and brand wordmark is used correctly.
- [ ] P6.03 Replace “SaaS card grid” feel (surfaces): introduce 2-3 signature surfaces (glass, slate, sand) and use intentionally across key pages.
- [ ] P6.04 Replace “SaaS card grid” feel (type): typography system for editorial vs utility text, with consistent hierarchy.
- [ ] P6.05 Image system (hosting): host key media (hero + curated product/plant images) in Supabase Storage.
- [ ] P6.06 Image system (standards): standardize aspect ratios, cropping, and responsive sizes.
- [ ] P6.07 Motion pass: page-load reveal, list stagger, dialog transitions, and respect reduced-motion.
- [ ] P6.08 Content pass: rewrite all UI copy to be hobby-native (no “seeded”, no “MVP”, no internal jargon).

### Phase 7 — Reliability, Security, Performance, Observability

- [ ] P7.01 Error handling (UI): route segment error boundaries and consistent fallback UI.
- [ ] P7.02 Error handling (API): tRPC error normalization and user-friendly messages.
- [ ] P7.03 Error handling (data): “missing spec” UX states (skip rules with explanation + “verify before buying” messaging).
- [ ] P7.04 Rate limiting on public endpoints (especially `/api/trpc`, `/go/*`, build/share).
- [ ] P7.05 Security headers (CSP, HSTS, etc.) and dependency audits.
- [ ] P7.06 Observability (logging): structured logging (server) with request IDs.
- [ ] P7.07 Observability (errors): error reporting (Sentry or equivalent) with alerting.
- [ ] P7.08 Observability (analytics): basic analytics that respect consent.
- [ ] P7.09 Performance (bundle): bundle analysis and optimization.
- [ ] P7.10 Performance (caching): caching strategy for rules/catalog (server + client).
- [ ] P7.11 Performance (web vitals): reduce hotlinked images; optimize LCP and CLS.

### Phase 8 — Community + Growth Features

- [ ] P8.01 Community builds browsing, search, and tagging (styles: jungle/dutch/iwagumi).
- [ ] P8.02 Favorites and “users also chose” recommendations.
- [ ] P8.03 Guides/editorial: `/guides/*` with SEO and internal linking.
- [ ] P8.04 Internationalization readiness (optional).

## Current Status (Based On Repo + Chat History)

- [x] Infra: GitHub/Vercel/Cloudflare/Supabase are set up; production deploys work.
- [x] Stack: Next.js App Router + strict TS + Tailwind + tRPC + Drizzle + tests are working.
- [x] DB schema: core tables exist; rules stored in DB; click tracking exists.
- [x] Seed pipeline: categories/products/plants/rules/offers seeding works and is idempotent.
- [x] Builder exists (state): Zustand store persisted; compatibility toggle exists; low-tech (no CO2) toggle exists; curated picks toggle exists.
- [x] Builder exists (UI): product/plant pickers are scroll-safe; compatibility gating hides “error” candidates for products and applies a few plant heuristics.
- [x] Auth scaffolding exists: NextAuth route exists; dev login is gated; basic login page + user menu exists.
- [x] Appearance improvements shipped: lush jungle tokens; site shell; full-bleed hero; copy cleanup; pointer cursor behavior.
- [x] Plant trust improvements shipped: `plants.sources` JSONB exists and is displayed on plant detail pages; a curated set of plants have image URLs + source URLs.

## Gap Analysis (Here -> There)

Builder gaps (core value):

- Compatibility needs full rule coverage, consistent gating, and “why” explanations.
- Alternatives and guided stepper needed to prevent choice overload and dead ends.
- Offer selection, per-item retailer choice, and price confidence UX are incomplete.
- Build save to DB + publish + share stability across rule versions are incomplete.

Data gaps (credibility):

- Product images are sparse; product specs are incomplete for many planned rules.
- Plant pages need structured “type/origin/height range” plus citations for most entries.
- Must handle missing/conflicting data explicitly (confidence levels).

Auth/Accounts gaps:

- Real providers (Google + email) must be configured in prod and fully tested.
- User-owned builds and favorites require DB persistence + authorization.

Monetization gaps:

- Multiple retailers, more offers, and a refresh pipeline are needed for real usefulness.
- Affiliate/legal/cookie copy must be accurate and customer-facing.

Admin/Operations gaps:

- Admin UI to maintain catalog/rules/offers is required to avoid manual edits.
- Observability, rate limiting, and security headers are required for production safety.
