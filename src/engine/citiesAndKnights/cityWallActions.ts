import type { GameAction, GameState } from '../../state/gameState';
import { hasResources, removeResources } from '../resources/resourceDistribution';

const CITY_WALL_COST = { brick: 2 } as const;
const MAX_CITY_WALLS_PER_PLAYER = 3;

export function countPlayerCityWalls(state: GameState, playerId: string): number {
  return Object.values(state.board.cityWalls).filter(ownerId => ownerId === playerId).length;
}

export function getCityWallDiscardThreshold(state: GameState, playerId: string): number {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return 7;
  const walls = countPlayerCityWalls(state, playerId);
  return 7 + walls * 2;
}

export function getValidCityWallVertices(state: GameState, playerId: string): string[] {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return [];
  if (countPlayerCityWalls(state, playerId) >= MAX_CITY_WALLS_PER_PLAYER) return [];
  return Object.entries(state.board.buildings)
    .filter(([vertexId, building]) =>
      building.playerId === playerId
      && building.type === 'city'
      && !state.board.cityWalls[vertexId]
    )
    .map(([vertexId]) => vertexId)
    .sort();
}

export function handleBuildCityWall(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const { cityVertexId } = action.payload as { cityVertexId?: string };
  if (!cityVertexId) return state;
  if (!getValidCityWallVertices(state, action.playerId).includes(cityVertexId)) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];
  if (!hasResources(player, CITY_WALL_COST)) return state;

  const updatedPlayer = removeResources(player, CITY_WALL_COST);
  if (!updatedPlayer) return state;

  const updatedPlayers = state.players.map((p, idx) => (idx === playerIndex ? updatedPlayer : p));
  return {
    ...state,
    players: updatedPlayers,
    board: {
      ...state.board,
      cityWalls: {
        ...state.board.cityWalls,
        [cityVertexId]: action.playerId,
      },
    },
  };
}

