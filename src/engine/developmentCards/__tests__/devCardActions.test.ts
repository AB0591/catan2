import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import {
  handlePlayKnight,
  handlePlayRoadBuilding,
  handlePlayYearOfPlenty,
  handlePlayMonopoly,
} from '../devCardActions';
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

/** Give player a dev card of a given type, bought on a previous turn */
function giveCard(state: GameState, playerId: string, cardType: string, turnBought = -1): GameState {
  const pi = state.players.findIndex(p => p.id === playerId);
  if (pi === -1) return state;
  const newCard = { type: cardType as import('../../../state/playerState').DevelopmentCardType, playedThisTurn: false, turnBought };
  const updatedPlayers = state.players.map((p, i) =>
    i === pi ? { ...p, developmentCards: [...p.developmentCards, newCard] } : p
  );
  return { ...state, players: updatedPlayers };
}

function playingState(base: ReturnType<typeof make2PlayerState>): GameState {
  return { ...base, phase: 'playing', turnPhase: 'postRoll', currentTurn: 1 };
}

describe('PLAY_KNIGHT', () => {
  it('moves robber and increments knightsPlayed', () => {
    const base = playingState(make2PlayerState());
    const state = giveCard(base, 'p1', 'knight', 0); // bought on turn 0, current is 1

    const otherHex = state.board.graph.hexes.find(
      h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
    )!;

    const newState = handlePlayKnight(state, makeAction('PLAY_KNIGHT', 'p1', { hexCoord: otherHex.coord }));
    expect(newState.board.robberHex).toEqual(otherHex.coord);
    expect(newState.players[0].knightsPlayed).toBe(1);
    expect(newState.players[0].developmentCards[0].playedThisTurn).toBe(true);
  });

  it('awards Largest Army at 3 knights when no current holder', () => {
    const base = playingState(make2PlayerState());
    let state = giveCard(base, 'p1', 'knight', 0);
    state = { ...state, players: state.players.map(p => p.id === 'p1' ? { ...p, knightsPlayed: 2 } : p) };

    const otherHex = state.board.graph.hexes.find(
      h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
    )!;

    const newState = handlePlayKnight(state, makeAction('PLAY_KNIGHT', 'p1', { hexCoord: otherHex.coord }));
    expect(newState.players[0].knightsPlayed).toBe(3);
    expect(newState.players[0].hasLargestArmy).toBe(true);
  });

  it('transfers Largest Army when beating current holder', () => {
    const base = playingState(make2PlayerState());
    // p2 has largest army with 3 knights
    let state = giveCard(base, 'p1', 'knight', 0);
    state = {
      ...state,
      players: state.players.map(p => {
        if (p.id === 'p1') return { ...p, knightsPlayed: 3 };
        if (p.id === 'p2') return { ...p, knightsPlayed: 3, hasLargestArmy: true };
        return p;
      }),
      largestArmySize: 3,
    };

    const otherHex = state.board.graph.hexes.find(
      h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
    )!;

    const newState = handlePlayKnight(state, makeAction('PLAY_KNIGHT', 'p1', { hexCoord: otherHex.coord }));
    expect(newState.players[0].knightsPlayed).toBe(4);
    expect(newState.players[0].hasLargestArmy).toBe(true);
    expect(newState.players[1].hasLargestArmy).toBe(false);
  });

  it('cannot be played the turn it was bought', () => {
    const base = playingState(make2PlayerState());
    // Card bought on current turn (1)
    const state = giveCard(base, 'p1', 'knight', 1);

    const otherHex = state.board.graph.hexes.find(
      h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
    )!;

    const newState = handlePlayKnight(state, makeAction('PLAY_KNIGHT', 'p1', { hexCoord: otherHex.coord }));
    // Should not move robber
    expect(newState.board.robberHex).toEqual(state.board.robberHex);
    expect(newState.players[0].knightsPlayed).toBe(0);
  });

  it('keeps stealing phase active when robber lands next to an opponent', () => {
    const base = playingState(make2PlayerState());
    const stateWithCard = giveCard(base, 'p1', 'knight', 0);

    const targetHex = stateWithCard.board.graph.hexes.find(
      h => h.coord.q !== stateWithCard.board.robberHex.q || h.coord.r !== stateWithCard.board.robberHex.r
    )!;
    const adjacentVertexId = Array.from(stateWithCard.board.graph.vertices.entries()).find(([, vertex]) =>
      vertex.adjacentHexes.some(h => h.q === targetHex.coord.q && h.r === targetHex.coord.r)
    )?.[0];
    expect(adjacentVertexId).toBeTruthy();

    const state = {
      ...stateWithCard,
      board: {
        ...stateWithCard.board,
        buildings: {
          ...stateWithCard.board.buildings,
          [adjacentVertexId!]: { type: 'settlement' as const, playerId: 'p2' },
        },
      },
    };

    const newState = handlePlayKnight(state, makeAction('PLAY_KNIGHT', 'p1', { hexCoord: targetHex.coord }));
    expect(newState.turnPhase).toBe('stealing');
  });

  it('does nothing when knight payload is missing hexCoord', () => {
    const base = playingState(make2PlayerState());
    const state = giveCard(base, 'p1', 'knight', 0);

    const newState = handlePlayKnight(state, makeAction('PLAY_KNIGHT', 'p1', {}));
    expect(newState).toEqual(state);
  });
});

describe('PLAY_ROAD_BUILDING', () => {
  it('places 2 free roads', () => {
    const base = playingState(make2PlayerState());
    const state = giveCard(base, 'p1', 'roadBuilding', 0);

    // Place a settlement first so roads connect to it
    const vertexId = state.board.graph.vertices.keys().next().value as string;
    const vertex = state.board.graph.vertices.get(vertexId)!;
    const [edgeId1, edgeId2] = vertex.adjacentEdges;

    const stateWithSettlement: GameState = {
      ...state,
      board: {
        ...state.board,
        buildings: { [vertexId]: { type: 'settlement', playerId: 'p1' } },
      },
    };

    const newState = handlePlayRoadBuilding(
      stateWithSettlement,
      makeAction('PLAY_ROAD_BUILDING', 'p1', { edgeId1, edgeId2 })
    );

    expect(newState.board.roads[edgeId1]).toEqual({ playerId: 'p1' });
    expect(newState.board.roads[edgeId2]).toEqual({ playerId: 'p1' });
    expect(newState.players[0].roads).toBe(13); // 15 - 2
  });
});

describe('PLAY_YEAR_OF_PLENTY', () => {
  it('gives 2 resources of choice', () => {
    const base = playingState(make2PlayerState());
    const state = giveCard(base, 'p1', 'yearOfPlenty', 0);

    const newState = handlePlayYearOfPlenty(
      state,
      makeAction('PLAY_YEAR_OF_PLENTY', 'p1', { resource1: 'wood', resource2: 'ore' })
    );

    expect(newState.players[0].resources.wood).toBe(1);
    expect(newState.players[0].resources.ore).toBe(1);
  });
});

describe('PLAY_MONOPOLY', () => {
  it('steals all of resource from other players', () => {
    const base = playingState(make2PlayerState());
    let state = giveCard(base, 'p1', 'monopoly', 0);
    state = {
      ...state,
      players: state.players.map(p =>
        p.id === 'p2' ? { ...p, resources: { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
      ),
    };

    const newState = handlePlayMonopoly(
      state,
      makeAction('PLAY_MONOPOLY', 'p1', { resource: 'wood' })
    );

    expect(newState.players[0].resources.wood).toBe(3);
    expect(newState.players[1].resources.wood).toBe(0);
  });
});

describe('One dev card per turn', () => {
  it('cannot play 2 dev cards in same turn', () => {
    const base = playingState(make2PlayerState());
    let state = giveCard(base, 'p1', 'yearOfPlenty', 0);
    state = giveCard(state, 'p1', 'yearOfPlenty', 0);

    // Play first card
    const afterFirst = handlePlayYearOfPlenty(
      state,
      makeAction('PLAY_YEAR_OF_PLENTY', 'p1', { resource1: 'wood', resource2: 'wood' })
    );
    expect(afterFirst.players[0].resources.wood).toBe(2);

    // Try to play second card — should be blocked
    const afterSecond = handlePlayYearOfPlenty(
      afterFirst,
      makeAction('PLAY_YEAR_OF_PLENTY', 'p1', { resource1: 'ore', resource2: 'ore' })
    );
    expect(afterSecond.players[0].resources.ore).toBe(0); // not gained
  });
});

describe('VP cards', () => {
  it('victory point cards are not played (counted automatically)', () => {
    const base = playingState(make2PlayerState());
    const state = giveCard(base, 'p1', 'victoryPoint', 0);
    // VP cards don't have a play action — they just sit in hand
    // They should never have playedThisTurn = true from a play action
    expect(state.players[0].developmentCards[0].type).toBe('victoryPoint');
    expect(state.players[0].developmentCards[0].playedThisTurn).toBe(false);
  });
});
