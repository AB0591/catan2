import type { GameState } from '../../state/gameState';
import type { GameAction } from '../../state/gameState';
import type { VertexId, EdgeId } from '../board/boardTypes';
import { canPlaceSettlement, canPlaceRoad } from '../rules/placementRules';
import { distributeResources } from '../resources/resourceDistribution';
import {
  handleBuildSettlement,
  handleBuildRoad,
  handleBuildCity,
  handleBuyDevelopmentCard,
} from '../actions/buildActions';

export function appendAction(state: GameState, action: GameAction): GameState {
  return { ...state, actionLog: [...state.actionLog, action] };
}

export function dispatchAction(action: GameAction, state: GameState): GameState {
  let newState = appendAction(state, action);

  switch (action.type) {
    case 'ROLL_DICE': {
      const { die1, die2 } = action.payload as { die1: number; die2: number };
      const total = die1 + die2;
      const diceRoll = { die1, die2, total };

      if (total === 7) {
        newState = { ...newState, lastDiceRoll: diceRoll, turnPhase: 'robber' };
      } else {
        newState = { ...newState, lastDiceRoll: diceRoll, turnPhase: 'postRoll' };
        newState = distributeResources(newState, total);
      }
      break;
    }

    case 'END_TURN': {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      newState = {
        ...newState,
        currentPlayerIndex: nextIndex,
        turnPhase: 'preRoll',
        lastDiceRoll: null,
      };
      break;
    }

    case 'PLACE_SETTLEMENT': {
      if (state.phase !== 'setup') break;
      const { vertexId } = action.payload as { vertexId: VertexId };

      if (!canPlaceSettlement(state.board, vertexId, action.playerId, true)) break;

      const playerIndex = state.players.findIndex(p => p.id === action.playerId);
      if (playerIndex === -1) break;

      const player = state.players[playerIndex];
      const updatedPlayer = { ...player, settlements: player.settlements - 1 };
      const updatedPlayers = state.players.map((p, i) => i === playerIndex ? updatedPlayer : p);

      const updatedBoard = {
        ...state.board,
        buildings: {
          ...state.board.buildings,
          [vertexId]: { type: 'settlement' as const, playerId: action.playerId },
        },
      };

      newState = { ...newState, players: updatedPlayers, board: updatedBoard };
      break;
    }

    case 'PLACE_ROAD': {
      if (state.phase !== 'setup') break;
      const { edgeId, lastPlacedSettlementVertexId } = action.payload as {
        edgeId: EdgeId;
        lastPlacedSettlementVertexId?: VertexId;
      };

      if (!canPlaceRoad(state.board, edgeId, action.playerId, true, lastPlacedSettlementVertexId)) break;

      const playerIndex = state.players.findIndex(p => p.id === action.playerId);
      if (playerIndex === -1) break;

      const player = state.players[playerIndex];
      const updatedPlayer = { ...player, roads: player.roads - 1 };
      const updatedPlayers = state.players.map((p, i) => i === playerIndex ? updatedPlayer : p);

      const updatedBoard = {
        ...state.board,
        roads: {
          ...state.board.roads,
          [edgeId]: { playerId: action.playerId },
        },
      };

      newState = { ...newState, players: updatedPlayers, board: updatedBoard };
      newState = advanceSetupOrder(newState);
      break;
    }

    case 'BUILD_SETTLEMENT': {
      newState = handleBuildSettlement(newState, action);
      break;
    }

    case 'BUILD_ROAD': {
      newState = handleBuildRoad(newState, action);
      break;
    }

    case 'BUILD_CITY': {
      newState = handleBuildCity(newState, action);
      break;
    }

    case 'BUY_DEVELOPMENT_CARD': {
      newState = handleBuyDevelopmentCard(newState, action);
      break;
    }

    default:
      break;
  }

  return newState;
}

/**
 * After each road placement during setup, advance the setup order.
 * Each "turn" in setup = place settlement + place road.
 * Track via setupOrderIndex. Once all placements done, switch to 'playing'.
 */
function advanceSetupOrder(state: GameState): GameState {
  const nextSetupOrderIndex = state.setupOrderIndex + 1;

  if (nextSetupOrderIndex >= state.setupPlayerOrder.length) {
    // All setup placements done — transition to playing
    return {
      ...state,
      phase: 'playing',
      turnPhase: 'preRoll',
      setupOrderIndex: nextSetupOrderIndex,
      currentPlayerIndex: 0,
    };
  }

  const nextPlayerIndex = state.setupPlayerOrder[nextSetupOrderIndex];
  return {
    ...state,
    setupOrderIndex: nextSetupOrderIndex,
    currentPlayerIndex: nextPlayerIndex,
  };
}
