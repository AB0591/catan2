# Step 8: Development Cards

## Overview
Implements playable development cards.

## Files
- `src/engine/developmentCards/devCardActions.ts` — Handler functions
- `src/engine/developmentCards/index.ts` — Re-exports
- `src/engine/developmentCards/__tests__/devCardActions.test.ts` — Unit tests

## Type Updates
- `DevelopmentCard.turnBought: number` — turn when bought (prevents same-turn play)
- `GameState.currentTurn: number` — incremented on END_TURN, starts at 0

## Actions

### `PLAY_KNIGHT` `{ hexCoord, targetPlayerId? }`
- Moves robber (uses same logic as MOVE_ROBBER)
- Optionally steals from adjacent opponent
- Increments `player.knightsPlayed`
- Awards/transfers Largest Army (≥3, strictly more than current holder)

### `PLAY_ROAD_BUILDING` `{ edgeId1, edgeId2 }`
- Places 2 free roads (validates each with canPlaceRoad)

### `PLAY_YEAR_OF_PLENTY` `{ resource1, resource2 }`
- Gives 2 resources from bank (handles same resource type correctly)

### `PLAY_MONOPOLY` `{ resource }`
- Steals all of that resource from every other player

## One Dev Card Per Turn
`hasPlayedDevCard` checks `playedThisTurn` flag. Cards bought this turn cannot be played.

## Largest Army
- Minimum 3 knights required
- Must be strictly more than current holder
- `checkLargestArmy` called after every PLAY_KNIGHT

## Tests
All 9 tests pass.
