# PlantedTankLab - Agent Instructions (Minimal)

This file defines baseline repository constraints only.
It intentionally does not prescribe any planning workflow.

## Core Engineering Rules

- Use TypeScript strict mode; avoid `any`.
- Keep changes small, testable, and production-safe.
- Prefer existing patterns in the repo over introducing new abstractions.
- Use Drizzle ORM for database access and schema changes.
- Do not add dependencies unless clearly justified.

## Security and Privacy

- Never commit secrets (`.secrets/`, `.env.local`, API keys, tokens).
- Keep privileged operations server-side.
- Enforce auth/role checks on admin and mutating routes.
- Do not expose affiliate tags or private provider credentials in client code.

## Data and Architecture

- Treat ingestion, normalization, and presentation as separate concerns.
- Do not fetch third-party sources directly from UI components.
- Preserve source provenance where relevant.
- Favor deterministic behavior over implicit heuristics.

## UX and Quality

- Prioritize clarity, responsiveness, and accessibility.
- Ensure mobile and desktop layouts both work.
- Avoid console errors and broken interactions.

## Verification Baseline

Before finalizing substantial changes, run:

- `pnpm lint`
- `pnpm typecheck`
- relevant tests for touched areas

## Deployment Context

- Primary deployment target is Fly.io.
- Keep deployment and runtime config consistent with `fly.toml`.
