import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import { handleImproveCity } from '../improvementActions';
import type { GameAction, GameState } from '../../../state/gameState';

function makeAction(playerId: string, area: 'politics' | 'science' | 'trade'): GameAction {
  return {
    type: 'CK_IMPROVE_CITY',
    playerId,
    payload: { area },
    timestamp: Date.now(),
  };
}

function makeState(expansionRules: 'base' | 'cities_and_knights'): GameState {
  return createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ], 42, expansionRules);
}

function withCityAndCommodities(state: GameState): GameState {
  const cityVertexId = state.board.graph.vertices.keys().next().value as string;
  const players = state.players.map(p => (p.id === 'p1'
    ? {
      ...p,
      commodities: { cloth: 5, coin: 5, paper: 5 },
    }
    : p
  ));

  return {
    ...state,
    phase: 'playing',
    turnPhase: 'postRoll',
    players,
    board: {
      ...state.board,
      buildings: {
        ...state.board.buildings,
        [cityVertexId]: { type: 'city', playerId: 'p1' },
      },
    },
  };
}

describe('handleImproveCity', () => {
  it('increments track level and spends matching commodity', () => {
    const state = withCityAndCommodities(makeState('cities_and_knights'));
    const after = handleImproveCity(state, makeAction('p1', 'politics'));

    const p1 = after.players[0];
    expect(p1.cityImprovements.politics).toBe(1);
    expect(p1.commodities.coin).toBe(4);
  });

  it('uses increasing cost per level', () => {
    const state = withCityAndCommodities(makeState('cities_and_knights'));
    const once = handleImproveCity(state, makeAction('p1', 'science'));
    const twice = handleImproveCity(once, makeAction('p1', 'science'));

    const p1 = twice.players[0];
    expect(p1.cityImprovements.science).toBe(2);
    expect(p1.commodities.paper).toBe(2); // spent 1 + 2
  });

  it('does not improve in base mode', () => {
    const state = withCityAndCommodities(makeState('base'));
    const after = handleImproveCity(state, makeAction('p1', 'trade'));
    expect(after).toEqual(state);
  });

  it('requires player to own at least one city', () => {
    const base = withCityAndCommodities(makeState('cities_and_knights'));
    const state = {
      ...base,
      board: {
        ...base.board,
        buildings: {},
      },
    };
    const after = handleImproveCity(state, makeAction('p1', 'trade'));
    expect(after.players[0].cityImprovements.trade).toBe(0);
  });

  it('does not exceed level 5', () => {
    const state = withCityAndCommodities(makeState('cities_and_knights'));
    const capped = {
      ...state,
      players: state.players.map(p => (p.id === 'p1'
        ? { ...p, cityImprovements: { ...p.cityImprovements, politics: 5 } }
        : p)),
    };
    const after = handleImproveCity(capped, makeAction('p1', 'politics'));
    expect(after.players[0].cityImprovements.politics).toBe(5);
  });

  it('awards metropolis when reaching level 4 with highest track', () => {
    const base = withCityAndCommodities(makeState('cities_and_knights'));
    const cityVertexId = Object.keys(base.board.buildings)[0];
    const state = {
      ...base,
      players: base.players.map(p => (p.id === 'p1'
        ? {
          ...p,
          cityImprovements: { ...p.cityImprovements, science: 3 },
          commodities: { ...p.commodities, paper: 10 },
        }
        : p)),
    };
    const after = handleImproveCity(state, makeAction('p1', 'science'));
    expect(after.players[0].cityImprovements.science).toBe(4);
    expect(after.ck?.metropolises.science.playerId).toBe('p1');
    expect(after.ck?.metropolises.science.cityVertexId).toBe(cityVertexId);
  });
});
