import type { HexCoord } from './hexGrid';
import type { VertexId, EdgeId, Edge, Vertex } from './boardTypes';

export function buildEdgeGraph(
  hexCoords: HexCoord[],
  vertices: Map<VertexId, Vertex>,
  hexVertexIds: Map<string, VertexId[]>
): Map<EdgeId, Edge> {
  const edgeKeyToId = new Map<string, EdgeId>();
  const edgeData = new Map<EdgeId, { vertices: [VertexId, VertexId]; hexes: HexCoord[] }>();
  let edgeCounter = 0;

  for (const hex of hexCoords) {
    const vIds = hexVertexIds.get(`${hex.q},${hex.r}`)!;
    for (let i = 0; i < 6; i++) {
      const a = vIds[i];
      const b = vIds[(i + 1) % 6];
      const edgeKey = [a, b].sort().join('|');

      if (edgeKeyToId.has(edgeKey)) {
        edgeData.get(edgeKeyToId.get(edgeKey)!)!.hexes.push(hex);
      } else {
        const eid = `e${edgeCounter++}`;
        edgeKeyToId.set(edgeKey, eid);
        edgeData.set(eid, { vertices: [a, b], hexes: [hex] });
      }
    }
  }

  // Build vertex->edges mapping
  const vertexToEdges = new Map<VertexId, EdgeId[]>();
  for (const [eid, data] of edgeData) {
    for (const vid of data.vertices) {
      if (!vertexToEdges.has(vid)) vertexToEdges.set(vid, []);
      vertexToEdges.get(vid)!.push(eid);
    }
  }

  // Build edge adjacency
  const edges = new Map<EdgeId, Edge>();
  for (const [eid, data] of edgeData) {
    const adjEdgesSet = new Set<EdgeId>();
    for (const vid of data.vertices) {
      for (const adjEid of vertexToEdges.get(vid) ?? []) {
        if (adjEid !== eid) adjEdgesSet.add(adjEid);
      }
    }
    edges.set(eid, {
      id: eid,
      vertices: data.vertices,
      adjacentHexes: data.hexes,
      adjacentEdges: Array.from(adjEdgesSet),
    });
  }

  // Update vertex adjacentEdges in place
  for (const [vid, eids] of vertexToEdges) {
    const vertex = vertices.get(vid);
    if (vertex) vertex.adjacentEdges = eids;
  }

  return edges;
}
