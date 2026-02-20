# Step 4: Turn Engine

## Overview
Implements the core action dispatching system as a pure function.

## Files
- `src/engine/turnManager/turnManager.ts` — Core dispatch logic
- `src/engine/turnManager/index.ts` — Re-exports
- `src/engine/turnManager/__tests__/turnManager.test.ts` — Unit tests

## API

### `dispatchAction(action, state): GameState`
Pure function — no mutation. Returns new state with action applied.

### `appendAction(state, action): GameState`
Returns state with action appended to `actionLog`.

## Supported Actions

### `ROLL_DICE` `{ die1, die2 }`
- Sets `lastDiceRoll`
- total=7 → `turnPhase: 'robber'`
- total≠7 → `turnPhase: 'postRoll'`

### `END_TURN`
- Advances `currentPlayerIndex` (wraps around)
- Resets `turnPhase` to `'preRoll'`
- Clears `lastDiceRoll`

### `PLACE_SETTLEMENT` (setup only) `{ vertexId }`
- Validates with `canPlaceSettlement`
- Places building, decrements `player.settlements`

### `PLACE_ROAD` (setup only) `{ edgeId, lastPlacedSettlementVertexId? }`
- Validates with `canPlaceRoad`
- Places road, decrements `player.roads`
- Calls `advanceSetupOrder` to progress snake draft

## Setup Snake Order
- 2 players: [0, 1, 1, 0] (forward + reverse)
- Transitions to `phase: 'playing'` when all placements done

## Tests
All 11 tests pass.
