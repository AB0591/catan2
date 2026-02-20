# Step 12: Trading System

## Engine: `src/engine/trading/tradingActions.ts`

### `getTradeRatio(state, playerId, resource)`

Returns the best trade ratio for a player for a specific resource:
- **2** — player has a 2:1 specific port for that resource
- **3** — player has a 3:1 any-resource port
- **4** — no port access (default)

Port access is determined by checking if the player has a settlement or city on either vertex of a port.

### `handleTradeBank(state, action)`

Action payload: `{ give: ResourceType, receive: ResourceType }`

Deducts `ratio` of the given resource and adds 1 of the received resource. Returns unchanged state if:
- Player doesn't have enough resources
- `give === receive`

### `handleTradePlayer(state, action)`

Action payload: `{ targetPlayerId, give: Partial<ResourceCards>, receive: Partial<ResourceCards> }`

Transfers resources between two players atomically. Returns unchanged state if either player has insufficient resources.

## Ports

9 standard Catan ports are defined in `STANDARD_PORT_DEFS` with hex coordinates and vertex indices:

| Port | Resource | Ratio | Hex |
|------|----------|-------|-----|
| 1 | any | 3:1 | (0,-2) |
| 2 | wood | 2:1 | (1,-2) |
| 3 | any | 3:1 | (2,-1) |
| 4 | ore | 2:1 | (2,0) |
| 5 | any | 3:1 | (1,1) |
| 6 | wheat | 2:1 | (0,2) |
| 7 | any | 3:1 | (-1,2) |
| 8 | brick | 2:1 | (-2,1) |
| 9 | sheep | 2:1 | (-2,0) |

Port vertex IDs are resolved using the same pixel-key → vertex-ID algorithm as the board renderer:
1. Rebuild the pixel-key → counter map by iterating hexes in order
2. Compute the pixel position of each port's vertex using `hexCornerPositions`
3. Look up the vertex ID by matching pixel keys

### `createStandardPorts(hexes, vertices)`

Called in `createInitialGameState` to populate `boardState.ports` with resolved vertex IDs.

## UI: `TradeDialog`

Two-tab dialog:
- **Bank tab**: select resource to give (shows ratio), select resource to receive, trade button
- **Player tab**: select target player, pick resources to give/receive with +/- controls

Opened via "🔄 Trade" button in the right sidebar during `postRoll` phase.

## Action Types

Added to `turnManager.ts`:
- `TRADE_BANK` / `TRADE_PORT` → `handleTradeBank`
- `TRADE_PLAYER` → `handleTradePlayer`

## Tests

9 tests in `src/engine/trading/__tests__/tradingActions.test.ts` — all passing.
