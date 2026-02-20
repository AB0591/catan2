import type { HexCoord } from './hexGrid';

export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert';
export type HexTile = {
  coord: HexCoord;
  resource: ResourceType;
  numberToken: number | null;
};
export type VertexId = string;
export type EdgeId = string;
export type Vertex = {
  id: VertexId;
  adjacentHexes: HexCoord[];
  adjacentVertices: VertexId[];
  adjacentEdges: EdgeId[];
};
export type Edge = {
  id: EdgeId;
  vertices: [VertexId, VertexId];
  adjacentHexes: HexCoord[];
  adjacentEdges: EdgeId[];
};
export type BoardGraph = {
  hexes: HexTile[];
  vertices: Map<VertexId, Vertex>;
  edges: Map<EdgeId, Edge>;
  robberHex: HexCoord;
};
