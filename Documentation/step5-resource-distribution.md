# Step 5: Resource Distribution

## Overview
Distributes resources to players after a dice roll.

## Files
- `src/engine/resources/resourceDistribution.ts` — Core logic
- `src/engine/resources/index.ts` — Re-exports
- `src/engine/resources/__tests__/resourceDistribution.test.ts` — Unit tests

## Functions

### `distributeResources(state, diceTotal): GameState`
- Returns state unchanged if diceTotal === 7
- Iterates all hexes matching the dice total
- Skips the robber hex
- Settlement → 1 resource; City → 2 resources
- All players receive simultaneously

### `addResources(player, resources): PlayerState`
Adds resource amounts to player's hand.

### `removeResources(player, resources): PlayerState | null`
Deducts resources; returns null if insufficient.

### `hasResources(player, resources): boolean`
Returns true if player has at least the given amounts.

### `totalResources(player): number`
Sum of all resource cards held.

## Integration
`distributeResources` is called automatically in `ROLL_DICE` handler when total ≠ 7.

## Tests
All 12 tests pass.
