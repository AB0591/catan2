# Settlers of Catan — Digital Implementation

A full-featured digital implementation of Settlers of Catan built with React, TypeScript, and Vite.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to Start a Game

1. Choose 2–4 players (name each player)
2. Check "AI" to make a player computer-controlled
3. Click **Start Game**
4. Follow on-screen instructions for setup and play

## Running Tests

```bash
npm test
```

146 tests covering the full game engine.

## Building for Production

```bash
npm run build
```

## Architecture

The codebase is organized into three main layers:

### Engine (`src/engine/`)

Pure TypeScript game logic — no React dependencies.

| Module | Description |
|--------|-------------|
| `board/` | Hex grid, vertex/edge graph, board setup |
| `rules/` | Placement rules (settlements, roads, cities) |
| `resources/` | Resource distribution on dice roll |
| `actions/` | Build actions (settlement, road, city, dev card) |
| `robber/` | Robber mechanics (7, discard, steal) |
| `developmentCards/` | Knight, YoP, Monopoly, Road Building |
| `victory/` | Victory point calculation, longest road, largest army |
| `trading/` | Bank trades (4:1, 3:1, 2:1 ports), player trades |
| `ai/` | Heuristic AI player |
| `turnManager/` | Central action dispatcher |

### State (`src/state/`)

Game state types and factories.

| File | Description |
|------|-------------|
| `gameState.ts` | `GameState`, `GameAction`, `TurnPhase` types |
| `boardState.ts` | `BoardState`, `Port` types |
| `playerState.ts` | `PlayerState`, resources, dev cards |
| `gameStateFactory.ts` | `createInitialGameState` |

### UI (`src/ui/`)

React components for game rendering.

| Component | Description |
|-----------|-------------|
| `boardRenderer/HexBoard` | SVG board with hexes, settlements, roads |
| `playerPanel/PlayerPanel` | Player info sidebar |
| `diceRoll/DiceRoll` | Dice display and roll button |
| `buildMenu/BuildMenu` | Build buttons with cost display |
| `devCardHand/DevCardHand` | Dev card list with play buttons |
| `tradeDialog/TradeDialog` | Bank and player trade dialog |
| `discardDialog/DiscardDialog` | Discard UI for 7-roll |

### API (`src/api/`)

Serialization and multiplayer sync primitives.

| File | Description |
|------|-------------|
| `gameController.ts` | `serializeState`, `deserializeState`, `replayFromLog`, `validateAction` |
| `actionDispatcher.ts` | Middleware-based dispatcher, logging/validation middlewares |

### Store (`src/store/`)

Zustand store connecting UI to engine.

## Documentation

Detailed step-by-step implementation docs in [`Documentation/`](./Documentation/):

- [Step 10: UI Board Renderer](./Documentation/step10-ui-board-renderer.md)
- [Step 11: Player Controls](./Documentation/step11-player-controls.md)
- [Step 12: Trading System](./Documentation/step12-trading.md)
- [Step 13: AI Opponents](./Documentation/step13-ai-opponents.md)
- [Step 14: Multiplayer Sync](./Documentation/step14-multiplayer-sync.md)

