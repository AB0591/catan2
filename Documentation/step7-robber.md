# Step 7: Robber

## Overview
Implements the robber mechanic triggered when a 7 is rolled.

## Files
- `src/engine/robber/robberActions.ts` — Handler functions
- `src/engine/robber/index.ts` — Re-exports
- `src/engine/robber/__tests__/robberActions.test.ts` — Unit tests

## New TurnPhases
- `'stealing'` — current player chooses a target to steal from
- `'discarding'` — players with >7 cards must discard half

## New GameState Field
- `pendingDiscards: string[]` — playerIds still needing to discard

## Flow on Roll 7
1. Check `getPlayersWhoMustDiscard` → if any, go to `'discarding'`, set `pendingDiscards`
2. Each player calls `DISCARD_RESOURCES` with exactly `floor(total/2)` resources
3. After all discards → `'robber'` phase
4. Current player calls `MOVE_ROBBER` → if opponents adjacent: `'stealing'`, else `'postRoll'`
5. Current player calls `STEAL_RESOURCE` → `'postRoll'`

## Functions

### `getPlayersWhoMustDiscard(state)`
Returns playerIds with >7 resource cards.

### `requiredDiscardCount(player)`
Returns `floor(totalResources(player) / 2)`.

### `handleMoveRobber(state, action)` `{ hexCoord }`
- Only valid in `'robber'` phase
- Must move to different hex
- Updates `board.robberHex`
- Transitions to `'stealing'` or `'postRoll'`

### `handleStealResource(state, action)` `{ targetPlayerId }`
- Only valid in `'stealing'` phase
- Seeded random steal using mulberry32
- Transitions to `'postRoll'`

### `handleDiscardResources(state, action)` `{ resources }`
- Must discard exactly `requiredDiscardCount` cards
- Removes player from `pendingDiscards`
- When last discard: transitions to `'robber'`

## Tests
All 11 tests pass.
