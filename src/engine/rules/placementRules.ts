import type { BoardState } from '../../state/boardState';
import type { VertexId, EdgeId } from '../board/boardTypes';

export function canPlaceSettlement(
  board: BoardState,
  vertexId: VertexId,
  playerId: string,
  setupPhase: boolean
): boolean {
  const vertex = board.graph.vertices.get(vertexId);
  if (!vertex) return false;

  if (board.buildings[vertexId]) return false;

  for (const adjVid of vertex.adjacentVertices) {
    if (board.buildings[adjVid]) return false;
  }

  if (!setupPhase) {
    const hasConnectingRoad = vertex.adjacentEdges.some(
      eid => board.roads[eid]?.playerId === playerId
    );
    if (!hasConnectingRoad) return false;
  }

  return true;
}

export function canPlaceRoad(
  board: BoardState,
  edgeId: EdgeId,
  playerId: string,
  setupPhase: boolean,
  lastPlacedSettlementVertexId?: VertexId
): boolean {
  const edge = board.graph.edges.get(edgeId);
  if (!edge) return false;

  if (board.roads[edgeId]) return false;

  // During setup with a last-placed settlement: road must touch that settlement
  if (setupPhase && lastPlacedSettlementVertexId !== undefined) {
    return edge.vertices.includes(lastPlacedSettlementVertexId);
  }

  // Check each endpoint of the edge
  for (const vid of edge.vertices) {
    const building = board.buildings[vid];

    // Connected to player's own building
    if (building?.playerId === playerId) return true;

    // Connected to player's road network, not blocked by an opponent's building
    if (!building || building.playerId === playerId) {
      const vertex = board.graph.vertices.get(vid);
      if (vertex) {
        for (const adjEid of vertex.adjacentEdges) {
          if (adjEid !== edgeId && board.roads[adjEid]?.playerId === playerId) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function canPlaceCity(
  board: BoardState,
  vertexId: VertexId,
  playerId: string
): boolean {
  const building = board.buildings[vertexId];
  if (!building) return false;
  if (building.playerId !== playerId) return false;
  if (building.type !== 'settlement') return false;
  return true;
}

export function getValidSettlementPlacements(
  board: BoardState,
  playerId: string,
  setupPhase: boolean
): VertexId[] {
  const result: VertexId[] = [];
  for (const vertexId of board.graph.vertices.keys()) {
    if (canPlaceSettlement(board, vertexId, playerId, setupPhase)) {
      result.push(vertexId);
    }
  }
  return result;
}

export function getValidRoadPlacements(
  board: BoardState,
  playerId: string,
  setupPhase: boolean,
  lastPlacedSettlementVertexId?: VertexId
): EdgeId[] {
  const result: EdgeId[] = [];
  for (const edgeId of board.graph.edges.keys()) {
    if (canPlaceRoad(board, edgeId, playerId, setupPhase, lastPlacedSettlementVertexId)) {
      result.push(edgeId);
    }
  }
  return result;
}
