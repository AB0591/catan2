import type { HexCoord } from './hexGrid';
import type { VertexId, Vertex } from './boardTypes';

export function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

export function hexCornerPositions(q: number, r: number): Array<[number, number]> {
  const cx = Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r;
  const cy = 1.5 * r;
  const positions: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    positions.push([round4(cx + Math.cos(angle)), round4(cy + Math.sin(angle))]);
  }
  return positions;
}

export function buildVertexGraph(hexCoords: HexCoord[]): {
  vertices: Map<VertexId, Vertex>;
  pixelKeyToId: Map<string, VertexId>;
  hexVertexIds: Map<string, VertexId[]>;
} {
  const pixelKeyToId = new Map<string, VertexId>();
  const vertexAdjacentHexes = new Map<VertexId, HexCoord[]>();
  const hexVertexIds = new Map<string, VertexId[]>();
  let vertexCounter = 0;

  for (const hex of hexCoords) {
    const positions = hexCornerPositions(hex.q, hex.r);
    const vIds: VertexId[] = [];

    for (const [vx, vy] of positions) {
      const pixelKey = `${vx},${vy}`;
      let vid: VertexId;
      if (pixelKeyToId.has(pixelKey)) {
        vid = pixelKeyToId.get(pixelKey)!;
      } else {
        vid = `v${vertexCounter++}`;
        pixelKeyToId.set(pixelKey, vid);
        vertexAdjacentHexes.set(vid, []);
      }
      vIds.push(vid);
      vertexAdjacentHexes.get(vid)!.push(hex);
    }
    hexVertexIds.set(`${hex.q},${hex.r}`, vIds);
  }

  // Build vertex adjacency
  const adjacentVerticesMap = new Map<VertexId, Set<VertexId>>();
  for (const [, vIds] of hexVertexIds) {
    for (let i = 0; i < 6; i++) {
      const a = vIds[i];
      const b = vIds[(i + 1) % 6];
      if (!adjacentVerticesMap.has(a)) adjacentVerticesMap.set(a, new Set());
      if (!adjacentVerticesMap.has(b)) adjacentVerticesMap.set(b, new Set());
      adjacentVerticesMap.get(a)!.add(b);
      adjacentVerticesMap.get(b)!.add(a);
    }
  }

  const vertices = new Map<VertexId, Vertex>();
  for (const [vid, adjHexes] of vertexAdjacentHexes) {
    vertices.set(vid, {
      id: vid,
      adjacentHexes: adjHexes,
      adjacentVertices: Array.from(adjacentVerticesMap.get(vid) ?? []),
      adjacentEdges: [],
    });
  }

  return { vertices, pixelKeyToId, hexVertexIds };
}
