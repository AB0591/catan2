import { describe, it, expect } from 'vitest';
import { createInitialGameState, serializeGameState } from '../gameStateFactory';

const threePlayerConfigs = [
  { id: 'p1', name: 'Alice', color: 'red' as const },
  { id: 'p2', name: 'Bob', color: 'blue' as const },
  { id: 'p3', name: 'Carol', color: 'orange' as const },
];

const fourPlayerConfigs = [
  ...threePlayerConfigs,
  { id: 'p4', name: 'Dave', color: 'white' as const },
];

describe('createInitialGameState', () => {
  it('creates correct player count for 3 players', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    expect(state.players).toHaveLength(3);
  });

  it('starts with phase setup and turnPhase setupPlacement', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    expect(state.phase).toBe('setup');
    expect(state.turnPhase).toBe('setupPlacement');
  });

  it('dev card deck has exactly 25 cards', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    expect(state.devCardDeck).toHaveLength(25);
  });

  it('dev card deck contains correct counts of each type', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    const counts = state.devCardDeck.reduce<Record<string, number>>((acc, card) => {
      acc[card] = (acc[card] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts['knight']).toBe(14);
    expect(counts['victoryPoint']).toBe(5);
    expect(counts['roadBuilding']).toBe(2);
    expect(counts['yearOfPlenty']).toBe(2);
    expect(counts['monopoly']).toBe(2);
  });

  it('setup player order for 4 players is length 8 (snake: 0,1,2,3,3,2,1,0)', () => {
    const state = createInitialGameState(fourPlayerConfigs, 42);
    expect(state.setupPlayerOrder).toHaveLength(8);
    expect(state.setupPlayerOrder).toEqual([0, 1, 2, 3, 3, 2, 1, 0]);
  });

  it('setup player order for 3 players is length 6', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    expect(state.setupPlayerOrder).toHaveLength(6);
    expect(state.setupPlayerOrder).toEqual([0, 1, 2, 2, 1, 0]);
  });

  it('winner is null on new game', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    expect(state.winner).toBeNull();
  });

  it('defaults to base expansion rules', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    expect(state.expansionRules).toBe('base');
    expect(state.ck).toBeNull();
    expect(state.victoryPointTarget).toBe(10);
  });

  it('initializes C&K state when cities_and_knights mode is selected', () => {
    const state = createInitialGameState(threePlayerConfigs, 42, 'cities_and_knights');
    expect(state.expansionRules).toBe('cities_and_knights');
    expect(state.ck).not.toBeNull();
    expect(state.victoryPointTarget).toBe(13);
    expect(state.ck?.barbarians.position).toBe(0);
    expect(state.ck?.barbarians.stepsToAttack).toBe(7);
    expect(state.ck?.progressHands.p1).toEqual([]);
    expect(state.ck?.progressDecks.politics.length).toBeGreaterThan(0);
  });

  it('uses custom victory point target when provided', () => {
    const state = createInitialGameState(threePlayerConfigs, 42, 'base', 12);
    expect(state.victoryPointTarget).toBe(12);
  });

  it('clamps victory point target to supported range', () => {
    const low = createInitialGameState(threePlayerConfigs, 42, 'base', 3);
    const high = createInitialGameState(threePlayerConfigs, 42, 'base', 20);
    expect(low.victoryPointTarget).toBe(6);
    expect(high.victoryPointTarget).toBe(16);
  });
});

describe('serializeGameState', () => {
  it('produces valid JSON', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    const json = serializeGameState(state);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('serialized state represents Maps as objects', () => {
    const state = createInitialGameState(threePlayerConfigs, 42);
    const parsed = JSON.parse(serializeGameState(state));
    expect(parsed.board.graph.vertices).toBeDefined();
    expect(typeof parsed.board.graph.vertices).toBe('object');
    expect(Array.isArray(parsed.board.graph.vertices)).toBe(false);
    expect(parsed.board.graph.edges).toBeDefined();
    expect(typeof parsed.board.graph.edges).toBe('object');
  });

  it('two states with same seed produce identical board hex layouts', () => {
    const state1 = createInitialGameState(threePlayerConfigs, 99);
    const state2 = createInitialGameState(threePlayerConfigs, 99);
    expect(state1.board.graph.hexes).toEqual(state2.board.graph.hexes);
  });
});
