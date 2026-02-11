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
- `pnpm ingest daemon` long-running ingestion worker (for Fly worker process)
- `pnpm ingest schedule --loop` long-running scheduler (enqueues periodic ingestion jobs)

## Deployment (Fly.io)

This project is designed to run as long-lived services (web + workers) on Fly.io.

### Prereqs

```bash
brew install flyctl
fly auth login
```

### Initial Setup

1) Create the Fly app (name must be globally unique):

```bash
fly apps create plantedtanklab-web
```

If you pick a different name, update `fly.toml` (`app = "..."`).

2) Set secrets:

```bash
fly secrets set \\
  DATABASE_URL="postgresql://..." \\
  NEXT_PUBLIC_SUPABASE_URL="https://....supabase.co" \\
  NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \\
  SUPABASE_SERVICE_ROLE_KEY="..." \\
  NEXTAUTH_SECRET="..." \\
  NEXTAUTH_URL="https://plantedtanklab.com" \\
  GOOGLE_CLIENT_ID="..." \\
  GOOGLE_CLIENT_SECRET="..." \\
  ADMIN_EMAILS="admin@plantedtanklab.com,jtk1014@gmail.com"
```

3) Deploy:

```bash
fly deploy
```

4) Ensure workers are running:

```bash
fly scale count app=1 worker=1 scheduler=1
```

### GitHub Actions Auto-Deploy (optional)

The repo includes `.github/workflows/fly-deploy.yml`. To enable it, add a GitHub Actions secret:

- `FLY_API_TOKEN` (Fly API token with deploy permissions)

### Custom Domain (Cloudflare DNS-only)

1) Add certs:

```bash
fly certs add plantedtanklab.com
fly certs add www.plantedtanklab.com
```

2) Get the app IPs:

```bash
fly ips list
```

3) In Cloudflare DNS (DNS-only / not proxied):

- Point apex `plantedtanklab.com` to the Fly IP(s) (A/AAAA).
- Point `www` to the Fly hostname (`CNAME` to `plantedtanklab-web.fly.dev`) or the IP(s).

## Auth + Admin

### Login

Login UI is at `/login`. Auth providers are enabled only if env vars are present:

- Google SSO: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Email magic links (optional):
  - Resend (recommended): `RESEND_API_KEY`, `EMAIL_FROM`
  - SMTP (fallback): `EMAIL_SERVER`, `EMAIL_FROM` (via Nodemailer)

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
