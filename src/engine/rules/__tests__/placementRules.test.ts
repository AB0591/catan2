import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import {
  canPlaceSettlement,
  canPlaceRoad,
  canPlaceCity,
  getValidSettlementPlacements,
} from '../placementRules';
import type { BoardState } from '../../../state/boardState';

function getDefaultBoard(): BoardState {
  const state = createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ]);
  return state.board;
}

describe('canPlaceSettlement', () => {
  it('returns true for empty board vertex in setup', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    expect(canPlaceSettlement(board, vertexId, 'p1', true)).toBe(true);
  });

  it('returns false if vertex already occupied', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const boardWithBuilding: BoardState = {
      ...board,
      buildings: { ...board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
    };
    expect(canPlaceSettlement(boardWithBuilding, vertexId, 'p2', true)).toBe(false);
  });

  it('returns false if adjacent vertex occupied (distance rule)', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const vertex = board.graph.vertices.get(vertexId)!;
    const adjVertexId = vertex.adjacentVertices[0];

    const boardWithBuilding: BoardState = {
      ...board,
      buildings: { ...board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
    };
    expect(canPlaceSettlement(boardWithBuilding, adjVertexId, 'p2', true)).toBe(false);
  });

  it('returns true during setup without road connection', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    expect(canPlaceSettlement(board, vertexId, 'p1', true)).toBe(true);
  });

  it('returns false during normal play without road connection', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    expect(canPlaceSettlement(board, vertexId, 'p1', false)).toBe(false);
  });

  it('returns true during normal play with connecting road', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const vertex = board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];

    const boardWithRoad: BoardState = {
      ...board,
      roads: { ...board.roads, [edgeId]: { playerId: 'p1' } },
    };
    expect(canPlaceSettlement(boardWithRoad, vertexId, 'p1', false)).toBe(true);
  });
});

describe('canPlaceRoad', () => {
  it('returns true for valid empty edge connected to settlement', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const vertex = board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];

    const boardWithBuilding: BoardState = {
      ...board,
      buildings: { ...board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
    };
    expect(canPlaceRoad(boardWithBuilding, edgeId, 'p1', false)).toBe(true);
  });

  it('returns false if edge already has road', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const vertex = board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];

    const boardWithRoad: BoardState = {
      ...board,
      buildings: { ...board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
      roads: { ...board.roads, [edgeId]: { playerId: 'p1' } },
    };
    expect(canPlaceRoad(boardWithRoad, edgeId, 'p1', false)).toBe(false);
  });

  it('returns false if no connection to player network', () => {
    const board = getDefaultBoard();
    const edgeId = board.graph.edges.keys().next().value as string;
    expect(canPlaceRoad(board, edgeId, 'p1', false)).toBe(false);
  });

  it('returns true during setup when road connects to last placed settlement', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const vertex = board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];

    expect(canPlaceRoad(board, edgeId, 'p1', true, vertexId)).toBe(true);
  });

  it('returns false during setup when road does not connect to last placed settlement', () => {
    const board = getDefaultBoard();
    // Get a vertex far from the settlement
    const vertices = Array.from(board.graph.vertices.keys());
    const settlementVertexId = vertices[0];
    const otherVertex = board.graph.vertices.get(vertices[5])!;
    const otherEdgeId = otherVertex.adjacentEdges[0];

    // Make sure otherEdgeId doesn't contain settlementVertexId
    const edge = board.graph.edges.get(otherEdgeId)!;
    if (!edge.vertices.includes(settlementVertexId)) {
      expect(canPlaceRoad(board, otherEdgeId, 'p1', true, settlementVertexId)).toBe(false);
    }
  });
});

describe('canPlaceCity', () => {
  it('returns true for own settlement', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const boardWithSettlement: BoardState = {
      ...board,
      buildings: { ...board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
    };
    expect(canPlaceCity(boardWithSettlement, vertexId, 'p1')).toBe(true);
  });

  it('returns false for opponent settlement', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const boardWithSettlement: BoardState = {
      ...board,
      buildings: { ...board.buildings, [vertexId]: { type: 'settlement', playerId: 'p2' } },
    };
    expect(canPlaceCity(boardWithSettlement, vertexId, 'p1')).toBe(false);
  });

  it('returns false for own city (already upgraded)', () => {
    const board = getDefaultBoard();
    const vertexId = board.graph.vertices.keys().next().value as string;
    const boardWithCity: BoardState = {
      ...board,
      buildings: { ...board.buildings, [vertexId]: { type: 'city', playerId: 'p1' } },
    };
    expect(canPlaceCity(boardWithCity, vertexId, 'p1')).toBe(false);
  });
});

describe('getValidSettlementPlacements', () => {
  it('returns all vertices on empty board during setup', () => {
    const board = getDefaultBoard();
    const validPlacements = getValidSettlementPlacements(board, 'p1', true);
    // All vertices should be valid on an empty board
    expect(validPlacements.length).toBe(board.graph.vertices.size);
  });
});
