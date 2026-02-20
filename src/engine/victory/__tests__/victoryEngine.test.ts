import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import {
  calculateTotalVP,
  checkVictory,
  calculateLongestRoad,
  updateLongestRoad,
  updateVictoryState,
} from '../victoryEngine';
import type { GameState } from '../../../state/gameState';

function make2PlayerState() {
  return createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ]);
}

function playingState(base: ReturnType<typeof make2PlayerState>): GameState {
  return { ...base, phase: 'playing', turnPhase: 'postRoll', currentTurn: 1 };
}

describe('calculateTotalVP', () => {
  it('counts settlements correctly', () => {
    const base = playingState(make2PlayerState());
    // settlements: 5 - 2 placed = 3 remaining → 2 placed
    const state: GameState = {
      ...base,
      players: base.players.map(p => p.id === 'p1' ? { ...p, settlements: 3 } : p),
    };
    expect(calculateTotalVP(state, 'p1')).toBe(2);
  });

  it('counts cities correctly', () => {
    const base = playingState(make2PlayerState());
    // 1 city placed (cities = 3), 1 settlement placed (settlements = 4)
    const state: GameState = {
      ...base,
      players: base.players.map(p => p.id === 'p1' ? { ...p, settlements: 4, cities: 3 } : p),
    };
    // 1 settlement + 1 city*2 = 3
    expect(calculateTotalVP(state, 'p1')).toBe(3);
  });

  it('includes largest army bonus', () => {
    const base = playingState(make2PlayerState());
    const state: GameState = {
      ...base,
      players: base.players.map(p => p.id === 'p1' ? { ...p, hasLargestArmy: true } : p),
    };
    expect(calculateTotalVP(state, 'p1')).toBe(2);
  });

  it('includes longest road bonus', () => {
    const base = playingState(make2PlayerState());
    const state: GameState = {
      ...base,
      players: base.players.map(p => p.id === 'p1' ? { ...p, hasLongestRoad: true } : p),
    };
    expect(calculateTotalVP(state, 'p1')).toBe(2);
  });

  it('includes VP dev cards', () => {
    const base = playingState(make2PlayerState());
    const state: GameState = {
      ...base,
      players: base.players.map(p => p.id === 'p1' ? {
        ...p,
        developmentCards: [{ type: 'victoryPoint', playedThisTurn: false, turnBought: 0 }],
      } : p),
    };
    expect(calculateTotalVP(state, 'p1')).toBe(1);
  });
});

describe('checkVictory', () => {
  it('returns null when no player has 10 VP', () => {
    const state = playingState(make2PlayerState());
    expect(checkVictory(state)).toBeNull();
  });

  it('returns playerId when player reaches 10 VP', () => {
    const base = playingState(make2PlayerState());
    // 5 settlements placed (0 remaining) = 5 VP, 4 cities placed (0 remaining) = 8 VP, + 2 largest army = 10
    const state: GameState = {
      ...base,
      players: base.players.map(p => p.id === 'p1' ? {
        ...p,
        settlements: 0,
        cities: 0,
        hasLargestArmy: true,
      } : p),
    };
    expect(checkVictory(state)).toBe('p1');
  });
});

describe('calculateLongestRoad', () => {
  it('counts a simple chain correctly', () => {
    const base = make2PlayerState();
    // Build a chain of 3 edges from a starting vertex
    const startVertexId = base.board.graph.vertices.keys().next().value as string;
    const startVertex = base.board.graph.vertices.get(startVertexId)!;

    // Build a simple chain: v0 -e0- v1 -e1- v2
    const e0 = startVertex.adjacentEdges[0];
    const edge0 = base.board.graph.edges.get(e0)!;
    const v1 = edge0.vertices[0] === startVertexId ? edge0.vertices[1] : edge0.vertices[0];
    const vertex1 = base.board.graph.vertices.get(v1)!;
    const e1 = vertex1.adjacentEdges.find(e => e !== e0)!;

    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        roads: { [e0]: { playerId: 'p1' }, [e1]: { playerId: 'p1' } },
      },
    };

    expect(calculateLongestRoad(state, 'p1')).toBe(2);
  });

  it('handles branching (finds longest branch)', () => {
    const base = make2PlayerState();
    // Find a vertex with 3 adjacent edges
    let branchVertex: string | undefined;
    for (const [vid, vertex] of base.board.graph.vertices) {
      if (vertex.adjacentEdges.length >= 3) {
        branchVertex = vid;
        break;
      }
    }
    if (!branchVertex) return; // skip if none found

    const vertex = base.board.graph.vertices.get(branchVertex)!;
    // Give p1 all 3 edges from the branch vertex
    const roads: Record<string, { playerId: string }> = {};
    for (const eid of vertex.adjacentEdges.slice(0, 3)) {
      roads[eid] = { playerId: 'p1' };
    }

    const state: GameState = { ...base, board: { ...base.board, roads } };
    const length = calculateLongestRoad(state, 'p1');
    // With 3 edges from same vertex, longest path is at least 2 (can't use same edge twice)
    expect(length).toBeGreaterThanOrEqual(2);
  });

  it('opponent settlement breaks road', () => {
    const base = make2PlayerState();
    const startVertexId = base.board.graph.vertices.keys().next().value as string;
    const startVertex = base.board.graph.vertices.get(startVertexId)!;

    const e0 = startVertex.adjacentEdges[0];
    const edge0 = base.board.graph.edges.get(e0)!;
    const v1 = edge0.vertices[0] === startVertexId ? edge0.vertices[1] : edge0.vertices[0];
    const vertex1 = base.board.graph.vertices.get(v1)!;
    const e1 = vertex1.adjacentEdges.find(e => e !== e0)!;

    // Place opponent settlement at v1 (breaks the road through v1)
    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        roads: { [e0]: { playerId: 'p1' }, [e1]: { playerId: 'p1' } },
        buildings: { [v1]: { type: 'settlement', playerId: 'p2' } },
      },
    };

    // Road is broken at v1, so longest is 1 from startVertex going through e0
    expect(calculateLongestRoad(state, 'p1')).toBe(1);
  });
});

describe('updateLongestRoad', () => {
  it('awards longest road to player with >=5 roads', () => {
    const base = make2PlayerState();
    // Build 5 edges in a chain
    const startVertexId = base.board.graph.vertices.keys().next().value as string;
    const roads: Record<string, { playerId: string }> = {};

    let currentVertex = startVertexId;
    let usedEdges = new Set<string>();
    let count = 0;

    while (count < 5) {
      const vertex = base.board.graph.vertices.get(currentVertex)!;
      const nextEdge = vertex.adjacentEdges.find(e => !usedEdges.has(e));
      if (!nextEdge) break;
      roads[nextEdge] = { playerId: 'p1' };
      usedEdges.add(nextEdge);
      const edge = base.board.graph.edges.get(nextEdge)!;
      currentVertex = edge.vertices[0] === currentVertex ? edge.vertices[1] : edge.vertices[0];
      count++;
    }

    if (count < 5) return; // board doesn't have long enough chain to test

    const state: GameState = {
      ...base,
      phase: 'playing',
      board: { ...base.board, roads },
    };

    const updated = updateLongestRoad(state);
    expect(updated.players[0].hasLongestRoad).toBe(true);
  });

  it('does not award longest road with <5 roads', () => {
    const base = make2PlayerState();
    const startVertexId = base.board.graph.vertices.keys().next().value as string;
    const vertex = base.board.graph.vertices.get(startVertexId)!;
    const roads: Record<string, { playerId: string }> = {};
    for (const eid of vertex.adjacentEdges.slice(0, 3)) {
      roads[eid] = { playerId: 'p1' };
    }

    const state: GameState = {
      ...base,
      phase: 'playing',
      board: { ...base.board, roads },
    };

    const updated = updateLongestRoad(state);
    expect(updated.players[0].hasLongestRoad).toBe(false);
  });
});

describe('updateVictoryState', () => {
  it('sets winner when player hits 10 VP', () => {
    const base = playingState(make2PlayerState());
    const state: GameState = {
      ...base,
      players: base.players.map(p => p.id === 'p1' ? {
        ...p,
        settlements: 0,
        cities: 0,
        hasLargestArmy: true,
      } : p),
    };

    const updated = updateVictoryState(state);
    expect(updated.winner).toBe('p1');
    expect(updated.phase).toBe('finished');
  });
});
