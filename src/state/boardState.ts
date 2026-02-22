import type { BoardGraph, HexCoord, VertexId, EdgeId } from '../engine/board';

export type BuildingType = 'settlement' | 'city';

export type Building = {
  type: BuildingType;
  playerId: string;
};

export type Road = {
  playerId: string;
};

export type KnightLevel = 1 | 2 | 3;

export type KnightState = {
  id: string;
  ownerId: string;
  vertexId: VertexId;
  level: KnightLevel;
  active: boolean;
  hasActedThisTurn: boolean;
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
  knights: Record<string, KnightState>;   // knightId -> KnightState
  cityWalls: Record<VertexId, string>;    // city vertex -> owner playerId
  ports: Port[];
  robberHex: HexCoord;
};

export function createBoardState(graph: BoardGraph, ports: Port[]): BoardState {
  return {
    graph,
    buildings: {},
    roads: {},
    knights: {},
    cityWalls: {},
    ports,
    robberHex: graph.robberHex,
  };
}
