# Feature Set Option 1: Playtest & UX Lab

## Goal
Ship a fast iteration environment for balancing rules, validating UI decisions, and reducing player friction before deeper online features.

## Core Theme
Developer-grade playtesting controls + production-grade usability polish.

## Key Features
1. **Cheat/Debug Console**
- Toggle with `` ` `` key.
- Commands: `give <player> <resource> <count>`, `setvp <player> <vp>`, `roll <2-12>`, `devcard <player> <type>`, `nextphase`.
- One-click presets: “Robber test”, “Trade test”, “Endgame test”.

2. **Scenario Loader**
- Save/load local game snapshots.
- Curated test scenarios in `Documentation/` mapped to in-game fixtures.
- “Reproduce bug” action that captures state + last N actions.

3. **Action Timeline + Undo for Local Testing**
- Expandable move log with filters (build/trade/robber/dev cards).
- Step backward/forward through local game history.
- Highlight board elements affected by selected log event.

4. **UI Clarity Improvements**
- Contextual tooltips on all actionable buttons (cost, constraints, why disabled).
- “Why can’t I do this?” inline reason labels.
- Turn-phase checklist panel (“Roll → Build/Trade → End Turn”).

5. **Onboarding Layer**
- First-game guided overlays.
- Rule reminders based on phase and current selection.

## Multiplayer Tie-In
- Host-only debug mode for private lobbies to reproduce desyncs.
- Optional shared replay export for QA and user support.

## Implementation Phases
1. Debug console + command router.
2. Timeline/replay panel.
3. UX affordances and onboarding overlays.

## Success Metrics
- 40% faster bug reproduction time.
- Fewer invalid-action support reports.
- Higher completion rate for first full match.
