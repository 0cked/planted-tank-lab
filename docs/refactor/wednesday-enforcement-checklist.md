# Wednesday Skill Enforcement Checklist (T023)

Date: 2026-02-15
Scope: Define implementation-time enforcement rules requiring Wednesday design/dev standards during Builder overhaul.
Status: Planning artifact (no implementation).

Inputs:
- `docs/refactor/PLAN_REVIEW_PACKET.md` (T022)
- `docs/refactor/phased-delivery-plan.md` (T020)
- `docs/refactor/implementation-backlog-skeleton.md` (T021)
- `skills/wednesday-design/SKILL.md`
- `skills/wednesday-dev/SKILL.md`

## 1) Enforcement Policy

All Builder overhaul implementation work (T024+) must pass both:
1. **Wednesday Design compliance** (component sourcing, visual consistency, accessibility).
2. **Wednesday Dev compliance** (code quality, maintainable architecture, predictable standards).

No story is considered done unless both checks are explicitly verified in PR review.

## 2) Mandatory Design Rules (from Wednesday Design)

- Use approved component libraries only; no custom UI components without explicit exception approval.
- Prefer token-driven styling and consistent visual hierarchy.
- Preserve accessibility requirements (contrast, keyboard focus, reduced-motion support).
- Keep interaction/motion purposeful and performance-safe.

### Design PR Checklist
- [ ] Components sourced from approved library stack
- [ ] No ad-hoc component reinvention
- [ ] Tokens used for styling overrides
- [ ] Accessibility checks documented
- [ ] Motion behavior reviewed for performance + reduced-motion

## 3) Mandatory Dev Rules (Wednesday Dev baseline)

- Keep implementations simple, typed, and modular.
- Respect naming/import/convention consistency.
- Limit per-file/per-function complexity to maintain readability.
- Add tests/validation hooks for behavior-sensitive systems (camera/substrate/flow).

### Dev PR Checklist
- [ ] File/function complexity is within agreed maintainability bounds
- [ ] Naming/import conventions followed consistently
- [ ] Type safety preserved (no avoidable weak typing)
- [ ] Story-linked acceptance criteria traceability present
- [ ] Validation/test updates included where behavior changed

## 4) Enforcement by Overhaul Area

## A. UI Composition / IA (T024)
- **Design enforcement:** approved layout/panel components only; stage-first hierarchy preserved.
- **Dev enforcement:** composable step surfaces, low coupling between step logic and view shell.

## B. Visual Spec Package (T025)
- **Design enforcement:** tokenized colors/typography/motion; approved effect components.
- **Dev enforcement:** centralized token usage and minimal style duplication.

## C. Camera Implementation Plan (T026)
- **Design enforcement:** interaction affordances clear and non-intrusive.
- **Dev enforcement:** camera ownership boundaries enforced per ADR; no hidden side-effects.

## D. Substrate Implementation Plan (T027)
- **Design enforcement:** editing affordances/feedback remain readable and focused.
- **Dev enforcement:** deterministic edit transaction boundaries and testability.

## E. Performance Guardrails (T028)
- **Design enforcement:** visual enhancements must stay within performance budgets.
- **Dev enforcement:** instrumentation and profiling gates required at phase exits.

## F. Overhaul Sprint Plan / Kickoff (T029–T030)
- **Design enforcement:** all streams map to approved design primitives.
- **Dev enforcement:** all streams map to maintainable implementation ownership + AC traceability.

## 5) Review Workflow Integration

Each implementation PR must include:
1. Linked story ID and phase.
2. Linked AC IDs.
3. Linked telemetry/KPI impacts (if any).
4. Completed Wednesday design+dev checklist section.
5. Explicit reviewer sign-off for both dimensions.

## 6) Exception Process

Exceptions are rare and must include:
- Reason approved libraries/patterns are insufficient.
- Proposed alternative and risk assessment.
- Temporary/permanent decision label.
- Named approver.

Without explicit approval, exceptions are blocked.

## 7) Audit Cadence

- Weekly rollout review during overhaul execution.
- Gate review at each phase exit (A-E from phased plan).
- Record violations and corrective actions in sprint review notes.

## 8) Exit Criteria Check (T023 DoD)

- [x] Enforcement baseline defined for Wednesday design + dev
- [x] Major implementation areas mapped to required checks
- [x] PR/review workflow integration specified
- [x] Exception handling and audit cadence documented
