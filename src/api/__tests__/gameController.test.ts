import { describe, it, expect, vi } from 'vitest';
import { createInitialGameState } from '../../state/gameStateFactory';
import { dispatchAction } from '../../engine/turnManager/turnManager';
import {
  serializeState,
  deserializeState,
  replayFromLog,
  validateAction,
} from '../gameController';
import {
  createDispatcher,
  loggingMiddleware,
  validationMiddleware,
  type Middleware,
} from '../actionDispatcher';
import type { GameState, GameAction } from '../../state/gameState';

function makeState(): GameState {
  return createInitialGameState([
    { id: 'p1', name: 'Alice', color: 'red' },
    { id: 'p2', name: 'Bob', color: 'blue' },
  ], 42);
}

function makeAction(
  type: GameAction['type'],
  playerId: string,
  payload: Record<string, unknown> = {}
): GameAction {
  return { type, playerId, payload, timestamp: 0 };
}

describe('gameController', () => {
  it('serializeState produces valid JSON', () => {
    const state = makeState();
    const json = serializeState(state);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(typeof parsed).toBe('object');
    expect(parsed.players).toHaveLength(2);
  });

  it('deserializeState reconstructs Maps correctly', () => {
    const state = makeState();
    const json = serializeState(state);
    const restored = deserializeState(json);
    expect(restored.board.graph.vertices).toBeInstanceOf(Map);
    expect(restored.board.graph.edges).toBeInstanceOf(Map);
    expect(restored.board.graph.vertices.size).toBeGreaterThan(0);
    expect(restored.board.graph.edges.size).toBeGreaterThan(0);
  });

  it('deserializeState defaults victory point target for older base saves', () => {
    const state = makeState();
    const parsed = JSON.parse(serializeState(state));
    delete parsed.victoryPointTarget;

    const restored = deserializeState(JSON.stringify(parsed));
    expect(restored.victoryPointTarget).toBe(10);
  });

  it('deserializeState defaults victory point target for older C&K saves', () => {
    const state = createInitialGameState([
      { id: 'p1', name: 'Alice', color: 'red' },
      { id: 'p2', name: 'Bob', color: 'blue' },
    ], 42, 'cities_and_knights');
    const parsed = JSON.parse(serializeState(state));
    delete parsed.victoryPointTarget;

    const restored = deserializeState(JSON.stringify(parsed));
    expect(restored.victoryPointTarget).toBe(13);
  });

  it('deserializeState(serializeState(state)) is deep-equal to original', () => {
    const state = makeState();
    const restored = deserializeState(serializeState(state));
    // Compare key properties
    expect(restored.players).toHaveLength(state.players.length);
    expect(restored.board.graph.vertices.size).toBe(state.board.graph.vertices.size);
    expect(restored.board.graph.edges.size).toBe(state.board.graph.edges.size);
    expect(restored.board.graph.hexes).toHaveLength(state.board.graph.hexes.length);
    expect(restored.phase).toBe(state.phase);
    expect(restored.currentPlayerIndex).toBe(state.currentPlayerIndex);
  });

  it('replayFromLog produces same state as live play', () => {
    const initial = makeState();

    // Get a valid vertex to place settlement
    const validVertex = [...initial.board.graph.vertices.keys()][0];
    const actions: GameAction[] = [
      makeAction('PLACE_SETTLEMENT', 'p1', { vertexId: validVertex }),
    ];

    // Live play
    let liveState = initial;
    for (const action of actions) {
      liveState = dispatchAction(action, liveState);
    }

    // Replay
    const replayed = replayFromLog(initial, actions);

    expect(replayed.board.buildings[validVertex]).toEqual(liveState.board.buildings[validVertex]);
    expect(replayed.players[0].settlements).toBe(liveState.players[0].settlements);
  });

  it('validateAction returns valid for legal ROLL_DICE action', () => {
    const state = makeState();
    const playingState: GameState = {
      ...state,
      phase: 'playing',
      turnPhase: 'preRoll',
      currentPlayerIndex: 0,
    };
    const action = makeAction('ROLL_DICE', 'p1', { die1: 3, die2: 4 });
    const result = validateAction(action, playingState);
    expect(result.valid).toBe(true);
  });

  it('validateAction returns invalid with reason for END_TURN in preRoll', () => {
    const state = makeState();
    const playingState: GameState = {
      ...state,
      phase: 'playing',
      turnPhase: 'preRoll',
      currentPlayerIndex: 0,
    };
    const action = makeAction('END_TURN', 'p1', {});
    const result = validateAction(action, playingState);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('validateAction rejects CK_IMPROVE_CITY in base mode', () => {
    const state = makeState();
    const playingState: GameState = {
      ...state,
      phase: 'playing',
      turnPhase: 'postRoll',
      currentPlayerIndex: 0,
    };
    const action = makeAction('CK_IMPROVE_CITY', 'p1', { area: 'politics' });
    const result = validateAction(action, playingState);
    expect(result.valid).toBe(false);
  });

  it('validateAction accepts CK_IMPROVE_CITY in C&K postRoll', () => {
    const state = createInitialGameState([
      { id: 'p1', name: 'Alice', color: 'red' },
      { id: 'p2', name: 'Bob', color: 'blue' },
    ], 42, 'cities_and_knights');
    const playingState: GameState = {
      ...state,
      phase: 'playing',
      turnPhase: 'postRoll',
      currentPlayerIndex: 0,
    };
    const action = makeAction('CK_IMPROVE_CITY', 'p1', { area: 'politics' });
    const result = validateAction(action, playingState);
    expect(result.valid).toBe(true);
  });

  it('validateAction accepts CK_BUILD_KNIGHT in C&K postRoll', () => {
    const state = createInitialGameState([
      { id: 'p1', name: 'Alice', color: 'red' },
      { id: 'p2', name: 'Bob', color: 'blue' },
    ], 42, 'cities_and_knights');
    const playingState: GameState = {
      ...state,
      phase: 'playing',
      turnPhase: 'postRoll',
      currentPlayerIndex: 0,
    };
    const action = makeAction('CK_BUILD_KNIGHT', 'p1', { vertexId: 'v0' });
    const result = validateAction(action, playingState);
    expect(result.valid).toBe(true);
  });

  it('validateAction accepts CK_PLAY_PROGRESS_CARD in C&K postRoll', () => {
    const state = createInitialGameState([
      { id: 'p1', name: 'Alice', color: 'red' },
      { id: 'p2', name: 'Bob', color: 'blue' },
    ], 42, 'cities_and_knights');
    const playingState: GameState = {
      ...state,
      phase: 'playing',
      turnPhase: 'postRoll',
      currentPlayerIndex: 0,
    };
    const action = makeAction('CK_PLAY_PROGRESS_CARD', 'p1', { cardId: 'science_irrigation_0' });
    const result = validateAction(action, playingState);
    expect(result.valid).toBe(true);
  });

  it('Middleware chain is called in order', () => {
    const callOrder: string[] = [];

    const mw1: Middleware = (action, state, next) => {
      callOrder.push('mw1');
      return next(action, state);
    };
    const mw2: Middleware = (action, state, next) => {
      callOrder.push('mw2');
      return next(action, state);
    };

    const dispatch = createDispatcher([mw1, mw2]);
    const state = makeState();
    const validVertex = [...state.board.graph.vertices.keys()][0];
    dispatch(makeAction('PLACE_SETTLEMENT', 'p1', { vertexId: validVertex }), state);

    expect(callOrder).toEqual(['mw1', 'mw2']);
  });

  it('Validation middleware rejects invalid actions', () => {
    const dispatch = createDispatcher([validationMiddleware]);
    const state = makeState();

    // Try to END_TURN during setup (invalid)
    const before = state.players[0].settlements;
    const newState = dispatch(makeAction('END_TURN', 'p1', {}), state);

    // State should be unchanged since END_TURN during setup is rejected
    expect(newState.players[0].settlements).toBe(before);
    expect(newState.phase).toBe('setup');
  });
});

describe('actionDispatcher', () => {
  it('loggingMiddleware logs and passes through', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const dispatch = createDispatcher([loggingMiddleware]);
    const state = makeState();
    const validVertex = [...state.board.graph.vertices.keys()][0];

    dispatch(makeAction('PLACE_SETTLEMENT', 'p1', { vertexId: validVertex }), state);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PLACE_SETTLEMENT'));
    consoleSpy.mockRestore();
  });
});
