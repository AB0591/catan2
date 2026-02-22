import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import type { GameState } from '../../../state/gameState';
import { advanceBarbariansAfterRoll } from '../barbarianActions';

function makeCkState(): GameState {
  return createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ], 42, 'cities_and_knights');
}

describe('barbarianActions', () => {
  it('advances barbarian track by one after roll', () => {
    const state = makeCkState();
    const after = advanceBarbariansAfterRoll(state);
    expect(after.ck?.barbarians.position).toBe(1);
  });

  it('resolves attack with city downgrade when defense is lower', () => {
    const base = makeCkState();
    const cityVertexId = base.board.graph.vertices.keys().next().value as string;
    const state: GameState = {
      ...base,
      ck: {
        ...base.ck!,
        barbarians: { ...base.ck!.barbarians, position: base.ck!.barbarians.stepsToAttack - 1 },
      },
      board: {
        ...base.board,
        buildings: { [cityVertexId]: { type: 'city', playerId: 'p1' } },
      },
      players: base.players.map(p => (p.id === 'p1'
        ? { ...p, cities: 3, settlements: 5 }
        : p)),
    };

    const after = advanceBarbariansAfterRoll(state);
    expect(after.ck?.barbarians.position).toBe(0);
    expect(after.board.buildings[cityVertexId].type).toBe('settlement');
    expect(after.ck?.lastBarbarianAttack?.losers).toContain('p1');
  });

  it('rewards strongest defenders with progress cards when defense succeeds', () => {
    const base = makeCkState();
    const cityVertexIds = Array.from(base.board.graph.vertices.keys()).slice(0, 2);
    const state: GameState = {
      ...base,
      ck: {
        ...base.ck!,
        barbarians: { ...base.ck!.barbarians, position: base.ck!.barbarians.stepsToAttack - 1 },
      },
      board: {
        ...base.board,
        buildings: {
          [cityVertexIds[0]]: { type: 'city', playerId: 'p1' },
          [cityVertexIds[1]]: { type: 'city', playerId: 'p2' },
        },
        knights: {
          k1: {
            id: 'k1',
            ownerId: 'p1',
            vertexId: cityVertexIds[0],
            level: 2,
            active: true,
            hasActedThisTurn: false,
          },
        },
      },
      players: base.players.map(p => (p.id === 'p1'
        ? { ...p, cities: 3, settlements: 5 }
        : { ...p, cities: 3, settlements: 5 })),
    };

    const beforeHand = state.ck?.progressHands.p1.length ?? 0;
    const after = advanceBarbariansAfterRoll(state);
    const afterHand = after.ck?.progressHands.p1.length ?? 0;
    expect(afterHand).toBeGreaterThan(beforeHand);
    expect(after.ck?.lastBarbarianAttack?.rewarded).toContain('p1');
  });

  it('metropolis city is protected from barbarian downgrade', () => {
    const base = makeCkState();
    const cityVertexId = base.board.graph.vertices.keys().next().value as string;
    const state: GameState = {
      ...base,
      ck: {
        ...base.ck!,
        barbarians: { ...base.ck!.barbarians, position: base.ck!.barbarians.stepsToAttack - 1 },
        metropolises: {
          ...base.ck!.metropolises,
          politics: { playerId: 'p1', cityVertexId },
        },
      },
      board: {
        ...base.board,
        buildings: { [cityVertexId]: { type: 'city', playerId: 'p1' } },
      },
      players: base.players.map(p => (p.id === 'p1'
        ? {
          ...p,
          cities: 3,
          settlements: 5,
          cityImprovements: { ...p.cityImprovements, politics: 4 },
        }
        : p)),
    };

    const after = advanceBarbariansAfterRoll(state);
    expect(after.board.buildings[cityVertexId].type).toBe('city');
  });
});

