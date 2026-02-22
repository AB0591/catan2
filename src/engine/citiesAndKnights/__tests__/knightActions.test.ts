import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import type { GameAction, GameState } from '../../../state/gameState';
import {
  handleBuildKnight,
  handleActivateKnight,
  handleMoveKnight,
  handlePromoteKnight,
  handleDriveAwayRobber,
  getValidKnightBuildVertices,
  getValidKnightMoveTargets,
} from '../knightActions';

function makeAction(type: GameAction['type'], playerId: string, payload: Record<string, unknown> = {}): GameAction {
  return { type, playerId, payload, timestamp: Date.now() };
}

function makeCkState(): GameState {
  return createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ], 42, 'cities_and_knights');
}

function postRollState(base: GameState): GameState {
  return { ...base, phase: 'playing', turnPhase: 'postRoll', currentPlayerIndex: 0 };
}

describe('knightActions', () => {
  it('builds an inactive basic knight and spends sheep+ore', () => {
    const base = postRollState(makeCkState());
    const edge = base.board.graph.edges.values().next().value;
    if (!edge) return;
    const vertexId = edge.vertices[0];

    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        roads: { ...base.board.roads, [edge.id]: { playerId: 'p1' } },
      },
      players: base.players.map(p => (p.id === 'p1'
        ? { ...p, resources: { ...p.resources, sheep: 1, ore: 1 } }
        : p)),
    };

    const after = handleBuildKnight(state, makeAction('CK_BUILD_KNIGHT', 'p1', { vertexId }));
    const knight = Object.values(after.board.knights)[0];
    expect(knight).toBeDefined();
    expect(knight.ownerId).toBe('p1');
    expect(knight.vertexId).toBe(vertexId);
    expect(knight.level).toBe(1);
    expect(knight.active).toBe(false);
    expect(after.players[0].resources.sheep).toBe(0);
    expect(after.players[0].resources.ore).toBe(0);
  });

  it('activates knight with 1 wheat', () => {
    const base = postRollState(makeCkState());
    const state: GameState = {
      ...base,
      players: base.players.map(p => (p.id === 'p1'
        ? { ...p, resources: { ...p.resources, wheat: 1 } }
        : p)),
      board: {
        ...base.board,
        knights: {
          k1: {
            id: 'k1',
            ownerId: 'p1',
            vertexId: base.board.graph.vertices.keys().next().value as string,
            level: 1,
            active: false,
            hasActedThisTurn: false,
          },
        },
      },
    };
    const after = handleActivateKnight(state, makeAction('CK_ACTIVATE_KNIGHT', 'p1', { knightId: 'k1' }));
    expect(after.board.knights.k1.active).toBe(true);
    expect(after.players[0].resources.wheat).toBe(0);
  });

  it('moves active knight to a connected adjacent vertex', () => {
    const base = postRollState(makeCkState());
    const edge = base.board.graph.edges.values().next().value;
    if (!edge) return;
    const [fromVertexId, toVertexId] = edge.vertices;
    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        roads: { [edge.id]: { playerId: 'p1' } },
        knights: {
          k1: {
            id: 'k1',
            ownerId: 'p1',
            vertexId: fromVertexId,
            level: 1,
            active: true,
            hasActedThisTurn: false,
          },
        },
      },
    };
    const validTargets = getValidKnightMoveTargets(state, 'k1');
    expect(validTargets).toContain(toVertexId);

    const after = handleMoveKnight(state, makeAction('CK_MOVE_KNIGHT', 'p1', { knightId: 'k1', toVertexId }));
    expect(after.board.knights.k1.vertexId).toBe(toVertexId);
    expect(after.board.knights.k1.hasActedThisTurn).toBe(true);
  });

  it('promotes active knight using coin and politics thresholds', () => {
    const base = postRollState(makeCkState());
    const state: GameState = {
      ...base,
      players: base.players.map(p => (p.id === 'p1'
        ? {
          ...p,
          commodities: { ...p.commodities, coin: 1 },
          cityImprovements: { ...p.cityImprovements, politics: 2 },
        }
        : p)),
      board: {
        ...base.board,
        knights: {
          k1: {
            id: 'k1',
            ownerId: 'p1',
            vertexId: base.board.graph.vertices.keys().next().value as string,
            level: 1,
            active: true,
            hasActedThisTurn: false,
          },
        },
      },
    };
    const after = handlePromoteKnight(state, makeAction('CK_PROMOTE_KNIGHT', 'p1', { knightId: 'k1' }));
    expect(after.board.knights.k1.level).toBe(2);
    expect(after.players[0].commodities.coin).toBe(0);
  });

  it('displaces weaker opposing knight when a legal displacement target exists', () => {
    const base = postRollState(makeCkState());
    const candidate = Array.from(base.board.graph.edges.values()).find(edge => {
      const v = base.board.graph.vertices.get(edge.vertices[1]);
      return Boolean(v && v.adjacentVertices.length >= 2);
    });
    if (!candidate) return;

    const fromVertexId = candidate.vertices[0];
    const contestedVertexId = candidate.vertices[1];
    const contested = base.board.graph.vertices.get(contestedVertexId);
    if (!contested) return;
    const displacementVertexId = contested.adjacentVertices.find(v => v !== fromVertexId);
    if (!displacementVertexId) return;

    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        roads: {
          [candidate.id]: { playerId: 'p1' },
          ...Object.fromEntries(
            contested.adjacentEdges
              .filter(edgeId => {
                const edge = base.board.graph.edges.get(edgeId);
                return Boolean(edge && edge.vertices.includes(displacementVertexId));
              })
              .map(edgeId => [edgeId, { playerId: 'p2' }])
          ),
        },
        knights: {
          strong: {
            id: 'strong',
            ownerId: 'p1',
            vertexId: fromVertexId,
            level: 2,
            active: true,
            hasActedThisTurn: false,
          },
          weak: {
            id: 'weak',
            ownerId: 'p2',
            vertexId: contestedVertexId,
            level: 1,
            active: true,
            hasActedThisTurn: false,
          },
        },
      },
    };

    const after = handleMoveKnight(
      state,
      makeAction('CK_MOVE_KNIGHT', 'p1', { knightId: 'strong', toVertexId: contestedVertexId })
    );
    expect(after.board.knights.strong.vertexId).toBe(contestedVertexId);
    expect(after.board.knights.weak.vertexId).toBe(displacementVertexId);
  });

  it('drives away robber with an active knight adjacent to robber hex', () => {
    const base = postRollState(makeCkState());
    const robber = base.board.robberHex;
    const vertexEntry = Array.from(base.board.graph.vertices.entries()).find(([, vertex]) =>
      vertex.adjacentHexes.some(h => h.q === robber.q && h.r === robber.r)
    );
    if (!vertexEntry) return;

    const [vertexId] = vertexEntry;
    const targetHex = base.board.graph.hexes.find(
      h => h.coord.q !== robber.q || h.coord.r !== robber.r
    )?.coord;
    if (!targetHex) return;

    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        knights: {
          k1: {
            id: 'k1',
            ownerId: 'p1',
            vertexId,
            level: 1,
            active: true,
            hasActedThisTurn: false,
          },
        },
      },
    };

    const after = handleDriveAwayRobber(
      state,
      makeAction('CK_DRIVE_AWAY_ROBBER', 'p1', { knightId: 'k1', hexCoord: targetHex })
    );
    expect(after.board.robberHex).toEqual(targetHex);
    expect(after.board.knights.k1.hasActedThisTurn).toBe(true);
  });

  it('returns build vertices connected to player roads', () => {
    const base = postRollState(makeCkState());
    const edge = base.board.graph.edges.values().next().value;
    if (!edge) return;
    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        roads: { [edge.id]: { playerId: 'p1' } },
      },
    };
    const valid = getValidKnightBuildVertices(state, 'p1');
    expect(valid.length).toBeGreaterThan(0);
    expect(valid).toContain(edge.vertices[0]);
  });
});
