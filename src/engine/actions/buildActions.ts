import type { GameState } from '../../state/gameState';
import type { GameAction } from '../../state/gameState';
import type { VertexId, EdgeId } from '../board/boardTypes';
import { canPlaceSettlement, canPlaceRoad, canPlaceCity } from '../rules/placementRules';
import { hasResources, removeResources } from '../resources/resourceDistribution';
import type { ResourceCards } from '../../state/playerState';

const SETTLEMENT_COST: Partial<ResourceCards> = { brick: 1, wood: 1, sheep: 1, wheat: 1 };
const ROAD_COST: Partial<ResourceCards> = { brick: 1, wood: 1 };
const CITY_COST: Partial<ResourceCards> = { ore: 3, wheat: 2 };
const DEV_CARD_COST: Partial<ResourceCards> = { ore: 1, wheat: 1, sheep: 1 };

export function handleBuildSettlement(state: GameState, action: GameAction): GameState {
  const { vertexId } = action.payload as { vertexId: VertexId };
  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  if (!hasResources(player, SETTLEMENT_COST)) return state;
  if (!canPlaceSettlement(state.board, vertexId, action.playerId, false)) return state;

  const updatedPlayer = removeResources(player, SETTLEMENT_COST)!;
  const withBuilding = { ...updatedPlayer, settlements: updatedPlayer.settlements - 1 };
  const updatedPlayers = state.players.map((p, i) => i === playerIndex ? withBuilding : p);
  const updatedBoard = {
    ...state.board,
    buildings: {
      ...state.board.buildings,
      [vertexId]: { type: 'settlement' as const, playerId: action.playerId },
    },
  };

  return { ...state, players: updatedPlayers, board: updatedBoard };
}

export function handleBuildRoad(state: GameState, action: GameAction): GameState {
  const { edgeId } = action.payload as { edgeId: EdgeId };
  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  if (!hasResources(player, ROAD_COST)) return state;
  if (!canPlaceRoad(state.board, edgeId, action.playerId, false)) return state;

  const updatedPlayer = removeResources(player, ROAD_COST)!;
  const withRoad = { ...updatedPlayer, roads: updatedPlayer.roads - 1 };
  const updatedPlayers = state.players.map((p, i) => i === playerIndex ? withRoad : p);
  const updatedBoard = {
    ...state.board,
    roads: { ...state.board.roads, [edgeId]: { playerId: action.playerId } },
  };

  return { ...state, players: updatedPlayers, board: updatedBoard };
}

export function handleBuildCity(state: GameState, action: GameAction): GameState {
  const { vertexId } = action.payload as { vertexId: VertexId };
  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  if (!hasResources(player, CITY_COST)) return state;
  if (!canPlaceCity(state.board, vertexId, action.playerId)) return state;

  const updatedPlayer = removeResources(player, CITY_COST)!;
  // settlements +1 (returned), cities -1 (placed)
  const withCity = {
    ...updatedPlayer,
    settlements: updatedPlayer.settlements + 1,
    cities: updatedPlayer.cities - 1,
  };
  const updatedPlayers = state.players.map((p, i) => i === playerIndex ? withCity : p);
  const updatedBoard = {
    ...state.board,
    buildings: {
      ...state.board.buildings,
      [vertexId]: { type: 'city' as const, playerId: action.playerId },
    },
  };

  return { ...state, players: updatedPlayers, board: updatedBoard };
}

export function handleBuyDevelopmentCard(state: GameState, action: GameAction): GameState {
  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  if (!hasResources(player, DEV_CARD_COST)) return state;
  if (state.devCardDeck.length === 0) return state;

  const updatedPlayer = removeResources(player, DEV_CARD_COST)!;
  const [cardType, ...remainingDeck] = state.devCardDeck;
  const newCard = { type: cardType, playedThisTurn: false, turnBought: state.currentTurn };
  const withCard = {
    ...updatedPlayer,
    developmentCards: [...updatedPlayer.developmentCards, newCard],
  };
  const updatedPlayers = state.players.map((p, i) => i === playerIndex ? withCard : p);

  return { ...state, players: updatedPlayers, devCardDeck: remainingDeck };
}
