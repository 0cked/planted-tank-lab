# ADR 0001: Rate Limiting Store (v1)

Date: 2026-02-08

Related: `PLANS.md` (legacy reference: A-03)

## Context

We need basic abuse protection for hot endpoints (especially `/api/trpc/*` and `/go/*`) to protect:

1. Database capacity (prevent cheap request floods).
2. Affiliate redirect integrity (prevent click-spam and expensive lookup loops).

The solution must be low-dependency and deployable on the current Vercel + Next.js setup.

## Options Considered

Option A: Edge in-memory fixed-window limiter (Next.js middleware)

- Pros: zero new infrastructure, fast to ship, runs before hitting route handlers/DB.
- Cons: best-effort only (per-region, resets on cold starts, not shared across isolates).

Option B: Postgres-backed limiter (store counters in DB)

- Pros: globally consistent and durable across instances.
- Cons: adds DB writes/locks on every request (amplifies abuse), higher latency, more failure modes.

Option C: Redis/KV-backed limiter (Upstash/Vercel KV/etc)

- Pros: globally consistent, fast, purpose-built for rate limiting.
- Cons: adds a new vendor, secrets, and a dependency; more setup for v1.

## Decision

Choose Option A for v1: implement a fixed-window, in-memory rate limiter in `src/middleware.ts` with clear interfaces so we can swap to Option C when traffic justifies it.

## Consequences

- We get immediate protection against naive abuse without blocking the release.
- Sophisticated/distributed abuse may still bypass limits; if that becomes a problem, migrate to Redis/KV.
