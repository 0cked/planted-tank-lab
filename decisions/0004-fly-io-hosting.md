# ADR 0004: Move Hosting From Vercel To Fly.io

Date: 2026-02-10

## Context

PlantedTankLab’s competitive advantage is a trust-first ingestion + normalization pipeline.
That pipeline requires long-running workers, predictable scheduling, retries, and observability.

Vercel’s serverless model is a poor fit for:

- long-lived ingestion workers
- in-process schedulers
- reliable background execution without request/response coupling

We want a single deployable artifact that can run:

- the SSR web app (pages + API routes)
- dedicated workers (scraping/ingestion/normalization jobs)
- a lightweight scheduler (enqueue periodic ingestion jobs)

## Options Considered

1) Stay on Vercel for web, run workers elsewhere
- Pros: keep Vercel previews and zero-ops web deploys
- Cons: split operational surface area; harder to keep boundaries strict; more infra glue

2) Keep Vercel, emulate scheduling via cron hitting API routes
- Pros: minimal infra changes
- Cons: still request-path driven; fragile; long-running work doesn’t belong in API routes

3) Move web + workers to Fly.io (containerized, long-lived processes)
- Pros: supports long-running worker processes and schedulers; fewer serverless workarounds; clearer boundaries
- Cons: need Docker + Fly ops; previews require a different workflow

## Decision

Adopt **Fly.io** as the primary hosting platform for production:

- Deploy the SSR web app as a long-lived Node process.
- Run ingestion workers and the scheduler as separate Fly **process groups** in the same app image.
- Keep storage in Supabase Postgres (`DATABASE_URL`).

The architecture contract remains unchanged:

Raw ingestion → Normalization → Canonical storage → Cached derivatives → Presentation

## Consequences

- The repo must ship `Dockerfile` + `fly.toml` and document deploy/secrets.
- Offer refresh and future ingestion must be driven by the Fly scheduler + worker processes (not Vercel cron).
- We must operationalize:
  - environment variable handling (`fly secrets`)
  - process scaling (`fly scale count`)
  - logs (`fly logs`)

