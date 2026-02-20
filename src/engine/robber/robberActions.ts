import type { GameState } from '../../state/gameState';
import type { GameAction } from '../../state/gameState';
import type { PlayerState, ResourceType } from '../../state/playerState';
import type { HexCoord } from '../board/hexGrid';
import { totalResources, removeResources, addResources } from '../resources/resourceDistribution';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getPlayersWhoMustDiscard(state: GameState): string[] {
  return state.players
    .filter(p => totalResources(p) > 7)
    .map(p => p.id);
}

export function requiredDiscardCount(player: PlayerState): number {
  return Math.floor(totalResources(player) / 2);
}

/** Get playerIds with a building adjacent to the given hex (excluding current player) */
export function getStealTargets(state: GameState, currentPlayerId: string): string[] {
  return getAdjacentOpponents(state, state.board.robberHex, currentPlayerId);
}

function getAdjacentOpponents(state: GameState, hexCoord: HexCoord, currentPlayerId: string): string[] {
  const opponents = new Set<string>();
  for (const [vertexId, vertex] of state.board.graph.vertices) {
    const isAdjacentToHex = vertex.adjacentHexes.some(h => h.q === hexCoord.q && h.r === hexCoord.r);
    if (!isAdjacentToHex) continue;
    const building = state.board.buildings[vertexId];
    if (building && building.playerId !== currentPlayerId) {
      opponents.add(building.playerId);
    }
  }
  return Array.from(opponents);
}

export function handleMoveRobber(state: GameState, action: GameAction): GameState {
  if (state.turnPhase !== 'robber') return state;

  const { hexCoord } = action.payload as { hexCoord: HexCoord };
  const robber = state.board.robberHex;

  // Must move to a different hex
  if (hexCoord.q === robber.q && hexCoord.r === robber.r) return state;

  const updatedBoard = { ...state.board, robberHex: hexCoord };
  let newState = { ...state, board: updatedBoard };

  const opponents = getAdjacentOpponents(newState, hexCoord, action.playerId);
  if (opponents.length > 0) {
    newState = { ...newState, turnPhase: 'stealing' };
  } else {
    newState = { ...newState, turnPhase: 'postRoll' };
  }

  return newState;
}

export function handleStealResource(state: GameState, action: GameAction): GameState {
  if (state.turnPhase !== 'stealing') return state;

  const { targetPlayerId } = action.payload as { targetPlayerId: string };

  const currentPlayerIndex = state.players.findIndex(p => p.id === action.playerId);
  const targetPlayerIndex = state.players.findIndex(p => p.id === targetPlayerId);
  if (currentPlayerIndex === -1 || targetPlayerIndex === -1) return state;

  // Validate target has building adjacent to robber
  const adjacentOpponents = getAdjacentOpponents(state, state.board.robberHex, action.playerId);
  if (!adjacentOpponents.includes(targetPlayerId)) return state;

  const targetPlayer = state.players[targetPlayerIndex];
  const total = totalResources(targetPlayer);
  if (total === 0) {
    // No resources to steal, just move to postRoll
    return { ...state, turnPhase: 'postRoll' };
  }

  // Pick a random resource using seeded RNG
  const rng = mulberry32(state.seed + state.actionLog.length);
  const resourceList: ResourceType[] = [];
  for (const [res, count] of Object.entries(targetPlayer.resources)) {
    for (let i = 0; i < count; i++) {
      resourceList.push(res as ResourceType);
    }
  }

  const chosenIndex = Math.floor(rng() * resourceList.length);
  const stolenResource = resourceList[chosenIndex];

  const updatedTarget = removeResources(targetPlayer, { [stolenResource]: 1 })!;
  const updatedCurrent = addResources(state.players[currentPlayerIndex], { [stolenResource]: 1 });

  const updatedPlayers = state.players.map((p, i) => {
    if (i === currentPlayerIndex) return updatedCurrent;
    if (i === targetPlayerIndex) return updatedTarget;
    return p;
  });

  return { ...state, players: updatedPlayers, turnPhase: 'postRoll' };
}

export function handleDiscardResources(state: GameState, action: GameAction): GameState {
  if (state.turnPhase !== 'discarding') return state;

  const { resources } = action.payload as { resources: Partial<Record<ResourceType, number>> };
  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;

  // Must be in pendingDiscards
  if (!state.pendingDiscards.includes(action.playerId)) return state;

  const player = state.players[playerIndex];
  const required = requiredDiscardCount(player);
  const provided = Object.values(resources).reduce((s, n) => s + (n ?? 0), 0);
  if (provided !== required) return state;

  const updatedPlayer = removeResources(player, resources);
  if (!updatedPlayer) return state;

  const updatedPlayers = state.players.map((p, i) => i === playerIndex ? updatedPlayer : p);
  const remaining = state.pendingDiscards.filter(id => id !== action.playerId);

  let newState = { ...state, players: updatedPlayers, pendingDiscards: remaining };

  // If no more discards needed, move to robber phase
  if (remaining.length === 0) {
    newState = { ...newState, turnPhase: 'robber' };
  }

  return newState;
}
