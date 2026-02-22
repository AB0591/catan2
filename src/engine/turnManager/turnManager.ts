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
import {
  handleMoveRobber,
  handleStealResource,
  handleDiscardResources,
  getPlayersWhoMustDiscard,
} from '../robber/robberActions';
import {
  handlePlayKnight,
  handlePlayRoadBuilding,
  handlePlayYearOfPlenty,
  handlePlayMonopoly,
} from '../developmentCards/devCardActions';
import { handleImproveCity } from '../citiesAndKnights/improvementActions';
import {
  handleBuildKnight,
  handleActivateKnight,
  handleMoveKnight,
  handlePromoteKnight,
  handleDriveAwayRobber,
  resetKnightActionsForPlayer,
} from '../citiesAndKnights/knightActions';
import { handleBuildCityWall } from '../citiesAndKnights/cityWallActions';
import { handlePlayProgressCard } from '../citiesAndKnights/progressCardActions';
import { advanceBarbariansAfterRoll } from '../citiesAndKnights/barbarianActions';
import { updateMetropolises } from '../citiesAndKnights/ckMeta';
import { updateVictoryState } from '../victory/victoryEngine';
import { handleTradeBank, handleTradePlayer } from '../trading/tradingActions';

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
        const mustDiscard = getPlayersWhoMustDiscard({ ...newState, lastDiceRoll: diceRoll });
        if (mustDiscard.length > 0) {
          newState = { ...newState, lastDiceRoll: diceRoll, turnPhase: 'discarding', pendingDiscards: mustDiscard };
        } else {
          newState = { ...newState, lastDiceRoll: diceRoll, turnPhase: 'robber', pendingDiscards: [] };
        }
      } else {
        newState = { ...newState, lastDiceRoll: diceRoll, turnPhase: 'postRoll' };
        newState = distributeResources(newState, total);
      }
      newState = advanceBarbariansAfterRoll(newState);
      break;
    }

    case 'END_TURN': {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const endingPlayerId = state.players[state.currentPlayerIndex]?.id;
      // Reset playedThisTurn on all dev cards
      const resetPlayers = state.players.map(p => ({
        ...p,
        developmentCards: p.developmentCards.map(c => ({ ...c, playedThisTurn: false })),
      }));
      const board = endingPlayerId ? resetKnightActionsForPlayer(state.board, endingPlayerId) : state.board;
      newState = {
        ...newState,
        players: resetPlayers,
        board,
        currentPlayerIndex: nextIndex,
        turnPhase: 'preRoll',
        lastDiceRoll: null,
        lastDistribution: null,
        lastSteal: null,
        aiMessage: null,
        currentTurn: state.currentTurn + 1,
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

    case 'MOVE_ROBBER': {
      newState = handleMoveRobber(newState, action);
      break;
    }

    case 'STEAL_RESOURCE': {
      newState = handleStealResource(newState, action);
      break;
    }

    case 'DISCARD_RESOURCES': {
      newState = handleDiscardResources(newState, action);
      break;
    }

    case 'PLAY_KNIGHT': {
      newState = handlePlayKnight(newState, action);
      break;
    }

    case 'PLAY_ROAD_BUILDING': {
      newState = handlePlayRoadBuilding(newState, action);
      break;
    }

    case 'PLAY_YEAR_OF_PLENTY': {
      newState = handlePlayYearOfPlenty(newState, action);
      break;
    }

    case 'PLAY_MONOPOLY': {
      newState = handlePlayMonopoly(newState, action);
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

    case 'TRADE_BANK':
    case 'TRADE_PORT': {
      newState = handleTradeBank(newState, action);
      break;
    }

    case 'TRADE_PLAYER': {
      newState = handleTradePlayer(newState, action);
      break;
    }

    case 'CK_IMPROVE_CITY': {
      newState = handleImproveCity(newState, action);
      break;
    }

    case 'CK_BUILD_KNIGHT': {
      newState = handleBuildKnight(newState, action);
      break;
    }

    case 'CK_ACTIVATE_KNIGHT': {
      newState = handleActivateKnight(newState, action);
      break;
    }

    case 'CK_MOVE_KNIGHT': {
      newState = handleMoveKnight(newState, action);
      break;
    }

    case 'CK_PROMOTE_KNIGHT': {
      newState = handlePromoteKnight(newState, action);
      break;
    }

    case 'CK_DRIVE_AWAY_ROBBER': {
      newState = handleDriveAwayRobber(newState, action);
      break;
    }

    case 'CK_BUILD_CITY_WALL': {
      newState = handleBuildCityWall(newState, action);
      break;
    }

    case 'CK_PLAY_PROGRESS_CARD': {
      newState = handlePlayProgressCard(newState, action);
      break;
    }

    default:
      break;
  }

  newState = updateMetropolises(newState);

  // Update victory state after any action that could affect VP
  if (newState.phase === 'playing' || newState.phase === 'finished') {
    newState = updateVictoryState(newState);
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
