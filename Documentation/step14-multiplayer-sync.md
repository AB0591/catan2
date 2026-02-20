# Step 14: Multiplayer Sync Foundation

## `src/api/gameController.ts`

### `serializeState(state: GameState): string`

Converts `GameState` to a JSON string. `BoardGraph.vertices` and `BoardGraph.edges` are JavaScript `Map` objects which JSON.stringify cannot serialize directly — they are converted to plain objects using `Object.fromEntries`.

### `deserializeState(json: string): GameState`

Parses a JSON string back to `GameState`. Reconstructs the `Map` objects for `vertices` and `edges`:
```ts
const vertices = new Map(Object.entries(raw.board.graph.vertices));
const edges = new Map(Object.entries(raw.board.graph.edges));
```

### `replayFromLog(initialState: GameState, log: GameAction[]): GameState`

Replays a sequence of actions against an initial state using `dispatchAction`. Useful for:
- Reconnecting players after network interruption
- Verifying game history
- Testing action sequences

### `validateAction(action: GameAction, state: GameState): { valid: boolean; reason?: string }`

Validates whether an action is legal in the current state. Checks:
- Player exists
- It's the player's turn (for current-player actions)
- The game phase and turn phase are correct
- Required payload fields are present
- Dice values are in range (for ROLL_DICE)

## `src/api/actionDispatcher.ts`

### `createDispatcher(middlewares?: Middleware[]): DispatchFn`

Creates a middleware-enhanced dispatcher. Middlewares are composed right-to-left:
```
dispatch(action, state)
  → mw1(action, state, next)
    → mw2(action, state, next)
      → dispatchAction(action, state)
```

### `loggingMiddleware`

Logs `[Action] <type> by <playerId>` after each dispatch.

### `validationMiddleware`

Validates the action using `validateAction` before dispatching. Returns unchanged state if action is invalid, preventing illegal moves.

## Multiplayer Design

The serialization layer forms the foundation for future multiplayer networking:

1. **State sync**: `serializeState` / `deserializeState` can send full state snapshots over WebSocket
2. **Action relay**: Send `GameAction` objects to a server; server validates and broadcasts to all clients
3. **Reconnection**: `replayFromLog` can catch up a reconnecting client from action history
4. **Validation**: `validationMiddleware` can run on the server to reject cheating/invalid actions

## Tests

8 tests in `src/api/__tests__/gameController.test.ts` — all passing:
1. `serializeState` produces valid JSON
2. `deserializeState` reconstructs Maps correctly
3. Round-trip is deep-equal to original
4. `replayFromLog` produces same state as live play
5. `validateAction` returns valid for legal action
6. `validateAction` returns invalid with reason for illegal action
7. Middleware chain is called in order
8. Validation middleware rejects invalid actions
