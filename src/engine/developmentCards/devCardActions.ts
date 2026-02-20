import type { GameState } from '../../state/gameState';
import type { GameAction } from '../../state/gameState';
import type { HexCoord } from '../board/hexGrid';
import type { EdgeId } from '../board/boardTypes';
import type { ResourceType } from '../../state/playerState';
import { canPlaceRoad } from '../rules/placementRules';
import { addResources } from '../resources/resourceDistribution';
import { handleMoveRobber, handleStealResource } from '../robber/robberActions';

function hasPlayedDevCard(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  return player.developmentCards.some(c => c.playedThisTurn);
}

function markCardPlayed(state: GameState, playerId: string, cardType: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  let marked = false;
  const updatedCards = player.developmentCards.map(c => {
    if (!marked && c.type === cardType && !c.playedThisTurn && c.turnBought !== state.currentTurn) {
      marked = true;
      return { ...c, playedThisTurn: true };
    }
    return c;
  });
  if (!marked) return state; // no eligible card found

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, developmentCards: updatedCards } : p
  );
  return { ...state, players: updatedPlayers };
}

function checkLargestArmy(state: GameState): GameState {
  let newState = state;
  const currentHolder = state.players.find(p => p.hasLargestArmy);
  const currentSize = currentHolder?.knightsPlayed ?? 0;
  const threshold = Math.max(3, currentSize + (currentHolder ? 1 : 0));

  for (let i = 0; i < newState.players.length; i++) {
    const player = newState.players[i];
    if (!player.hasLargestArmy && player.knightsPlayed >= 3 && player.knightsPlayed >= threshold) {
      // Transfer largest army
      const updatedPlayers = newState.players.map((p, idx) => {
        if (p.hasLargestArmy) return { ...p, hasLargestArmy: false };
        if (idx === i) return { ...p, hasLargestArmy: true };
        return p;
      });
      newState = {
        ...newState,
        players: updatedPlayers,
        largestArmySize: player.knightsPlayed,
      };
      break;
    }
  }
  return newState;
}

export function handlePlayKnight(state: GameState, action: GameAction): GameState {
  if (hasPlayedDevCard(state, action.playerId)) return state;

  const { hexCoord, targetPlayerId } = action.payload as {
    hexCoord?: HexCoord;
    targetPlayerId?: string;
  };
  if (!hexCoord) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const eligible = player.developmentCards.find(
    c => c.type === 'knight' && !c.playedThisTurn && c.turnBought !== state.currentTurn
  );
  if (!eligible) return state;

  // Mark card played
  let newState = markCardPlayed(state, action.playerId, 'knight');

  // Increment knights played
  const updatedPlayer = { ...newState.players[playerIndex], knightsPlayed: newState.players[playerIndex].knightsPlayed + 1 };
  newState = { ...newState, players: newState.players.map((p, i) => i === playerIndex ? updatedPlayer : p) };

  // Check largest army
  newState = checkLargestArmy(newState);

  // Move robber (treat as if in robber phase temporarily)
  const savedPhase = newState.turnPhase;
  newState = { ...newState, turnPhase: 'robber' };
  newState = handleMoveRobber(newState, { ...action, payload: { hexCoord } });

  // If a target is given and we're now in stealing phase, steal
  if (targetPlayerId && newState.turnPhase === 'stealing') {
    newState = handleStealResource(newState, { ...action, payload: { targetPlayerId } });
  } else if (newState.turnPhase === 'robber') {
    // Invalid robber move should not strand turn in robber phase.
    newState = { ...newState, turnPhase: savedPhase };
  }

  return newState;
}

export function handlePlayRoadBuilding(state: GameState, action: GameAction): GameState {
  if (hasPlayedDevCard(state, action.playerId)) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  const eligible = player.developmentCards.find(
    c => c.type === 'roadBuilding' && !c.playedThisTurn && c.turnBought !== state.currentTurn
  );
  if (!eligible) return state;

  let newState = markCardPlayed(state, action.playerId, 'roadBuilding');

  const { edgeId1, edgeId2 } = action.payload as { edgeId1: EdgeId; edgeId2: EdgeId };

  // Place first road
  if (canPlaceRoad(newState.board, edgeId1, action.playerId, false)) {
    const pi = newState.players.findIndex(p => p.id === action.playerId);
    const p = newState.players[pi];
    const updatedPlayer = { ...p, roads: p.roads - 1 };
    newState = {
      ...newState,
      players: newState.players.map((pl, i) => i === pi ? updatedPlayer : pl),
      board: {
        ...newState.board,
        roads: { ...newState.board.roads, [edgeId1]: { playerId: action.playerId } },
      },
    };
  }

  // Place second road
  if (canPlaceRoad(newState.board, edgeId2, action.playerId, false)) {
    const pi = newState.players.findIndex(p => p.id === action.playerId);
    const p = newState.players[pi];
    const updatedPlayer = { ...p, roads: p.roads - 1 };
    newState = {
      ...newState,
      players: newState.players.map((pl, i) => i === pi ? updatedPlayer : pl),
      board: {
        ...newState.board,
        roads: { ...newState.board.roads, [edgeId2]: { playerId: action.playerId } },
      },
    };
  }

  return newState;
}

export function handlePlayYearOfPlenty(state: GameState, action: GameAction): GameState {
  if (hasPlayedDevCard(state, action.playerId)) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  const eligible = player.developmentCards.find(
    c => c.type === 'yearOfPlenty' && !c.playedThisTurn && c.turnBought !== state.currentTurn
  );
  if (!eligible) return state;

  let newState = markCardPlayed(state, action.playerId, 'yearOfPlenty');

  const { resource1, resource2 } = action.payload as { resource1: ResourceType; resource2: ResourceType };
  const pi = newState.players.findIndex(p => p.id === action.playerId);
  const gains: Partial<Record<ResourceType, number>> = {};
  gains[resource1] = (gains[resource1] ?? 0) + 1;
  gains[resource2] = (gains[resource2] ?? 0) + 1;
  const updated = addResources(newState.players[pi], gains);
  newState = {
    ...newState,
    players: newState.players.map((p, i) => i === pi ? updated : p),
  };

  return newState;
}

export function handlePlayMonopoly(state: GameState, action: GameAction): GameState {
  if (hasPlayedDevCard(state, action.playerId)) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  const eligible = player.developmentCards.find(
    c => c.type === 'monopoly' && !c.playedThisTurn && c.turnBought !== state.currentTurn
  );
  if (!eligible) return state;

  let newState = markCardPlayed(state, action.playerId, 'monopoly');

  const { resource } = action.payload as { resource: ResourceType };

  // Steal all of that resource from every other player
  let totalStolen = 0;
  const updatedPlayers = newState.players.map(p => {
    if (p.id === action.playerId) return p;
    const amount = p.resources[resource] ?? 0;
    totalStolen += amount;
    return { ...p, resources: { ...p.resources, [resource]: 0 } };
  });

  newState = { ...newState, players: updatedPlayers };
  const pi = newState.players.findIndex(p => p.id === action.playerId);
  const updated = addResources(newState.players[pi], { [resource]: totalStolen });
  newState = {
    ...newState,
    players: newState.players.map((p, i) => i === pi ? updated : p),
  };

  return newState;
}
