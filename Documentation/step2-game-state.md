# Step 2: Game State Model

## Overview

The game state layer (`src/state/`) provides a fully immutable, JSON-serializable representation of a Catan game. All state transitions return new state objects — nothing is mutated in place.

The state is split into three concerns:

| Module | Purpose |
|--------|---------|
| `playerState.ts` | Player resources, buildings, dev cards, VP |
| `boardState.ts` | Board graph, placed buildings/roads, ports, robber |
| `gameState.ts` | Top-level game phase, turn phase, action log |

---

## GameState Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique game identifier (includes seed and timestamp) |
| `phase` | `GamePhase` | `'setup'`, `'playing'`, or `'finished'` |
| `turnPhase` | `TurnPhase` | Sub-phase within a turn (preRoll, robber, postRoll, setupPlacement) |
| `players` | `PlayerState[]` | Ordered list of players |
| `currentPlayerIndex` | `number` | Index into `players` array |
| `board` | `BoardState` | Full board snapshot |
| `devCardDeck` | `DevelopmentCardType[]` | Remaining shuffled dev card deck |
| `lastDiceRoll` | `DiceRoll \| null` | Result of the most recent dice roll |
| `actionLog` | `GameAction[]` | Append-only log of every action taken |
| `setupRound` | `number` | `0` = first pass, `1` = second pass (snake order) |
| `setupPlayerOrder` | `number[]` | Player indices for snake-order setup |
| `setupOrderIndex` | `number` | Current position in `setupPlayerOrder` |
| `winner` | `string \| null` | `playerId` of winner, or `null` |
| `seed` | `number` | RNG seed used for board layout and deck shuffle |
| `longestRoadLength` | `number` | Current longest road length claimed |
| `largestArmySize` | `number` | Current largest army size claimed |

---

## PlayerState Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique player identifier |
| `name` | `string` | Display name |
| `color` | `PlayerColor` | `'red'`, `'blue'`, `'orange'`, `'white'` |
| `resources` | `ResourceCards` | Counts of each resource type |
| `developmentCards` | `DevelopmentCard[]` | Cards held (each tracks if played this turn) |
| `settlements` | `number` | Remaining settlement pieces (starts at 5) |
| `cities` | `number` | Remaining city pieces (starts at 4) |
| `roads` | `number` | Remaining road pieces (starts at 15) |
| `victoryPoints` | `number` | Public VP total |
| `knightsPlayed` | `number` | Total knights played (for Largest Army) |
| `hasLargestArmy` | `boolean` | Whether this player holds the Largest Army card |
| `hasLongestRoad` | `boolean` | Whether this player holds the Longest Road card |

Victory points are calculated by `calculateVictoryPoints(player)`:
- Settlements placed (`5 - settlements`) × 1
- Cities placed (`4 - cities`) × 2
- Victory Point dev cards × 1
- Largest Army bonus: +2
- Longest Road bonus: +2

---

## BoardState Fields

| Field | Type | Description |
|-------|------|-------------|
| `graph` | `BoardGraph` | Immutable hex/vertex/edge topology from Step 1 |
| `buildings` | `Record<VertexId, Building>` | Placed settlements and cities keyed by vertex ID |
| `roads` | `Record<EdgeId, Road>` | Placed roads keyed by edge ID |
| `ports` | `Port[]` | Port definitions (resource type, ratio, vertices) |
| `robberHex` | `HexCoord` | Current robber location (starts on desert) |

---

## Serialization

`BoardGraph` uses ES6 `Map` objects for `vertices` and `edges`. Since `JSON.stringify` does not serialize Maps, `serializeGameState` converts them to plain objects via `Object.fromEntries`:

```ts
graph: {
  ...state.board.graph,
  vertices: Object.fromEntries(state.board.graph.vertices),
  edges: Object.fromEntries(state.board.graph.edges),
}
```

The rest of the state tree (arrays, primitives, plain objects) is directly JSON-serializable.

---

## Action Log / Replay Design

Every state change is represented by a `GameAction`:

```ts
type GameAction = {
  type: ActionType;   // e.g. 'ROLL_DICE', 'PLACE_SETTLEMENT', 'END_TURN'
  playerId: string;
  payload: Record<string, unknown>;
  timestamp: number;
};
```

Actions are appended to `actionLog` in order. Because state is fully immutable, any point in the game can be reconstructed by replaying the log from the initial state. Undo is implemented by re-running all actions except the last N.

---

## Setup Snake Order

Catan uses a "snake draft" for initial placement: players place in order 1→N, then reverse N→1. For a 4-player game:

```
setupPlayerOrder = [0, 1, 2, 3, 3, 2, 1, 0]
```

`setupOrderIndex` tracks the current position. When it reaches `setupPlayerOrder.length`, setup is complete and the game transitions to `'playing'`.
