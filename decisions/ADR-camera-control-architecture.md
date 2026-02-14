# ADR: Camera Control Architecture for Visual Builder

- **Status:** Accepted (planning)
- **Date:** 2026-02-14
- **Decision ID:** ADR-camera-control-architecture
- **Related tasks:** T004, T010, T012

## Context

Camera diagnosis found the current system is step-preset-dominant with per-frame convergence toward preset target/position and pan disabled. This creates snap-back behavior and undermines user perspective control.

Product requirement: immersive creative tool with full user camera agency (orbit/pan/zoom), no forced resets, and persistent camera state.

## Decision

Adopt a **User-Owned Camera Controller** architecture with explicit framing intents.

### Core decision points

1. **Single source of truth for camera state**
   - Maintain canonical camera pose state (`position`, `target`, `fov/zoom`) in a dedicated camera controller domain.

2. **Intent-based camera mutations**
   - Camera changes are allowed only via explicit intents:
     - user orbit/pan/zoom interaction
     - `FRAME_TANK`
     - `FOCUS_SELECTION`
     - `RESET_CAMERA`
     - optional one-time `INITIAL_FRAME` on new build load

3. **No continuous preset enforcement**
   - Remove per-frame camera blending to step presets during normal interaction.
   - Step changes may suggest framing actions but must not force camera movement.

4. **Pan support enabled by default in creative steps**
   - Orbit + zoom + pan are baseline capabilities.

5. **Persistence model**
   - Persist camera pose in session state and draft payload.
   - On draft reload, restore last pose unless user explicitly requests reset/frame.

## Trigger rules for framing

### Allowed auto-frame triggers
- First load of a build when no prior pose exists.
- Explicit user command (Frame Tank, Focus Selection, Reset Camera).

### Disallowed implicit triggers
- Step transition
- Tool mode switch
- Selection change without focus command
- Panel/layout state changes
- Ordinary scene rerenders

## Alternatives considered

## A) Keep step-driven cinematic preset system (rejected)
- **Pros:** consistent hero framing per step
- **Cons:** violates camera agency, causes snap-back, conflicts with product direction

## B) Hybrid with silent recenter timers (rejected)
- **Pros:** can recover framing after inactivity
- **Cons:** still surprises users and reintroduces hidden resets

## C) User-owned camera with explicit framing intents (chosen)
- **Pros:** predictable, immersive, aligns with creative-tool expectations
- **Cons:** requires careful controller/state refactor and explicit affordances

## Consequences

## Positive
- Eliminates primary snap-back root cause.
- Aligns runtime behavior with camera UX spec.
- Improves trust and spatial ownership during composition.

## Tradeoffs
- Requires migration from step-preset assumptions to camera intent system.
- Needs clear UI affordances for framing/focus/reset actions.

## Validation criteria

1. No snap-back after prolonged user navigation.
2. Camera pose remains stable through step changes and tool switches.
3. Focus/frame/reset actions are the only non-user-movement camera transitions.
4. Saved/reloaded drafts restore prior camera pose reliably.

## Implementation notes (for later phases)

- Keep camera controller independent from stepper state.
- Treat step metadata as optional framing hints, not authority.
- Add regression checks around events that previously triggered resets.
