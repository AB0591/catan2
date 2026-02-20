import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import {
  handleBuildSettlement,
  handleBuildRoad,
  handleBuildCity,
  handleBuyDevelopmentCard,
} from '../buildActions';
import type { GameState } from '../../../state/gameState';
import type { GameAction } from '../../../state/gameState';

function makeAction(type: GameAction['type'], playerId: string, payload: Record<string, unknown> = {}): GameAction {
  return { type, playerId, payload, timestamp: Date.now() };
}

function make2PlayerState() {
  return createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ]);
}

/** Get a state with p1 in postRoll, with a settlement at vertexId and an adjacent road */
function stateWithSettlementAndRoad(base: GameState, vertexId: string, edgeId: string): GameState {
  return {
    ...base,
    phase: 'playing',
    turnPhase: 'postRoll',
    board: {
      ...base.board,
      buildings: { ...base.board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
      roads: { ...base.board.roads, [edgeId]: { playerId: 'p1' } },
    },
    players: base.players.map(p => p.id === 'p1'
      ? { ...p, resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 } }
      : p
    ),
  };
}

describe('handleBuildSettlement', () => {
  it('deducts correct resources and places building', () => {
    const base = make2PlayerState();
    const vertexId = base.board.graph.vertices.keys().next().value as string;
    const vertex = base.board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];

    // Need a road to vertexId for non-setup placement
    const state = stateWithSettlementAndRoad(base, vertexId, edgeId);

    // Get a vertex adjacent to the road but not occupied
    const edge = base.board.graph.edges.get(edgeId)!;
    const targetVertexId = edge.vertices.find(v => v !== vertexId)!;
    // Clear that vertex and make sure it has no adjacent buildings
    const stateClean: GameState = {
      ...state,
      board: { ...state.board, buildings: { [vertexId]: { type: 'settlement', playerId: 'p1' } } },
    };

    const after = handleBuildSettlement(stateClean, makeAction('BUILD_SETTLEMENT', 'p1', { vertexId: targetVertexId }));

    // Check building placed
    if (after.board.buildings[targetVertexId]) {
      expect(after.board.buildings[targetVertexId]).toEqual({ type: 'settlement', playerId: 'p1' });
      expect(after.players[0].resources.brick).toBe(4);
      expect(after.players[0].resources.wood).toBe(4);
    } else {
      // Distance rule or no road — test the happy path directly with a manual setup
      // Place settlement somewhere with road and verify
      const sv = base.board.graph.vertices.keys().next().value as string;
      const sv2 = base.board.graph.vertices.get(sv)!.adjacentVertices[0];
      const se = base.board.graph.vertices.get(sv2)!.adjacentEdges[0];
      const stateRich: GameState = {
        ...base,
        phase: 'playing',
        turnPhase: 'postRoll',
        board: { ...base.board, roads: { [se]: { playerId: 'p1' } } },
        players: base.players.map(p => p.id === 'p1'
          ? { ...p, resources: { wood: 2, brick: 2, sheep: 2, wheat: 2, ore: 0 } }
          : p),
      };
      const after2 = handleBuildSettlement(stateRich, makeAction('BUILD_SETTLEMENT', 'p1', { vertexId: sv2 }));
      expect(after2.board.buildings[sv2]).toEqual({ type: 'settlement', playerId: 'p1' });
      expect(after2.players[0].resources.wood).toBe(1);
    }
  });

  it('fails with insufficient resources (state unchanged)', () => {
    const base = make2PlayerState();
    const vertexId = base.board.graph.vertices.keys().next().value as string;
    const vertex = base.board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];
    // No resources
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      board: { ...base.board, roads: { [edgeId]: { playerId: 'p1' } } },
    };
    const after = handleBuildSettlement(state, makeAction('BUILD_SETTLEMENT', 'p1', { vertexId }));
    expect(after.players[0].resources).toEqual(state.players[0].resources);
    expect(after.board.buildings[vertexId]).toBeUndefined();
  });

  it('fails if placement invalid', () => {
    const base = make2PlayerState();
    const vertexId = base.board.graph.vertices.keys().next().value as string;
    // Place opponent settlement at vertexId
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      board: { ...base.board, buildings: { [vertexId]: { type: 'settlement', playerId: 'p2' } } },
      players: base.players.map(p => p.id === 'p1'
        ? { ...p, resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 } }
        : p),
    };
    const after = handleBuildSettlement(state, makeAction('BUILD_SETTLEMENT', 'p1', { vertexId }));
    // Should still be p2's building, not p1's
    expect(after.board.buildings[vertexId]?.playerId).toBe('p2');
    // Resources unchanged
    expect(after.players[0].resources.wood).toBe(5);
  });
});

describe('handleBuildRoad', () => {
  it('deducts correct resources and places road', () => {
    const base = make2PlayerState();
    const vertexId = base.board.graph.vertices.keys().next().value as string;
    const vertex = base.board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];

    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      board: { ...base.board, buildings: { [vertexId]: { type: 'settlement', playerId: 'p1' } } },
      players: base.players.map(p => p.id === 'p1'
        ? { ...p, resources: { wood: 2, brick: 2, sheep: 0, wheat: 0, ore: 0 } }
        : p),
    };

    const after = handleBuildRoad(state, makeAction('BUILD_ROAD', 'p1', { edgeId }));
    expect(after.board.roads[edgeId]).toEqual({ playerId: 'p1' });
    expect(after.players[0].resources.wood).toBe(1);
    expect(after.players[0].resources.brick).toBe(1);
  });

  it('fails without connected network', () => {
    const base = make2PlayerState();
    const edgeId = base.board.graph.edges.keys().next().value as string;
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      players: base.players.map(p => p.id === 'p1'
        ? { ...p, resources: { wood: 5, brick: 5, sheep: 0, wheat: 0, ore: 0 } }
        : p),
    };
    const after = handleBuildRoad(state, makeAction('BUILD_ROAD', 'p1', { edgeId }));
    expect(after.board.roads[edgeId]).toBeUndefined();
  });
});

describe('handleBuildCity', () => {
  it('upgrades settlement to city and deducts resources', () => {
    const base = make2PlayerState();
    const vertexId = base.board.graph.vertices.keys().next().value as string;
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      board: { ...base.board, buildings: { [vertexId]: { type: 'settlement', playerId: 'p1' } } },
      players: base.players.map(p => p.id === 'p1'
        ? { ...p, resources: { wood: 0, brick: 0, sheep: 0, wheat: 3, ore: 5 } }
        : p),
    };

    const after = handleBuildCity(state, makeAction('BUILD_CITY', 'p1', { vertexId }));
    expect(after.board.buildings[vertexId]?.type).toBe('city');
    expect(after.players[0].resources.ore).toBe(2);
    expect(after.players[0].resources.wheat).toBe(1);
    expect(after.players[0].cities).toBe(3); // 4 - 1
    expect(after.players[0].settlements).toBe(6); // 5 + 1 (returned)
  });

  it('fails on opponent settlement', () => {
    const base = make2PlayerState();
    const vertexId = base.board.graph.vertices.keys().next().value as string;
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      board: { ...base.board, buildings: { [vertexId]: { type: 'settlement', playerId: 'p2' } } },
      players: base.players.map(p => p.id === 'p1'
        ? { ...p, resources: { wood: 0, brick: 0, sheep: 0, wheat: 3, ore: 5 } }
        : p),
    };

    const after = handleBuildCity(state, makeAction('BUILD_CITY', 'p1', { vertexId }));
    expect(after.board.buildings[vertexId]?.type).toBe('settlement'); // unchanged
    expect(after.board.buildings[vertexId]?.playerId).toBe('p2');
  });
});

describe('handleBuyDevelopmentCard', () => {
  it('deducts resources and adds card to player', () => {
    const base = make2PlayerState();
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      players: base.players.map(p => p.id === 'p1'
        ? { ...p, resources: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 } }
        : p),
    };

    const after = handleBuyDevelopmentCard(state, makeAction('BUY_DEVELOPMENT_CARD', 'p1'));
    expect(after.players[0].developmentCards.length).toBe(1);
    expect(after.players[0].resources.ore).toBe(0);
    expect(after.players[0].resources.wheat).toBe(0);
    expect(after.players[0].resources.sheep).toBe(0);
    expect(after.devCardDeck.length).toBe(base.devCardDeck.length - 1);
  });

  it('fails when deck is empty', () => {
    const base = make2PlayerState();
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'postRoll',
      devCardDeck: [],
      players: base.players.map(p => p.id === 'p1'
        ? { ...p, resources: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 } }
        : p),
    };

    const after = handleBuyDevelopmentCard(state, makeAction('BUY_DEVELOPMENT_CARD', 'p1'));
    expect(after.players[0].developmentCards.length).toBe(0);
    expect(after.players[0].resources.ore).toBe(1); // unchanged
  });
});
