# Step 13: AI Opponents

## `src/engine/ai/aiPlayer.ts`

Heuristic AI that plays a complete game without human input.

### `getAIAction(state, playerId)`

Returns the next `GameAction` the AI should take, or `null` if no action is possible.

**Phase handling:**
| Phase | AI behavior |
|-------|-------------|
| `setup` | Place settlement on highest-value vertex; then place road toward next best expansion spot |
| `preRoll` | Roll dice with random values |
| `discarding` | Discard excess of most-held resources |
| `robber` | Move robber to hex with opponent buildings (targets leader) |
| `stealing` | Steal from opponent with most resources |
| `postRoll` | Build based on game stage (see below) |

**Vertex evaluation (`evaluateVertex`):** Sum of probability weights (TOKEN_WEIGHT) for adjacent hexes, plus diversity bonus (+2 per unique resource type).

**Setup road placement (`getBestSetupRoad`):** Evaluates each valid road endpoint vertex and picks the road leading to the highest-scoring unoccupied vertex.

### Post-roll strategy

| VP | Strategy |
|----|---------|
| < 4 | Roads + settlements (expansion) |
| 4-7 | Cities + dev cards |
| ≥ 7 | Cities first, then settlements (racing to 10) |

### `runAITurn(state, playerId, dispatch)`

Runs a complete AI turn by repeatedly calling `getAIAction` and dispatching, until `END_TURN` is dispatched or the current player changes. Has a 50-iteration safety limit.

## Store Integration

`gameStore.ts` adds `runAITurnsIfNeeded`:
- After each human `dispatch`, checks if the new current player is an AI
- Runs `runAITurn` for each AI player until it's a human's turn again
- Also handles AI discarding (when an AI player is in `pendingDiscards`)

## Setup detection fix

Both AI and UI now use a reliable method to detect setup phase (settlement vs road):
```ts
const settlementsPlaced = 5 - player.settlements;
const roadsPlaced = 15 - player.roads;
const needsRoad = settlementsPlaced > roadsPlaced;
```
This works because `setupOrderIndex` only advances after road placement, so index parity is unreliable for mid-turn detection.

## Tests

6 tests in `src/engine/ai/__tests__/aiPlayer.test.ts` — all passing:
1. AI returns ROLL_DICE in preRoll
2. AI returns END_TURN when nothing to build
3. AI places settlement in setup
4. AI places road after settlement in setup
5. AI builds when resources available
6. AI moves robber to opponent hex
