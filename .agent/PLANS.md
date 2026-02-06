# Codex Execution Plans (ExecPlans)

This document describes the requirements for an execution plan ("ExecPlan"), a design document that a coding agent can follow to deliver a working feature or system change. Treat the reader as a complete beginner to this repository: they have only the current working tree and the single ExecPlan file you provide. There is no memory of prior plans and no external context.

## When to Use ExecPlans

Create an ExecPlan before beginning any task that meets one or more of these criteria:

- Touches 5 or more files
- Introduces a new page, route, or major component
- Modifies the database schema
- Implements or changes compatibility rules
- Involves infrastructure setup (Vercel, Cloudflare, Supabase, GitHub)
- Requires multi-step coordination (e.g., schema + API + UI + seed data)
- Will take more than 30 minutes of sustained work

For smaller, self-contained changes (fixing a bug in one file, updating copy, adding a test), skip the plan and just do the work.

## How to Use ExecPlans

When **authoring** an ExecPlan: follow this file to the letter. If it is not in your context, re-read the entire PLANS.md file. Be thorough in reading source material (especially `PLAN.md` and `AGENTS.md` at the repo root) to produce an accurate specification. Start from the skeleton below and flesh it out as you research.

When **implementing** an ExecPlan: do not prompt the user for "next steps" — simply proceed to the next milestone. Keep all sections up to date. Add or split entries in the Progress list at every stopping point to state progress made and next steps. Resolve ambiguities autonomously and commit frequently.

When **discussing** an ExecPlan: record decisions in the Decision Log. It should be unambiguously clear why any change to the specification was made.

## Requirements

NON-NEGOTIABLE:

- Every ExecPlan must be fully self-contained. It contains all knowledge and instructions needed for a novice to succeed.
- Every ExecPlan is a living document. Update it as progress is made, discoveries occur, and decisions are finalized.
- Every ExecPlan must produce demonstrably working behavior, not merely code changes.
- Every ExecPlan must define every term of art in plain language.
- Anchor the plan with observable outcomes: state what the user can do after implementation, the commands to run, and the outputs they should see.
- Validation is not optional. Include instructions to run tests and observe working behavior.

## Project-Specific Context

This project uses the stack defined in `AGENTS.md`:

- Next.js 14+ App Router, TypeScript strict, Tailwind CSS, Drizzle ORM, Supabase (PostgreSQL), tRPC, Zustand, pnpm
- The full product specification is in `PLAN.md` at the repo root
- Credentials are in `.secrets/` — see `AGENTS.md` "Secrets & Credentials" section for file locations and formats
- Authenticated CLIs: `vercel`, `gh` (GitHub CLI), `pnpm`
- The database schema is defined in `src/server/db/schema.ts`
- The compatibility engine is in `src/engine/`
- The builder Zustand store is in `src/stores/builder-store.ts`
- Hosting: Vercel. DNS: Cloudflare (DNS-only mode). DB: Supabase. Domain: plantedtanklab.com

Always reference specific file paths relative to the repo root. Always run `pnpm lint && pnpm typecheck && pnpm test` after completing each milestone.

## Skeleton of a Good ExecPlan

Save ExecPlans as `.agent/plans/YYYY-MM-DD-short-description.md`.

---

    # <Short, action-oriented description>

    This ExecPlan is a living document maintained in accordance with `.agent/PLANS.md`.

    ## Purpose / Big Picture

    Explain in a few sentences what someone gains after this change and how they can see
    it working. State the user-visible behavior you will enable.

    ## Progress

    Use a list with checkboxes to summarize granular steps. Every stopping point must be
    documented here.

    - [x] (2026-02-05 13:00Z) Example completed step.
    - [ ] Example incomplete step.
    - [ ] Example partially completed step (completed: X; remaining: Y).

    ## Surprises & Discoveries

    Document unexpected behaviors, bugs, optimizations, or insights discovered during
    implementation. Provide concise evidence.

    - Observation: …
      Evidence: …

    ## Decision Log

    Record every decision made while working on the plan:

    - Decision: …
      Rationale: …
      Date: …

    ## Outcomes & Retrospective

    Summarize outcomes, gaps, and lessons learned at major milestones or at completion.

    ## Context and Orientation

    Describe the current state relevant to this task as if the reader knows nothing. Name
    the key files and modules by full path. Define any non-obvious term.

    ## Plan of Work

    Describe, in prose, the sequence of edits and additions. For each edit, name the file
    and location and what to insert or change.

    ## Milestones

    ### Milestone 1: <name>

    Scope: what exists at the end that did not exist before.

    Steps:
    1. …
    2. …

    Validation: how to verify this milestone is complete (commands + expected output).

    ### Milestone 2: <name>
    …

    ## Validation and Acceptance

    Describe how to exercise the system and what to observe. Phrase acceptance as behavior
    with specific inputs and outputs.

    ## Idempotence and Recovery

    Can steps be repeated safely? If a step is risky, provide a retry or rollback path.

    ## Interfaces and Dependencies

    Name the libraries, modules, and services to use and why. Specify the types and
    function signatures that must exist at the end.
