# AGENTS.md -- Planted Tank Lab Agent Guidance

## For all AI agents (Claude, Codex, Copilot, etc.)

**Read these two files, then start coding:**

1. `TODO.md` -- what to work on (prioritized task list, work top to bottom)
2. `CLAUDE.md` -- how to work (architecture, rules, verification)

**The #1 failure mode for AI agents on this project is producing planning artifacts instead of code changes.** The previous agent created 34 markdown documents and spent 19 tasks polishing an internal diagnostics panel before making a single user-visible improvement. Do not repeat this. The only acceptable output is committed code that changes the production site.

## What "done" looks like

A task is done when ALL of these are true:

1. You modified source code files (`.ts`, `.tsx`, `.css`, `.yml`, etc.)
2. `pnpm typecheck && pnpm test && pnpm lint` all pass
3. A user visiting plantedtanklab.com would see or experience something different after deploy
4. You created zero new markdown/documentation files

If #3 is false, you did not complete a real task.

## What "done" does NOT look like

- A new planning document (no matter how well-written)
- A new diagnostics panel or debug overlay
- A refactored internal dev tool
- A summary of what you read in the codebase
- A checklist of sub-tasks you plan to do
- An analysis of tradeoffs between approaches
- A status update about your progress

All of the above are procrastination. Write code.

## Quick start for a new agent session

```
1. Read TODO.md -- find the first unchecked task
2. Read the 2-3 source files mentioned in that task
3. Make the code changes described
4. Run: pnpm typecheck && pnpm test && pnpm lint
5. Commit the changes
6. Move to the next task
```

Do not deviate from this loop. Do not "explore the codebase" first. Do not "understand the architecture" first. The task descriptions contain everything you need to know. Read more files only if you hit a specific blocker.

## Skill sources (for code quality reference only)

- `.wednesday/skills/wednesday-dev/SKILL.md` -- coding standards, complexity limits
- `.wednesday/skills/wednesday-design/SKILL.md` -- UI/UX patterns, component standards

## Verification

```bash
pnpm typecheck    # must pass
pnpm test         # must pass
pnpm lint         # must pass
```

If the task changes the visual builder, also verify visually in `pnpm dev` at `/builder`.
