# Step 6: Build Logic

## Overview
Implements build actions that consume resources and place buildings/roads.

## Files
- `src/engine/actions/buildActions.ts` — Handler functions
- `src/engine/actions/__tests__/buildActions.test.ts` — Unit tests

## Actions

### `BUILD_SETTLEMENT` `{ vertexId }`
- Cost: 1 brick + 1 wood + 1 sheep + 1 wheat
- Validates `canPlaceSettlement` (normal play, not setup)
- Decrements `player.settlements`

### `BUILD_ROAD` `{ edgeId }`
- Cost: 1 brick + 1 wood
- Validates `canPlaceRoad`
- Decrements `player.roads`

### `BUILD_CITY` `{ vertexId }`
- Cost: 3 ore + 2 wheat
- Validates `canPlaceCity`
- Decrements `player.cities`, increments `player.settlements` (token returned)

### `BUY_DEVELOPMENT_CARD`
- Cost: 1 ore + 1 wheat + 1 sheep
- Draws top card from `devCardDeck`
- Returns state unchanged if deck is empty

## Behavior
- All handlers return state unchanged if validation fails (no throw)
- Integrated into `dispatchAction` in `turnManager.ts`

## Tests
All 9 tests pass.
