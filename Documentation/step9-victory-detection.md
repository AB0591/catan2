# Step 9: Victory Detection

## Overview
Implements VP counting, longest road calculation, and win condition detection.

## Files
- `src/engine/victory/victoryEngine.ts` — Core functions
- `src/engine/victory/index.ts` — Re-exports
- `src/engine/victory/__tests__/victoryEngine.test.ts` — Unit tests

## Functions

### `calculateTotalVP(state, playerId): number`
Sums:
- Settlements placed: `5 - player.settlements`
- Cities placed: `(4 - player.cities) * 2`
- VP dev cards
- +2 for Largest Army, +2 for Longest Road

### `checkVictory(state): string | null`
Returns playerId of first player with ≥10 VP, or null.

### `calculateLongestRoad(state, playerId): number`
DFS traversal over player's road network:
- No repeated edges
- Opponent buildings at a vertex block traversal through that vertex
- Returns longest simple path length

### `updateLongestRoad(state): GameState`
- Minimum 5 roads to claim
- Must be strictly longer than current holder
- Transfers award if a new player qualifies

### `updateVictoryState(state): GameState`
- Calls `updateLongestRoad`
- Updates `player.victoryPoints` for all players
- If winner detected: sets `phase: 'finished'` and `winner`

## Integration
`updateVictoryState` is called at end of every `dispatchAction` during `'playing'` phase.

## Tests
All 13 tests pass.
