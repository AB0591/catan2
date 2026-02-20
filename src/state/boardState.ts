import type { BoardGraph, HexCoord, VertexId, EdgeId } from '../engine/board';

export type BuildingType = 'settlement' | 'city';

export type Building = {
  type: BuildingType;
  playerId: string;
};

export type Road = {
  playerId: string;
};

export type Port = {
  resource: 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'any';
  ratio: 2 | 3;
  vertices: [VertexId, VertexId]; // the two vertices of the port
};

export type BoardState = {
  graph: BoardGraph;
  buildings: Record<VertexId, Building>;  // vertexId -> Building
  roads: Record<EdgeId, Road>;            // edgeId -> Road
  ports: Port[];
  robberHex: HexCoord;
};

export function createBoardState(graph: BoardGraph, ports: Port[]): BoardState {
  return {
    graph,
    buildings: {},
    roads: {},
    ports,
    robberHex: graph.robberHex,
  };
}
