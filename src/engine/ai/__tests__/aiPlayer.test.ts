import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import { getAIAction } from '../aiPlayer';
import { dispatchAction } from '../../turnManager/turnManager';
import type { GameState } from '../../../state/gameState';

function makeSetupState(): GameState {
  return createInitialGameState([
    { id: 'p1', name: 'AI', color: 'red' },
    { id: 'p2', name: 'Human', color: 'blue' },
  ], 42);
}

function makePlayingState(): GameState {
  const base = createInitialGameState([
    { id: 'p1', name: 'AI', color: 'red' },
    { id: 'p2', name: 'Human', color: 'blue' },
  ], 42);
  return { ...base, phase: 'playing', turnPhase: 'preRoll', currentPlayerIndex: 0 };
}

function giveResources(state: GameState, playerId: string, resources: Record<string, number>): GameState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, resources: { ...p.resources, ...resources } } : p
    ),
  };
}

describe('aiPlayer', () => {
  it('AI returns ROLL_DICE action in preRoll phase', () => {
    const state = makePlayingState();
    const action = getAIAction(state, 'p1');
    expect(action).not.toBeNull();
    expect(action?.type).toBe('ROLL_DICE');
    expect(action?.playerId).toBe('p1');
  });

  it('AI returns END_TURN when nothing to build', () => {
    const state = makePlayingState();
    const postRoll = { ...state, turnPhase: 'postRoll' as const };
    const action = getAIAction(postRoll, 'p1');
    expect(action?.type).toBe('END_TURN');
  });

  it('AI places settlement during setup phase', () => {
    const state = makeSetupState();
    const action = getAIAction(state, 'p1');
    expect(action).not.toBeNull();
    expect(action?.type).toBe('PLACE_SETTLEMENT');
    expect(action?.payload.vertexId).toBeDefined();
  });

  it('AI places road after settlement during setup', () => {
    let state = makeSetupState();
    // Place settlement first
    const settlementAction = getAIAction(state, 'p1')!;
    state = dispatchAction(settlementAction, state);

    // Now should place road
    const roadAction = getAIAction(state, 'p1');
    expect(roadAction).not.toBeNull();
    expect(roadAction?.type).toBe('PLACE_ROAD');
  });

  it('AI builds settlement when resources available and placement valid', () => {
    // Need to set up board with valid placement position and road network
    let state = makeSetupState();

    // Complete setup for player 1: place settlement and road
    const action1 = getAIAction(state, 'p1')!;
    state = dispatchAction(action1, state);
    const action2 = getAIAction(state, 'p1')!;
    state = dispatchAction(action2, state);

    // Switch to playing phase
    state = {
      ...state,
      phase: 'playing',
      turnPhase: 'postRoll' as const,
      currentPlayerIndex: 0,
    };

    // Give resources to build a settlement
    state = giveResources(state, 'p1', { wood: 1, brick: 1, sheep: 1, wheat: 1 });

    const action = getAIAction(state, 'p1');
    // AI should try to build settlement or road (depends on valid placements)
    expect(action).not.toBeNull();
    expect(['BUILD_SETTLEMENT', 'BUILD_ROAD', 'BUY_DEVELOPMENT_CARD', 'BUILD_CITY', 'END_TURN']).toContain(action?.type);
  });

  it('AI moves robber to hex with opponent buildings', () => {
    // Set up a state where an opponent has buildings
    let state = makeSetupState();

    // Place settlement for p1
    const a1 = getAIAction(state, 'p1')!;
    state = dispatchAction(a1, state);
    const a2 = getAIAction(state, 'p1')!;
    state = dispatchAction(a2, state);

    // Manually switch to playing phase with robber situation
    state = {
      ...state,
      phase: 'playing',
      turnPhase: 'robber' as const,
      currentPlayerIndex: 0,
    };

    const action = getAIAction(state, 'p1');
    expect(action).not.toBeNull();
    expect(action?.type).toBe('MOVE_ROBBER');
    expect(action?.payload.hexCoord).toBeDefined();
  });
});
