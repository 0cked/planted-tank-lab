PlantedTankLab is “PCPartPicker for planted aquariums.” Build a planted tank setup by selecting compatible gear and plants, with instant compatibility feedback and price comparisons.

## Start Here (Humans + Agents)

- **Single source of truth (status + next work):** `AUTOPILOT.md`
- **Execution checklist (task IDs + acceptance criteria):** `PLAN_EXEC.md`
- **Ready-now queue:** `TODO.md`
- **Verification playbook:** `VERIFY.md`
- **Append-only session log:** `PROGRESS.md`
- **Launch gates dashboard:** `pnpm verify:gates` (reads `config/gates.json`)

If anything conflicts with chat history or older docs, `AUTOPILOT.md` wins.

## Quickstart (Local Dev)

1) Install deps:

```bash
pnpm install
```

2) Configure env:

- Copy `.env.example` to `.env.local` and fill values (never commit `.env.local`).
- DB is Supabase Postgres (see `DATABASE_URL`).
- Auth is NextAuth (Google + optional email magic links).

3) Apply schema + seed:

```bash
pnpm drizzle-kit migrate
pnpm seed
```

4) Run:

```bash
pnpm dev
```

## Commands

- `pnpm verify` lint + typecheck + unit + e2e smoke + build
- `pnpm verify:gates` prints launch gates (G0–G11) pass/fail/unknown
- `pnpm test` unit tests (Vitest)
- `pnpm test:e2e` e2e smoke tests (Playwright)
- `pnpm ingest run` backend-only ingestion worker (processes queued ingestion jobs; no request-path scraping)

## Auth + Admin

### Login

Login UI is at `/login`. Auth providers are enabled only if env vars are present:

- Google SSO: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Email magic links (optional): `EMAIL_SERVER`, `EMAIL_FROM` (SMTP via Nodemailer)

Google OAuth redirect URIs must include:

- `https://plantedtanklab.com/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`

### Admin Dashboard

Admin routes live under `/admin` and intentionally return **404** for signed-out and non-admin users.

To grant admin access, set `ADMIN_EMAILS` (comma-separated list) to include the exact email you sign in with, then sign out/in so the JWT role refreshes.

## Key URLs

- `/` home
- `/builder` builder
- `/products` and `/products/[category]` product browse
- `/plants` and `/plants/[slug]` plant browse/detail
- `/builds` community builds
- `/admin` admin dashboard (admin-only)
