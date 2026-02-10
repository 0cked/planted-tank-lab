# PLAN_EXEC - v1 Launch Execution Checklist (14-Day Plan)

This is the authoritative execution checklist for shipping a credible public v1.

For current status and what to do next, see `AUTOPILOT.md`.

## Legend

- Priority: P0 (required for v1) / P1 (strongly recommended) / P2 (nice-to-have)
- Gates: G0-G11 (see `config/gates.json` + `pnpm verify:gates`)
- Verify: commands and/or manual QA steps required to mark the task complete

## Milestone OPS - Repo Operating System (Single Source Of Truth)

- [x] OPS-01 (P0) Archive legacy planning/tracking artifacts (single source of truth).
  Gates: G7
  Acceptance: legacy tracking docs moved under `archive/planning/YYYY-MM-DD/`; `archive/planning/README.md` points to `AUTOPILOT.md`; no other planning systems remain.
  Verify: `git status --porcelain` clean after commit; manual: confirm root contains only the new tracking files.
  Dependencies: none

- [x] OPS-02 (P0) Add tracking artifacts: `AUTOPILOT.md`, `PLAN_EXEC.md`, `PROGRESS.md`, `VERIFY.md`, `TODO.md`.
  Gates: G7
  Acceptance: new files exist and are usable to resume in <2 minutes; `PROGRESS.md` is append-only.
  Verify: open files; follow `AUTOPILOT.md` resume instructions.
  Dependencies: OPS-01

- [x] OPS-03 (P0) Gate dashboard: `config/gates.json` + `scripts/gates.ts` + `pnpm verify:gates`.
  Gates: G7
  Acceptance: `pnpm verify:gates` prints G0-G11 with pass/fail/unknown, last-verified timestamps, and guidance; exits non-zero only if any gate is `fail`.
  Verify: `pnpm verify:gates`
  Dependencies: OPS-02

- [x] OPS-04 (P0) One-command verification: `pnpm verify`.
  Gates: all
  Acceptance: `pnpm verify` runs lint + typecheck + unit tests + e2e smoke (and build) in a deterministic order.
  Verify: `pnpm verify`
  Dependencies: OPS-02

- [x] OPS-05 (P0) ADR system in repo (`decisions/*`) and linked from `AUTOPILOT.md`.
  Gates: G7
  Acceptance: `decisions/README.md` exists; decisions are recorded for high-impact choices (rate limiting store, error reporting vendor).
  Verify: open docs; ensure linked from `AUTOPILOT.md`.
  Dependencies: OPS-02

- [x] OPS-06 (P0) Update `AGENTS.md` to align with Autopilot system; archive other agent-instruction systems.
  Gates: G7
  Acceptance: `AGENTS.md` declares `AUTOPILOT.md` as the sole authority for status/next work; startup ritual and loop are documented; no references to archived planning systems remain.
  Verify: open `AGENTS.md`; confirm references.
  Dependencies: OPS-01, OPS-02

## Milestone A (Days 1-3) - Safe To Be Public

- [x] A-01 (P0) Route error boundaries + not-found UX for core pages.
  Gates: G5
  Acceptance: `error.tsx` + `not-found.tsx` exist at root and for core segments; no "blank screen" on thrown errors; users get a recovery CTA.
  Verify: `pnpm test:e2e`; manual: force a throw in a page and confirm error UI appears.
  Dependencies: OPS-04

- [x] A-02 (P0) Baseline security headers (non-breaking).
  Gates: G5, G1, G9
  Acceptance: responses include HSTS (prod), X-Content-Type-Options, Referrer-Policy, Permissions-Policy; CSP deferred unless proven safe.
  Verify: `curl -I https://plantedtanklab.com | rg -n \"strict-transport|x-content-type|referrer-policy|permissions-policy\"`
  Dependencies: OPS-04

- [x] A-03 (P0) Rate limiting for hot endpoints.
  Gates: G6
  Acceptance: `/go/*`, `/api/trpc/*`, and build/share endpoints return 429 under abuse; limits are documented; implementation recorded in an ADR.
  Verify: `pnpm verify:gates`; manual: run a quick loop with `curl` and observe 429s.
  Dependencies: OPS-05

- [x] A-04 (P0) Structured server logging + request IDs.
  Gates: G7
  Acceptance: server logs include request ID and route; errors include request ID; no PII in logs by default.
  Verify: manual: hit key routes and inspect logs (Vercel + local).
  Dependencies: A-02

- [x] A-05 (P0) Error reporting + alerting.
  Gates: G7
  Acceptance: production captures server and client exceptions with route context; alerting enabled for spikes; PII scrubbed.
  Verify: manual: trigger a controlled error and confirm capture.
  Dependencies: OPS-05

## Milestone B (Days 4-7) - Trust & Ops

- [x] B-01 (P0) Compatibility rules "required specs" contracts + missing-data UX.
  Gates: G4, G9
  Acceptance: each shipped rule declares required spec keys; engine emits "insufficient data" when missing; curated mode fails closed.
  Verify: `pnpm test`; add unit tests for at least 3 missing-data scenarios.
  Dependencies: none

- [x] B-02 (P0) Admin categories CRUD + reorder.
  Gates: G4
  Acceptance: admin can edit and reorder categories; builder step order reflects `display_order`/workflow rules.
  Verify: manual via `/admin/categories`; `pnpm test:e2e` smoke (optional).
  Dependencies: A-01

- [x] B-03 (P0) CSV exports (products, plants, offers).
  Gates: G4, G7
  Acceptance: admin can export CSV; exports include stable IDs; exports are auditable.
  Verify: manual download; open in Sheets; unit test CSV formatting.
  Dependencies: B-02

- [x] B-04 (P1) Expand audit logging coverage.
  Gates: G7
  Acceptance: product save/upload, plant save/upload, categories edits, offer edits log to `admin_logs`.
  Verify: manual: perform actions and check `/admin/logs`.
  Dependencies: B-02

- [x] B-05 (P1) Data quality dashboard (missing images/offers/specs).
  Gates: G4, G7
  Acceptance: admin page lists missing-data hot spots and links to edit pages.
  Verify: manual.
  Dependencies: B-01, B-02

## Milestone C (Days 8-10) - Feels Complete

- [x] C-01 (P0) Curated catalog completeness pass (core flow).
  Gates: G4, G0, G9
  Acceptance: every curated core item has photo + key specs + at least 1 offer; builder completion feels coherent.
  Verify: `pnpm catalog:check`; manual spot-check.
  Dependencies: B-03

- [x] C-02 (P0) Plant content baseline for top 30 plants.
  Gates: G9, G0
  Acceptance: top plants have description + key fields + at least 1 citation; images consistent.
  Verify: manual review checklist (in `VERIFY.md`).
  Dependencies: none

- [x] C-03 (P0) Builder Phase A UX overhaul (drawer/bottom sheet picker + compatibility-first flow).
  Gates: G0, G5, G9
  Acceptance:
    - Picking an item uses a scroll-safe full-height drawer (desktop) / bottom sheet (mobile).
    - No picker content can go off-screen without a scrollbar (fix the current “modal goes off screen” issue).
    - Compatibility shapes what’s selectable: incompatible options are hidden by default with a clear “Show hidden” toggle.
    - “Next step” CTA is obvious and takes users directly into the next picker (no “use the row’s Choose button” copy).
  Visual QA punchlist (2026-02-10):
    - Fix builder row action label grammar: “Choose an accessory”/“Choose accessories” (no “a Accessories”).
    - Ensure cursor/hover states exist on all interactive row actions.
    - Empty pricing states read intentionally (“No offers yet”) and don’t feel broken.
  Verify:
    - `pnpm test:e2e` (builder smoke includes opening a picker, scrolling, selecting, and proceeding).
    - Manual QA on mobile: open picker, scroll list, select, proceed to next step.
  Dependencies: B-01

- [x] C-04 (P0) Auth entrypoint is non-broken (Sign in doesn’t 404).
  Gates: G0, G9
  Acceptance: clicking the top-nav "Sign in" never lands on a 404. Either:
    - implement the sign-in page/flow, OR
    - hide/disable the CTA with a clear "Sign in coming soon" explanation.
  Verify: manual: click "Sign in" from Home/Builder/Products/Plants/Builds; confirm non-404 recovery path.
  Dependencies: A-01

- [x] C-05 (P1) Shared build snapshot page: nav state + CTA clarity.
  Gates: G0
  Acceptance:
    - Top nav highlights the correct section when viewing `/builds/:id`.
    - "Open in builder" consistently opens the builder (and preserves build state), and copy makes it clear what will happen.
  Verify: manual: create a share link; open it in a fresh session; click Products/Plants/Builder in nav; ensure no confusing active-state.
  Dependencies: C-03

- [ ] C-06 (P0) Content + imagery baseline (products + plants + hardscape) + big-brand catalog depth.
  Gates: G0, G9
  Acceptance:
    - Core product categories have real images (no obvious placeholders) for curated picks.
    - For big-name brands (starting with tanks): catalog coverage feels "PCPartPicker-complete" within the brand.
      - Examples: UNS + ADA tank lineups include the standard sizes/variants people expect.
    - Add missing categories/data needed for real builds (e.g., hardscape) OR hide them intentionally with "coming soon" copy.
    - Top plants and core products show credible images + key fields; obvious gaps are reduced.
    - "No offers yet" and other empty states feel intentional and help users move forward.
  Visual QA punchlist (2026-02-09):
    - Plants index: actually show images for curated picks (or add consistent placeholders + a near-term fill plan).
    - Plant detail pages: fill missing fields or hide rows (Origin/Family), and format enum labels (e.g., `Water_column` → “Water column”).
    - Product category pages: add light imagery for categories (currently very text-only).
    - Hardscape: many items show no price/offers; decide whether to hide price column when missing vs show `—`, and prioritize adding at least 1 offer for top N.
  Verify: daily visual QA checklist + spot-check on mobile.
  Dependencies: C-01, C-02

- [ ] C-07 (P1) Builder Phase B polish (selection cards + warnings clarity + mobile pass).
  Gates: G0, G9
  Acceptance:
    - Picker list items are photo-forward and show 2-4 key specs + badges (Fits / Incompatible / Can’t verify).
    - Warnings panel is grouped by severity and reads as “what to fix next”.
    - Mobile builder layout remains fast and ergonomic (no cramped tables; key actions reachable).
  Verify: `pnpm test:e2e`; manual on mobile.
  Dependencies: C-03

- [ ] C-08 (P1) Phase C browsing polish (products + plants feel like a hobby catalog).
  Gates: G0, G9, G10
  Acceptance:
    - Products and Plants lists are image-forward with meaningful preview chips.
    - Copy pass: remove internal jargon everywhere (no “seeded”, “MVP”, etc).
    - Hero treatments (home) are properly cropped/overlaid; key CTAs look intentional.
  Verify: manual; `pnpm test:e2e` smoke.
  Dependencies: C-06

## Milestone D (Days 11-14) - Launchable

- [ ] D-01 (P0) Consent-respecting analytics/events (minimal).
  Gates: G8, G9
  Acceptance: track builder started, share created, offer click, signup completed; respects cookie consent.
  Verify: manual event generation; inspect DB/provider.
  Dependencies: A-02

- [ ] D-02 (P0) Report-a-problem intake + admin triage.
  Gates: G9, G7
  Acceptance: users can report product/plant data issues; stored in DB; admin can review and resolve.
  Verify: manual end-to-end submission + admin view.
  Dependencies: B-02

- [ ] D-03 (P0) Terms page + final copy/legal sweep.
  Gates: G9
  Acceptance: `/terms` exists; affiliate disclosure consistent; privacy reflects actual collection.
  Verify: manual.
  Dependencies: none

- [ ] D-04 (P0) Final QA + performance checks + "go/no-go" gate verification.
  Gates: all
  Acceptance: `pnpm verify` passes; `pnpm verify:gates` has no `fail`; manual QA checklist complete.
  Verify: `pnpm verify && pnpm verify:gates`
  Dependencies: all prior P0 tasks
