import type { GameState } from '../../state/gameState';
import { grantProgressCardReward } from './progressCardActions';
import { getMetropolisProtectedVertices, updateMetropolises } from './ckMeta';

function getCityStrength(state: GameState): number {
  return Object.values(state.board.buildings).filter(building => building.type === 'city').length;
}

function getKnightContributions(state: GameState): Record<string, number> {
  const contributions: Record<string, number> = {};
  for (const player of state.players) {
    contributions[player.id] = 0;
  }
  for (const knight of Object.values(state.board.knights)) {
    if (knight.active) {
      contributions[knight.ownerId] = (contributions[knight.ownerId] ?? 0) + knight.level;
    }
  }
  return contributions;
}

function deactivateAllKnights(state: GameState): GameState {
  const updatedKnights = Object.fromEntries(
    Object.entries(state.board.knights).map(([knightId, knight]) => [
      knightId,
      { ...knight, active: false, hasActedThisTurn: false },
    ])
  );
  return {
    ...state,
    board: {
      ...state.board,
      knights: updatedKnights,
    },
  };
}

function downgradeCity(state: GameState, playerId: string): { state: GameState; downgradedVertexId: string | null } {
  const protectedVertices = getMetropolisProtectedVertices(state);
  const candidateVertices = Object.entries(state.board.buildings)
    .filter(([vertexId, building]) =>
      building.playerId === playerId
      && building.type === 'city'
      && !protectedVertices.has(vertexId)
    )
    .map(([vertexId]) => vertexId)
    .sort();

  const targetVertexId = candidateVertices[0];
  if (!targetVertexId) return { state, downgradedVertexId: null };

  const playerIndex = state.players.findIndex(player => player.id === playerId);
  if (playerIndex === -1) return { state, downgradedVertexId: null };

  const updatedPlayers = state.players.map((p, idx) => (
    idx === playerIndex
      ? {
        ...p,
        cities: p.cities + 1,
        settlements: Math.max(0, p.settlements - 1),
      }
      : p
  ));

  const updatedBoard = {
    ...state.board,
    buildings: {
      ...state.board.buildings,
      [targetVertexId]: { type: 'settlement' as const, playerId },
    },
    cityWalls: Object.fromEntries(
      Object.entries(state.board.cityWalls).filter(([vertexId]) => vertexId !== targetVertexId)
    ),
  };

  return {
    state: {
      ...state,
      players: updatedPlayers,
      board: updatedBoard,
    },
    downgradedVertexId: targetVertexId,
  };
}

function resolveBarbarianAttack(state: GameState): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;

  const cityStrength = getCityStrength(state);
  const contributions = getKnightContributions(state);
  const defenseStrength = Object.values(contributions).reduce((sum, value) => sum + value, 0);

  let nextState = deactivateAllKnights(state);
  const citiesDowngraded: Array<{ playerId: string; vertexId: string }> = [];
  const losers: string[] = [];
  const rewarded: string[] = [];

  if (defenseStrength < cityStrength) {
    const playersWithCities = state.players
      .filter(player =>
        Object.values(state.board.buildings).some(building => building.playerId === player.id && building.type === 'city')
      )
      .map(player => player.id);
    const minimum = Math.min(...playersWithCities.map(playerId => contributions[playerId] ?? 0));
    const doomedPlayers = playersWithCities
      .filter(playerId => (contributions[playerId] ?? 0) === minimum)
      .sort();

    for (const playerId of doomedPlayers) {
      const downgraded = downgradeCity(nextState, playerId);
      nextState = downgraded.state;
      if (downgraded.downgradedVertexId) {
        losers.push(playerId);
        citiesDowngraded.push({ playerId, vertexId: downgraded.downgradedVertexId });
      }
    }
  } else if (defenseStrength > 0) {
    const maximum = Math.max(...Object.values(contributions));
    const winners = state.players
      .filter(player => (contributions[player.id] ?? 0) === maximum && maximum > 0)
      .map(player => player.id)
      .sort();
    for (const winnerId of winners) {
      const before = nextState.ck!.progressHands[winnerId]?.length ?? 0;
      nextState = grantProgressCardReward(nextState, winnerId);
      const after = nextState.ck!.progressHands[winnerId]?.length ?? 0;
      if (after > before) rewarded.push(winnerId);
    }
  }

  nextState = updateMetropolises(nextState);
  return {
    ...nextState,
    ck: {
      ...nextState.ck!,
      barbarians: {
        ...nextState.ck!.barbarians,
        position: 0,
      },
      pending: { type: 'NONE', payload: null },
      lastBarbarianAttack: {
        cityStrength,
        defenseStrength,
        contributions,
        losers,
        rewarded,
        citiesDowngraded,
      },
    },
  };
}

export function advanceBarbariansAfterRoll(state: GameState): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;

  const nextPosition = state.ck.barbarians.position + 1;
  const advancedState: GameState = {
    ...state,
    ck: {
      ...state.ck,
      barbarians: {
        ...state.ck.barbarians,
        position: nextPosition,
      },
      pending: { type: 'NONE', payload: null },
    },
  };

  if (nextPosition < state.ck.barbarians.stepsToAttack) return advancedState;

  const withPending: GameState = {
    ...advancedState,
    ck: {
      ...advancedState.ck!,
      pending: { type: 'BARBARIAN_ATTACK' as const, payload: { position: nextPosition } },
    },
  };
  return resolveBarbarianAttack(withPending);
}
