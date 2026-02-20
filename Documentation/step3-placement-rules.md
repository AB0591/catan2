# Step 3: Placement Rules

## Overview
This step implements the placement validation rules for settlements, roads, and cities.

## Files
- `src/engine/rules/placementRules.ts` — Core validation functions
- `src/engine/rules/index.ts` — Re-exports
- `src/engine/rules/__tests__/placementRules.test.ts` — Unit tests

## Functions

### `canPlaceSettlement(board, vertexId, playerId, setupPhase)`
- Vertex must exist on the board
- No existing building at the vertex
- Distance rule: no adjacent vertex may have a building
- During normal play: player must have a road connecting to this vertex
- During setup phase: road requirement is waived

### `canPlaceRoad(board, edgeId, playerId, setupPhase, lastPlacedSettlementVertexId?)`
- Edge must exist
- No existing road on the edge
- During setup with `lastPlacedSettlementVertexId`: road must touch that settlement vertex
- Otherwise: edge must connect to player's road network (settlement/city or adjacent road, not blocked by opponent building at the shared vertex)

### `canPlaceCity(board, vertexId, playerId)`
- Vertex must have player's own settlement (not city, not opponent)

### `getValidSettlementPlacements(board, playerId, setupPhase)`
Returns all vertex IDs where a settlement can be placed.

### `getValidRoadPlacements(board, playerId, setupPhase, lastPlacedSettlementVertexId?)`
Returns all edge IDs where a road can be placed.

## Tests
All 13 specified tests pass (plus 2 bonus cases).
