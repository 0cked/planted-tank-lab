# ADR 0003: Dedicated Ingestion + Normalization Pipeline (Trust-First Architecture)

Date: 2026-02-10

Related tasks: (tracked in `PLANS.md`) ingestion/normalization hardening milestones

## Context

PlantedTankLab’s moat is **trusted data**: products, plants, prices, availability, and metadata.
To be production-grade and maintainable, we must prevent “scrape in the UI/API” drift and ensure
every downstream system (builder, compatibility, catalog, comparisons, price views) is driven by
**canonical, normalized** entities with field-level provenance and deterministic conflict resolution.

## Options Considered

1. **Ad-hoc ingestion in API routes / cron endpoints**
   - Pros: fastest to ship.
   - Cons: violates separation of concerns, harder to observe/retry, easy to introduce ToS/abuse risks,
     difficult to guarantee determinism and provenance.

2. **Dedicated ingestion runner + normalization layer (separate modules + job tables)**
   - Pros: enforces architectural boundaries; supports idempotency, retries, provenance; reduces
     risk of accidental external fetching in presentation layers; makes correctness auditable.
   - Cons: more upfront work; requires a scheduler/worker execution story.

3. **External ETL platform (Airbyte/Fivetran/etc.)**
   - Pros: mature scheduling/observability.
   - Cons: heavy operational dependency; harder to encode domain-specific normalization rules and
     manual override workflows; less “in-repo” determinism.

## Decision

Adopt **Option 2**:

- Implement a backend-only ingestion subsystem (`src/server/ingestion/*`) that:
  - fetches external sources
  - stores raw payloads + extracted structured fields
  - records provenance, timestamps, and trust per field
  - is idempotent and retry-safe
  - runs outside request/response paths (CLI/worker/scheduler)

- Implement a normalization subsystem (`src/server/normalization/*`) that:
  - maps source entities to canonical entities deterministically
  - resolves duplicates/conflicts via explicit precedence rules
  - supports admin overrides that always win
  - updates canonical tables used by the app UI

- API routes may enqueue ingestion jobs but must not fetch external sources.

## Consequences

- We will refactor any existing “fetch external” logic out of API routes/admin routes into the ingestion runner.
- Seed/import scripts must flow through ingestion → normalization (no direct canonical writes without provenance).
- We must define and document:
  - source trust levels
  - precedence rules
  - cache invalidation hooks for derived views
- Scheduling will be done via an external scheduler invoking the ingestion runner (local cron / GitHub Actions / dedicated worker),
  not via request-path execution.
