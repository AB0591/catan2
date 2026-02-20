# Step 1: Board Data Model

## Overview

The board data model provides the complete mathematical foundation for a Settlers of Catan board. It consists of a hex grid system, a tile distribution engine, and adjacency graphs for vertices and edges.

All code is pure TypeScript with no UI dependencies, living in `src/engine/board/`.

---

## Hex Coordinate System

The board uses **axial coordinates** (also called "trapezoidal" coordinates), where each hex is identified by two integer axes: `q` (column) and `r` (row).

```ts
type HexCoord = { q: number; r: number };
```

### Key properties

- The third axis `s` is implicit: `s = -q - r`
- A standard Catan board has radius 2, giving **19 hexes** total (hexes within Chebyshev distance 2 of the origin)
- The `hexesInRange(center, radius)` function enumerates all hexes within a given radius

### Utility functions (`hexGrid.ts`)

| Function | Description |
|---|---|
| `hexesInRange(center, radius)` | Returns all hex coords within `radius` steps of `center` |
| `hexNeighbors(hex)` | Returns the 6 neighboring hex coordinates |
| `hexDistance(a, b)` | Cube-coordinate distance between two hexes |
| `hexEquals(a, b)` | Equality check for two `HexCoord` values |

---

## Vertex and Edge Graph

Each hex has 6 corners (vertices) and 6 sides (edges). Adjacent hexes share corners and sides, so deduplication is essential.

### Vertex deduplication (`vertexGraph.ts`)

Vertices are deduplicated by computing their **pixel position** from axial coordinates using flat-top hex geometry, rounding to 4 decimal places, and using the resulting `"x,y"` string as a unique key.

The standard Catan board produces exactly **54 unique vertices**.

Each `Vertex` stores:
- `id`: unique string identifier (e.g. `"v0"`)
- `adjacentHexes`: 1–3 hexes sharing this corner
- `adjacentVertices`: 2–3 neighboring vertices (connected by an edge)
- `adjacentEdges`: 2–3 edges meeting at this vertex

### Edge deduplication (`edgeGraph.ts`)

Edges are identified by the sorted pair of their two endpoint vertex IDs. Shared edges between adjacent hexes are deduplicated automatically.

The standard Catan board produces exactly **72 unique edges**.

Each `Edge` stores:
- `id`: unique string identifier (e.g. `"e0"`)
- `vertices`: the two endpoint vertex IDs
- `adjacentHexes`: 1–2 hexes bordering this edge
- `adjacentEdges`: neighboring edges (sharing a vertex)

---

## BoardGraph Type

```ts
type BoardGraph = {
  hexes: HexTile[];             // 19 hex tiles with resource and number token
  vertices: Map<VertexId, Vertex>; // 54 vertices with adjacency
  edges: Map<EdgeId, Edge>;        // 72 edges with adjacency
  robberHex: HexCoord;          // current robber position (starts on desert)
};
```

Each `HexTile`:
```ts
type HexTile = {
  coord: HexCoord;
  resource: ResourceType;       // 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert'
  numberToken: number | null;   // 2–12 (excluding 7), null for desert
};
```

### Standard tile distribution

| Resource | Count |
|---|---|
| Wood | 4 |
| Sheep | 4 |
| Wheat | 4 |
| Brick | 3 |
| Ore | 3 |
| Desert | 1 |
| **Total** | **19** |

Number tokens: `2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12` (18 tokens, one per non-desert tile)

---

## Using `createBoard()`

```ts
import { createBoard, createDefaultBoard } from './src/engine/board';

// Create a board with a specific seed (deterministic)
const board = createBoard(42);

// Convenience wrapper using seed 42
const defaultBoard = createDefaultBoard();

// Access hex tiles
for (const hex of board.hexes) {
  console.log(hex.coord, hex.resource, hex.numberToken);
}

// Access vertex adjacency
const vertex = board.vertices.get('v0')!;
console.log(vertex.adjacentHexes);   // which hexes touch this vertex
console.log(vertex.adjacentEdges);   // which edges meet here

// Access edge adjacency
const edge = board.edges.get('e0')!;
console.log(edge.vertices);          // [vertexId, vertexId]
console.log(edge.adjacentHexes);     // 1 or 2 hexes bordering this edge
```

The seeded RNG (`mulberry32`) ensures that any given seed always produces the same board layout, which is important for reproducible testing and saved games.
