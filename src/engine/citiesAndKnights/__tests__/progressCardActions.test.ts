import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import type { GameState, ProgressCard, ProgressCardType } from '../../../state/gameState';
import { handlePlayProgressCard, grantProgressCardReward } from '../progressCardActions';

function makeCard(type: ProgressCardType, deck: 'politics' | 'science' | 'trade' = 'politics'): ProgressCard {
  return { id: `${deck}_${type}_test`, type, deck };
}

function makeBaseState(card: ProgressCard): GameState {
  const state = createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ], 42, 'cities_and_knights');
  return {
    ...state,
    phase: 'playing',
    turnPhase: 'postRoll',
    currentPlayerIndex: 0,
    ck: {
      ...state.ck!,
      progressHands: {
        ...state.ck!.progressHands,
        p1: [card],
      },
    },
  };
}

describe('progressCardActions', () => {
  it('warlord activates all own knights', () => {
    const state = {
      ...makeBaseState(makeCard('warlord')),
      board: {
        ...makeBaseState(makeCard('warlord')).board,
        knights: {
          k1: { id: 'k1', ownerId: 'p1', vertexId: 'v0', level: 1 as const, active: false, hasActedThisTurn: false },
          k2: { id: 'k2', ownerId: 'p1', vertexId: 'v1', level: 2 as const, active: false, hasActedThisTurn: false },
        },
      },
    };
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'politics_warlord_test' }, timestamp: 0 });
    expect(after.board.knights.k1.active).toBe(true);
    expect(after.board.knights.k2.active).toBe(true);
  });

  it('constitution grants 1 permanent VP', () => {
    const state = makeBaseState(makeCard('constitution'));
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'politics_constitution_test' }, timestamp: 0 });
    expect(after.players[0].ckVictoryPoints).toBe(1);
  });

  it('spy steals a progress card from target', () => {
    const state = {
      ...makeBaseState(makeCard('spy')),
      ck: {
        ...makeBaseState(makeCard('spy')).ck!,
        progressHands: {
          p1: [makeCard('spy')],
          p2: [makeCard('mining', 'science')],
        },
      },
    };
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'politics_spy_test', targetPlayerId: 'p2' }, timestamp: 0 });
    expect(after.ck?.progressHands.p1.length).toBe(1);
    expect(after.ck?.progressHands.p2.length).toBe(0);
  });

  it('deserter removes weakest-level opponent knight when level 1', () => {
    const state = {
      ...makeBaseState(makeCard('deserter')),
      board: {
        ...makeBaseState(makeCard('deserter')).board,
        knights: {
          k1: { id: 'k1', ownerId: 'p2', vertexId: 'v0', level: 1 as const, active: true, hasActedThisTurn: false },
        },
      },
    };
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'politics_deserter_test' }, timestamp: 0 });
    expect(after.board.knights.k1).toBeUndefined();
  });

  it('irrigation adds 2 wheat', () => {
    const state = makeBaseState(makeCard('irrigation', 'science'));
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'science_irrigation_test' }, timestamp: 0 });
    expect(after.players[0].resources.wheat).toBe(2);
  });

  it('mining adds 2 ore', () => {
    const state = makeBaseState(makeCard('mining', 'science'));
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'science_mining_test' }, timestamp: 0 });
    expect(after.players[0].resources.ore).toBe(2);
  });

  it('engineer adds a city wall to an eligible city', () => {
    const base = makeBaseState(makeCard('engineer', 'science'));
    const cityVertexId = base.board.graph.vertices.keys().next().value as string;
    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        buildings: { [cityVertexId]: { type: 'city', playerId: 'p1' } },
      },
    };
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'science_engineer_test' }, timestamp: 0 });
    expect(after.board.cityWalls[cityVertexId]).toBe('p1');
  });

  it('tradeMonopoly takes selected commodity from all opponents', () => {
    const base = makeBaseState(makeCard('tradeMonopoly', 'trade'));
    const state: GameState = {
      ...base,
      players: base.players.map(p => (p.id === 'p2'
        ? { ...p, commodities: { ...p.commodities, cloth: 3 } }
        : p)),
    };
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'trade_tradeMonopoly_test', commodity: 'cloth' }, timestamp: 0 });
    expect(after.players[1].commodities.cloth).toBe(0);
    expect(after.players[0].commodities.cloth).toBe(3);
  });

  it('resourceMonopoly takes selected resource from all opponents', () => {
    const base = makeBaseState(makeCard('resourceMonopoly', 'trade'));
    const state: GameState = {
      ...base,
      players: base.players.map(p => (p.id === 'p2'
        ? { ...p, resources: { ...p.resources, wood: 4 } }
        : p)),
    };
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'trade_resourceMonopoly_test', resource: 'wood' }, timestamp: 0 });
    expect(after.players[1].resources.wood).toBe(0);
    expect(after.players[0].resources.wood).toBe(4);
  });

  it('merchantGift grants one of each commodity', () => {
    const state = makeBaseState(makeCard('merchantGift', 'trade'));
    const after = handlePlayProgressCard(state, { type: 'CK_PLAY_PROGRESS_CARD', playerId: 'p1', payload: { cardId: 'trade_merchantGift_test' }, timestamp: 0 });
    expect(after.players[0].commodities).toEqual({ cloth: 1, coin: 1, paper: 1 });
  });

  it('grantProgressCardReward draws from preferred improvement track', () => {
    const base = createInitialGameState([
      { id: 'p1', name: 'Player 1', color: 'red' },
      { id: 'p2', name: 'Player 2', color: 'blue' },
    ], 42, 'cities_and_knights');
    const state: GameState = {
      ...base,
      players: base.players.map(p => (p.id === 'p1'
        ? { ...p, cityImprovements: { politics: 1, science: 4, trade: 2 } }
        : p)),
    };
    const after = grantProgressCardReward(state, 'p1');
    expect((after.ck?.progressHands.p1.length ?? 0)).toBe(1);
    expect(after.ck?.progressHands.p1[0].deck).toBe('science');
  });
});

