import type { GameState, ProgressDeckType } from '../../state/gameState';
import type { VertexId } from '../board/boardTypes';

const TRACKS: ProgressDeckType[] = ['politics', 'science', 'trade'];

function getPlayerCityVertices(state: GameState, playerId: string): VertexId[] {
  return Object.entries(state.board.buildings)
    .filter(([, b]) => b.playerId === playerId && b.type === 'city')
    .map(([vertexId]) => vertexId)
    .sort();
}

function getUsedMetropolisVertices(
  metropolises: NonNullable<GameState['ck']>['metropolises']
): Set<VertexId> {
  const used = new Set<VertexId>();
  for (const track of TRACKS) {
    const cityVertexId = metropolises[track].cityVertexId;
    if (cityVertexId) used.add(cityVertexId);
  }
  return used;
}

export function getMetropolisProtectedVertices(state: GameState): Set<VertexId> {
  const protectedVertices = new Set<VertexId>();
  if (!state.ck) return protectedVertices;
  for (const track of TRACKS) {
    const cityVertexId = state.ck.metropolises[track].cityVertexId;
    if (cityVertexId) protectedVertices.add(cityVertexId);
  }
  return protectedVertices;
}

export function updateMetropolises(state: GameState): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;

  const updatedMetropolises = {
    politics: { ...state.ck.metropolises.politics },
    science: { ...state.ck.metropolises.science },
    trade: { ...state.ck.metropolises.trade },
  };

  for (const track of TRACKS) {
    const current = updatedMetropolises[track];
    const levels = state.players.map(player => ({
      playerId: player.id,
      level: player.cityImprovements[track],
    }));
    const maxLevel = Math.max(...levels.map(item => item.level));

    if (maxLevel < 4) {
      updatedMetropolises[track] = { playerId: null, cityVertexId: null };
      continue;
    }

    const contenders = levels.filter(item => item.level === maxLevel).map(item => item.playerId);
    if (contenders.length > 1) {
      const canKeepCurrent = Boolean(current.playerId && contenders.includes(current.playerId));
      if (!canKeepCurrent) {
        updatedMetropolises[track] = { playerId: null, cityVertexId: null };
      } else {
        const currentPlayerCities = current.playerId ? getPlayerCityVertices(state, current.playerId) : [];
        if (!current.cityVertexId || !currentPlayerCities.includes(current.cityVertexId)) {
          updatedMetropolises[track] = { playerId: null, cityVertexId: null };
        }
      }
      continue;
    }

    const winnerId = contenders[0];
    const winnerCities = getPlayerCityVertices(state, winnerId);
    if (winnerCities.length === 0) {
      updatedMetropolises[track] = { playerId: null, cityVertexId: null };
      continue;
    }

    let cityVertexId = current.cityVertexId;
    const currentValid = current.playerId === winnerId && cityVertexId && winnerCities.includes(cityVertexId);
    if (!currentValid) {
      const used = getUsedMetropolisVertices(updatedMetropolises);
      const existingForTrack = updatedMetropolises[track].cityVertexId;
      if (existingForTrack) used.delete(existingForTrack);
      cityVertexId = winnerCities.find(vertexId => !used.has(vertexId)) ?? winnerCities[0];
    }

    updatedMetropolises[track] = { playerId: winnerId, cityVertexId: cityVertexId ?? null };
  }

  return {
    ...state,
    ck: {
      ...state.ck,
      metropolises: updatedMetropolises,
    },
  };
}

export function metropolisPointsForPlayer(state: GameState, playerId: string): number {
  if (!state.ck) return 0;
  let count = 0;
  for (const track of TRACKS) {
    if (state.ck.metropolises[track].playerId === playerId) count += 1;
  }
  return count * 2;
}
