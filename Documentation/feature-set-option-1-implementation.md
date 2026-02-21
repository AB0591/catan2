# Feature Set Option 1: Implementation Notes

## Status
Implemented in commit `6b684a8` on branch `feature/feature-set-option-1-playtest-and-ux-lab`.

This document describes what was actually shipped from `feature-set-option-1-playtest-and-ux-lab.md`.

## Implemented Features

### 1. Cheat/Debug Console
- Added a debug console overlay in `src/App.tsx`.
- Toggle key: `` ` `` (backtick).
- Supported commands:
  - `give <playerId> <resource> <count>`
  - `setvp <playerId> <vp>`
  - `roll <2-12>`
  - `devcard <playerId> <type>`
  - `nextphase`
  - `preset robber-test|trade-test|endgame-test`
- Parser/executor implemented in:
  - `src/debug/commands.ts`
  - `src/debug/types.ts`

### 2. Scenario Loader (Save/Load/Import/Export)
- Added scenario persistence and management:
  - Save current state snapshot
  - Load saved scenario
  - Import/export scenario JSON
  - Delete scenario
- Implemented in:
  - `src/debug/scenarioStorage.ts`
  - Store wiring in `src/store/gameStore.ts`
  - UI controls in `src/App.tsx`

### 3. Action Timeline + Replay-Based Undo/Time Travel
- Added timeline panel with:
  - action filters
  - range scrubber
  - jump to action step
  - `Resume From Here` (truncates future by rebasing live state)
  - `Return to Live`
- Replay uses `initialGameState + replayFromLog(...)`, not inverse action rollback.
- Implemented in:
  - `src/ui/timeline/ActionTimeline.tsx`
  - Store replay state/actions in `src/store/gameStore.ts`

### 4. UI Clarity / Disabled Reasons
- Added centralized reason helpers:
  - `src/ui/reasons/actionReasons.ts`
- Applied to controls:
  - Roll Dice (`src/ui/diceRoll/DiceRoll.tsx`)
  - Build actions (`src/ui/buildMenu/BuildMenu.tsx`)
  - Dev card area (`src/ui/devCardHand/DevCardHand.tsx`)
  - End Turn / Trade messaging (`src/App.tsx`)

### 5. Onboarding Layer (Lightweight Coachmarks)
- Added phase-aware coachmarks and persistence:
  - start screen
  - first turn
  - build phase
  - dev card intro
- Implemented in:
  - `src/ui/onboarding/Coachmark.tsx`
  - onboarding state/persistence in `src/store/gameStore.ts`

## Safety / Environment Controls
- Debug features are gated by:
  - `import.meta.env.DEV`, or
  - `VITE_ENABLE_DEBUG_TOOLS=true`
- In non-debug builds, `runDebugCommand` returns disabled status.

## Tests Added/Updated
- New:
  - `src/debug/__tests__/commands.test.ts`
  - `src/debug/__tests__/scenarioStorage.test.ts`
- Updated:
  - `src/ui/__tests__/gameStore.test.ts` (replay + debug behavior)
- Validation at implementation time:
  - `npm run lint` passed
  - `npm test` passed (`20` files / `156` tests)

## Known Gap vs Original Concept
- Timeline currently supports replay scrubbing and action navigation, but does **not yet highlight board elements affected by the selected action**.
