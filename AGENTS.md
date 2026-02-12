# PlantedTankLab - Agent Contract

This file is authoritative for how coding agents must operate in this repository.

## 1) Source of Truth

- Single planning/checkpoint system: `PLANS.md`.
- Do not create additional roadmap/checkpoint/progress files.
- Historical planning docs live only under `archive/planning/*` and are non-authoritative.

Required startup steps for every session:
1. Read `AGENTS.md`.
2. Read `PLANS.md`.
3. Start with the first unchecked task in `PLANS.md`.

Required execution loop:
1. Implement task end-to-end.
2. Add/update tests.
3. Run verification commands relevant to the task.
4. Mark the task complete in `PLANS.md` only after passing checks.
5. Commit with a conventional commit message.

## 2) Product Direction Lock

Primary product direction is now **Visual Builder v1**.

Visual Builder is a core subsystem (not a widget) and must:
- integrate with catalog + compatibility + affiliate systems,
- persist/share builds reliably,
- remain compatible with future 3D simulation expansion,
- stay performant and production-ready.

## 3) Architecture Contract (Non-Negotiable)

Data architecture is structurally enforced:

`Raw ingestion -> Normalization -> Canonical storage -> Cached derivatives -> Presentation`

Rules:
- No external data fetching in UI/tRPC presentation paths.
- No reconciliation logic outside normalization.
- Presentation reads canonical/preprocessed data only.
- Ingestion and scraping run in background processes (worker/scheduler), never in request/response paths.

## 4) Deployment + Runtime

- Hosting: Fly.io (`web`, `worker`, `scheduler` processes).
- Database: Supabase Postgres via `DATABASE_URL`.
- ORM: Drizzle only (no raw SQL in app logic).
- Auth: NextAuth (Google + email magic links).
- Package manager: pnpm.

## 5) Visual Builder v1 Requirements

The implementation must provide:
- Tank selection with proportional visual canvas.
- Drag/drop placement for hardscape/plants and transform controls (position/scale/rotation/layer).
- Live BOM with quantities, costs, and purchase links.
- Compatibility warnings with clear severity.
- Save, share, duplicate, reset, and PNG export.
- Affiliate-safe purchase routing through server redirects.

Data model expectations:
- Build-level `tank_id` and `canvas_state` persistence.
- Serializable canvas item shape with:
  - `assetId`, `x`, `y`, `scale`, `rotation`, `layer`.

## 6) Security + Trust Constraints

- Never expose affiliate secrets/templates in client code.
- Never bypass RLS/role checks for admin routes.
- Never commit `.secrets/`, `.env.local`, or real credentials.
- Keep provenance/trust boundaries intact for catalog data.

## 7) UX + Engineering Quality Bar

- Premium, minimal, dark-first visual style for Visual Builder.
- Clear information hierarchy and obvious next actions.
- Mobile-responsive layout.
- No console errors.
- Strict TypeScript + clean lint required before completion.

## 8) Test/Verification Baseline

At minimum before marking substantial work complete:
- `pnpm lint`
- `pnpm typecheck`
- targeted `pnpm test` for affected modules
- `pnpm test:e2e` for smoke flows when routing/critical UX changed

## 9) Repo Hygiene

Before starting major features/refactors:
- Remove/archive obsolete experiments and conflicting docs.
- Avoid duplicate state systems and conflicting architectural notes.
- Keep module ownership explicit and auditable.

## 10) Secrets + Local Credentials

Secrets are stored in `.secrets/` and must be trimmed when read.
Typical folders:
- `.secrets/supabase/`
- `.secrets/cloudflare/`
- `.secrets/resend/`

Never print or commit secret values.

## 11) Git Discipline

- Use conventional commit messages (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- One logical change per commit when practical.
- Do not amend/rewrite history unless explicitly requested.
