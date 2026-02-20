import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import { dispatchAction, appendAction } from '../turnManager';
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

describe('ROLL_DICE', () => {
  it('sets lastDiceRoll correctly', () => {
    const state = make2PlayerState();
    const playingState = { ...state, phase: 'playing' as const, turnPhase: 'preRoll' as const };
    const newState = dispatchAction(makeAction('ROLL_DICE', 'p1', { die1: 3, die2: 4 }), playingState);
    expect(newState.lastDiceRoll).toEqual({ die1: 3, die2: 4, total: 7 });
  });

  it('sets turnPhase to robber when total is 7', () => {
    const state = make2PlayerState();
    const playingState = { ...state, phase: 'playing' as const, turnPhase: 'preRoll' as const };
    const newState = dispatchAction(makeAction('ROLL_DICE', 'p1', { die1: 3, die2: 4 }), playingState);
    expect(newState.turnPhase).toBe('robber');
  });

  it('sets turnPhase to postRoll when total is not 7', () => {
    const state = make2PlayerState();
    const playingState = { ...state, phase: 'playing' as const, turnPhase: 'preRoll' as const };
    const newState = dispatchAction(makeAction('ROLL_DICE', 'p1', { die1: 3, die2: 3 }), playingState);
    expect(newState.turnPhase).toBe('postRoll');
    expect(newState.lastDiceRoll?.total).toBe(6);
  });
});

describe('END_TURN', () => {
  it('advances player index', () => {
    const state = make2PlayerState();
    const playingState = { ...state, phase: 'playing' as const, currentPlayerIndex: 0 };
    const newState = dispatchAction(makeAction('END_TURN', 'p1'), playingState);
    expect(newState.currentPlayerIndex).toBe(1);
  });

  it('wraps around to player 0', () => {
    const state = make2PlayerState();
    const playingState = { ...state, phase: 'playing' as const, currentPlayerIndex: 1 };
    const newState = dispatchAction(makeAction('END_TURN', 'p2'), playingState);
    expect(newState.currentPlayerIndex).toBe(0);
  });

  it('resets turnPhase to preRoll', () => {
    const state = make2PlayerState();
    const playingState = { ...state, phase: 'playing' as const, turnPhase: 'postRoll' as const };
    const newState = dispatchAction(makeAction('END_TURN', 'p1'), playingState);
    expect(newState.turnPhase).toBe('preRoll');
  });
});

describe('PLACE_SETTLEMENT during setup', () => {
  it('places building on board', () => {
    const state = make2PlayerState();
    const vertexId = state.board.graph.vertices.keys().next().value as string;
    const newState = dispatchAction(makeAction('PLACE_SETTLEMENT', 'p1', { vertexId }), state);
    expect(newState.board.buildings[vertexId]).toEqual({ type: 'settlement', playerId: 'p1' });
    expect(newState.players[0].settlements).toBe(4); // 5 - 1
  });
});

describe('PLACE_ROAD during setup', () => {
  it('places road on board', () => {
    const state = make2PlayerState();
    const vertexId = state.board.graph.vertices.keys().next().value as string;
    const vertex = state.board.graph.vertices.get(vertexId)!;
    const edgeId = vertex.adjacentEdges[0];

    // First place settlement
    const stateWithSettlement = dispatchAction(
      makeAction('PLACE_SETTLEMENT', 'p1', { vertexId }),
      state
    );
    // Then place road connected to that settlement
    const newState = dispatchAction(
      makeAction('PLACE_ROAD', 'p1', { edgeId, lastPlacedSettlementVertexId: vertexId }),
      stateWithSettlement
    );
    expect(newState.board.roads[edgeId]).toEqual({ playerId: 'p1' });
    expect(newState.players[0].roads).toBe(14); // 15 - 1
  });
});

describe('action log', () => {
  it('appends action to actionLog on every dispatch', () => {
    const state = make2PlayerState();
    const playingState = { ...state, phase: 'playing' as const, turnPhase: 'preRoll' as const };
    const newState = dispatchAction(makeAction('ROLL_DICE', 'p1', { die1: 2, die2: 3 }), playingState);
    expect(newState.actionLog).toHaveLength(1);
    expect(newState.actionLog[0].type).toBe('ROLL_DICE');
  });

  it('appendAction helper appends correctly', () => {
    const state = make2PlayerState();
    const action = makeAction('END_TURN', 'p1');
    const newState = appendAction(state, action);
    expect(newState.actionLog).toHaveLength(1);
  });
});

describe('Setup completion', () => {
  it('transitions to playing phase after all setup placements', () => {
    // 2 players: setup order = [0,1,1,0]
    // Need 4 settlements + 4 roads
    const state = make2PlayerState();
    const vertices = Array.from(state.board.graph.vertices.keys());

    // Helper: place settlement + road for a player at a given vertex
    function placeSetupTurn(s: ReturnType<typeof make2PlayerState>, vertexId: string, playerId: string) {
      const vertex = s.board.graph.vertices.get(vertexId)!;
      const edgeId = vertex.adjacentEdges[0];
      let ns = dispatchAction(makeAction('PLACE_SETTLEMENT', playerId, { vertexId }), s);
      ns = dispatchAction(makeAction('PLACE_ROAD', playerId, { edgeId, lastPlacedSettlementVertexId: vertexId }), ns);
      return ns;
    }

    // Setup order for 2 players: [0, 1, 1, 0]
    let s = state;
    // Turn 1: p1 (index 0)
    s = placeSetupTurn(s, vertices[0], 'p1');
    // Turn 2: p2 (index 1)
    s = placeSetupTurn(s, vertices[10], 'p2');
    // Turn 3: p2 (index 1) — snake
    s = placeSetupTurn(s, vertices[20], 'p2');
    // Turn 4: p1 (index 0) — snake back
    s = placeSetupTurn(s, vertices[30], 'p1');

    expect(s.phase).toBe('playing');
    expect(s.turnPhase).toBe('preRoll');
  });
});
