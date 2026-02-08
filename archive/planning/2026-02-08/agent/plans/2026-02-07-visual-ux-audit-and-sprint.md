# 2026-02-07 Visual/UX Audit + Full-Day Sprint Plan

## Audit (Playwright)

Artifacts:
- Screenshots: `tmp-next/audit/*-(viewport|full).png`
- JSON report: `tmp-next/audit/report.json`

What’s shipping well:
- Strong aquascape vibe in the hero: the lush photo + fog gradient reads “aquascaping”, not generic SaaS.
- Surfaces are coherent (glass/stone/sand/slate) and mostly consistent across pages.
- Builder core flow is functional and the stepper improves clarity.

Primary UX/design issues found (customer-facing):
- Typography system is inconsistent: many headings hardcode display font inline; interior pages don’t share a consistent hierarchy (kicker/title/subtitle/lede).
- “Utility/dev” language still appears on customer pages (example: product category page says “Filters are query-param based”).
- Mobile filter UX is heavy: filters render as a full stack above results, causing long scroll before seeing content.
- Empty states are sterile (Builds page especially): too much blank space and no visual invitation.
- Image system is half-done: plants have images; products often show gradients; admin only supports plant uploads (no product photo upload).
- Motion is minimal: the page feels static compared to the “living ecosystem” visual direction.

## Sprint Goals (End Of Day)

- Consistent typography hierarchy across the whole site (display vs UI vs body).
- Mobile filters become a drawer; results become immediately visible.
- Product photos can be uploaded and hosted in Supabase Storage; plant/product lists render those images correctly.
- Subtle motion (reveals + hover depth) added while respecting reduced-motion.
- Remove remaining internal/dev copy and tighten hobby-native language.

## Execution Plan (Phases + Checklists)

### Phase A (Typography System)
- [x] A1 Add typography utility classes in `src/app/globals.css` (`ptl-hero-title`, `ptl-page-title`, `ptl-kicker`, `ptl-lede`, `ptl-prose`).
- [x] A2 Replace inline `style={{ fontFamily: "var(--font-display)" }}` across public pages with the new classes.
- [x] A3 Upgrade About/Privacy/Contact pages to use `ptl-prose` and better spacing.

### Phase B (Image System: Supabase + Standards)
- [x] B1 Add product photo upload endpoint (mirror the plant upload route) and UI in admin product edit.
- [x] B2 Allow Next/Image optimization for Supabase Storage host (auto-detect host from `NEXT_PUBLIC_SUPABASE_URL`).
- [x] B3 Standardize product/plant card image ratios and placeholders.

### Phase C (Mobile Filters)
- [x] C1 Plants: convert filters sidebar into a mobile drawer (button + count + “reset”).
- [x] C2 Products category page: convert filters sidebar into a mobile drawer.

### Phase D (Motion)
- [x] D1 Add a small motion system in CSS (fade-up reveal, hover lift) with reduced-motion support.
- [x] D2 Apply reveals to the home sections and list/card grids.

### Phase E (Copy + Empty States)
- [x] E1 Remove remaining internal/dev copy (“query-param based”, “not configured yet”, “coming soon” phrasing) from customer pages.
- [x] E2 Improve Builds empty state to feel intentional (visual surface + CTA + explanation).

### Phase F (Verify + Ship)
- [x] F1 `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`.
- [x] F2 Commit, push `origin/main`, deploy `vercel --prod --yes`.
- [x] F3 Refresh Playwright audit screenshots for key pages.
