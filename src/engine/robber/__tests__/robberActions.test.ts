import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import {
  handleMoveRobber,
  handleStealResource,
  handleDiscardResources,
  getPlayersWhoMustDiscard,
  requiredDiscardCount,
} from '../robberActions';
import type { GameState } from '../../../state/gameState';
import type { GameAction } from '../../../state/gameState';

function makeAction(type: GameAction['type'], playerId: string, payload: Record<string, unknown> = {}): GameAction {
  return { type, playerId, payload, timestamp: Date.now() };
}

function make2PlayerState() {
  return createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ], 42);
}

function robberState(base: ReturnType<typeof make2PlayerState>): GameState {
  return { ...base, phase: 'playing', turnPhase: 'robber' };
}

describe('MOVE_ROBBER', () => {
  it('updates robberHex', () => {
    const state = robberState(make2PlayerState());
    const otherHex = state.board.graph.hexes.find(
      h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
    )!;
    const newState = handleMoveRobber(state, makeAction('MOVE_ROBBER', 'p1', { hexCoord: otherHex.coord }));
    expect(newState.board.robberHex).toEqual(otherHex.coord);
  });

  it('fails if target is current hex', () => {
    const state = robberState(make2PlayerState());
    const newState = handleMoveRobber(state, makeAction('MOVE_ROBBER', 'p1', { hexCoord: state.board.robberHex }));
    expect(newState.board.robberHex).toEqual(state.board.robberHex);
  });

  it('transitions to stealing if opponent adjacent', () => {
    const state = robberState(make2PlayerState());
    // Pick a hex that is not the robber hex, place p2 settlement on a vertex adjacent to it
    const targetHex = state.board.graph.hexes.find(
      h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
    )!;

    // Find a vertex adjacent to targetHex
    let adjVertexId: string | undefined;
    for (const [vid, vertex] of state.board.graph.vertices) {
      if (vertex.adjacentHexes.some(h => h.q === targetHex.coord.q && h.r === targetHex.coord.r)) {
        adjVertexId = vid;
        break;
      }
    }
    if (!adjVertexId) return;

    const stateWithBuilding: GameState = {
      ...state,
      board: {
        ...state.board,
        buildings: { [adjVertexId]: { type: 'settlement', playerId: 'p2' } },
      },
    };

    const newState = handleMoveRobber(stateWithBuilding, makeAction('MOVE_ROBBER', 'p1', { hexCoord: targetHex.coord }));
    expect(newState.turnPhase).toBe('stealing');
  });

  it('transitions to postRoll if no opponents adjacent', () => {
    const state = robberState(make2PlayerState());
    // Move to a hex with no buildings
    const targetHex = state.board.graph.hexes.find(
      h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
    )!;
    const newState = handleMoveRobber(state, makeAction('MOVE_ROBBER', 'p1', { hexCoord: targetHex.coord }));
    expect(newState.turnPhase).toBe('postRoll');
  });
});

describe('STEAL_RESOURCE', () => {
  it('transfers card from target to current player', () => {
    const base = make2PlayerState();

    // Set up robber on a hex where p2 has a building
    const targetHex = base.board.graph.hexes.find(
      h => h.coord.q !== base.board.robberHex.q || h.coord.r !== base.board.robberHex.r
    )!;

    let adjVertexId: string | undefined;
    for (const [vid, vertex] of base.board.graph.vertices) {
      if (vertex.adjacentHexes.some(h => h.q === targetHex.coord.q && h.r === targetHex.coord.r)) {
        adjVertexId = vid;
        break;
      }
    }
    if (!adjVertexId) return;

    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'stealing',
      board: {
        ...base.board,
        robberHex: targetHex.coord,
        buildings: { [adjVertexId]: { type: 'settlement', playerId: 'p2' } },
      },
      players: base.players.map(p =>
        p.id === 'p2' ? { ...p, resources: { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
      ),
    };

    const newState = handleStealResource(state, makeAction('STEAL_RESOURCE', 'p1', { targetPlayerId: 'p2' }));
    const p1Resources = newState.players[0].resources;
    const p2Resources = newState.players[1].resources;
    expect(p1Resources.wood).toBe(1);
    expect(p2Resources.wood).toBe(2);
    expect(newState.turnPhase).toBe('postRoll');
  });
});

describe('DISCARD_RESOURCES', () => {
  it('removes correct cards from player', () => {
    const base = make2PlayerState();
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'discarding',
      pendingDiscards: ['p1'],
      players: base.players.map(p =>
        p.id === 'p1' ? { ...p, resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
      ),
    };

    // p1 has 8 cards, must discard 4
    const newState = handleDiscardResources(
      state,
      makeAction('DISCARD_RESOURCES', 'p1', { resources: { wood: 4 } })
    );
    expect(newState.players[0].resources.wood).toBe(4);
    expect(newState.pendingDiscards).toHaveLength(0);
  });

  it('transitions to robber phase after all discards', () => {
    const base = make2PlayerState();
    const state: GameState = {
      ...base,
      phase: 'playing',
      turnPhase: 'discarding',
      pendingDiscards: ['p1'],
      players: base.players.map(p =>
        p.id === 'p1' ? { ...p, resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
      ),
    };

    const newState = handleDiscardResources(
      state,
      makeAction('DISCARD_RESOURCES', 'p1', { resources: { wood: 4 } })
    );
    expect(newState.turnPhase).toBe('robber');
  });
});

describe('getPlayersWhoMustDiscard', () => {
  it('returns players with >7 cards', () => {
    const base = make2PlayerState();
    const state: GameState = {
      ...base,
      players: base.players.map(p =>
        p.id === 'p1' ? { ...p, resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
      ),
    };
    const mustDiscard = getPlayersWhoMustDiscard(state);
    expect(mustDiscard).toContain('p1');
    expect(mustDiscard).not.toContain('p2');
  });

  it('does not return players with exactly 7 cards', () => {
    const base = make2PlayerState();
    const state: GameState = {
      ...base,
      players: base.players.map(p =>
        p.id === 'p1' ? { ...p, resources: { wood: 7, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
      ),
    };
    const mustDiscard = getPlayersWhoMustDiscard(state);
    expect(mustDiscard).not.toContain('p1');
  });

  it('in C&K mode, city walls increase discard threshold', () => {
    const base = createInitialGameState([
      { id: 'p1', name: 'Player 1', color: 'red' },
      { id: 'p2', name: 'Player 2', color: 'blue' },
    ], 42, 'cities_and_knights');
    const cityVertexId = base.board.graph.vertices.keys().next().value as string;
    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        buildings: { [cityVertexId]: { type: 'city', playerId: 'p1' } },
        cityWalls: { [cityVertexId]: 'p1' },
      },
      players: base.players.map(p =>
        p.id === 'p1' ? { ...p, resources: { wood: 9, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
      ),
    };
    const mustDiscard = getPlayersWhoMustDiscard(state);
    expect(mustDiscard).not.toContain('p1'); // threshold is 9 with one wall
  });
});

describe('requiredDiscardCount', () => {
  it('returns floor(total/2)', () => {
    const base = make2PlayerState();
    const player = { ...base.players[0], resources: { wood: 9, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
    expect(requiredDiscardCount(player)).toBe(4); // floor(9/2)
  });

  it('returns correct amount for 8 cards', () => {
    const base = make2PlayerState();
    const player = { ...base.players[0], resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
    expect(requiredDiscardCount(player)).toBe(4); // floor(8/2)
  });
});
