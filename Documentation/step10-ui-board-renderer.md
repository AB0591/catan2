# Step 10: UI Board Renderer

## Component Hierarchy

```
App
├── StartScreen          (game setup form)
└── GameBoard
    ├── PlayerPanel[]    (left sidebar — one per player)
    ├── HexBoard         (center — SVG board)
    ├── DiceRoll         (right sidebar)
    └── BuildMenu        (right sidebar)
```

## Components

### `HexBoard` (`src/ui/boardRenderer/HexBoard.tsx`)

SVG-based board renderer. Renders all 19 Catan hexes as pointy-top hexagons.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `boardState` | `BoardState` | Full board state |
| `validVertices` | `VertexId[]` | Highlighted placeable vertices |
| `validEdges` | `EdgeId[]` | Highlighted placeable edges |
| `onVertexClick` | `(id: VertexId) => void` | Vertex click handler |
| `onEdgeClick` | `(id: EdgeId) => void` | Edge click handler |
| `onHexClick` | `(coord: HexCoord) => void` | Hex click handler (robber) |
| `validHexes` | `HexCoord[]` | Hexes player can move robber to |
| `playerColors` | `Record<string, string>` | playerId → CSS color |

### `PlayerPanel` (`src/ui/playerPanel/PlayerPanel.tsx`)

Shows a single player's resources, VP, and piece counts.

### `DiceRoll` (`src/ui/diceRoll/DiceRoll.tsx`)

Shows dice faces and a Roll button when it's preRoll phase.

### `BuildMenu` (`src/ui/buildMenu/BuildMenu.tsx`)

Build buttons with costs. Disabled when player can't afford or wrong phase.

## Coordinate System

**Hex center (screen):**
```
cx = CENTER_X + hexSize * (√3·q + √3/2·r)
cy = CENTER_Y + hexSize * (3/2·r)
```
Where `hexSize = 60`, `CENTER_X = 400`, `CENTER_Y = 350`.

**Hex corners (pointy-top):**
```
angle_i = 30° + 60°·i
vx = cx + hexSize · cos(angle_i)
vy = cy + hexSize · sin(angle_i)
```

**Vertex positions:** Vertex IDs are `v0`, `v1`, ... assigned in iteration order by `buildVertexGraph`. The renderer reconstructs the pixel-key → counter mapping from the same hex iteration to get pixel positions for each vertex ID.

## Colors

| Resource | Color |
|----------|-------|
| wood | `#2d6a2d` |
| brick | `#c1440e` |
| sheep | `#90c040` |
| wheat | `#f4c430` |
| ore | `#808080` |
| desert | `#f5deb3` |

## Store: `src/store/gameStore.ts`

Zustand store wrapping game engine:
- `startGame(playerNames, aiPlayerIds?)` — initializes game state
- `dispatch(action)` — runs action through engine
- `getCurrentPlayer()` — returns active player
- `getValidPlacements()` — returns valid vertex/edge IDs based on phase and selected action
