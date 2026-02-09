# ADR 0002: Error Reporting Vendor (v1)

Date: 2026-02-08

Related: `PLAN_EXEC.md` A-05

## Context

We need production error reporting with:

- Server + client exception capture.
- Request/route context (request ID).
- Alerting for spikes/regressions.

We want something low-effort to integrate on Vercel + Next.js and that does not require building our own alerting stack.

## Options Considered

Option A: Sentry (@sentry/nextjs)

- Pros: mature Next.js integration, server + client capture, alerting, good UI, supports request IDs and tags.
- Cons: adds a dependency and a third-party service; requires SENTRY_DSN configuration.

Option B: Vercel logs only

- Pros: zero dependencies.
- Cons: no aggregation/alerting, hard to correlate issues, easy to miss regressions.

Option C: Roll our own (DB table + cron + email alerts)

- Pros: full control.
- Cons: slow to build, easy to get wrong, adds operational burden.

## Decision

Choose Option A (Sentry) for v1. Keep the integration minimal:

- Initialize Sentry in server/client/edge entrypoints.
- Capture exceptions from route error boundaries.
- Tag with request ID and route.

## Consequences

- We must configure `SENTRY_DSN` (and optionally a public DSN) in Vercel env vars for production capture.
- If Sentry is not configured, the app should continue to work and log errors to stdout.

