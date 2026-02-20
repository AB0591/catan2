import type { GameState, GameAction } from '../../state/gameState';
import type { ResourceType } from '../../state/playerState';
import type { VertexId, EdgeId } from '../board/boardTypes';
import type { HexCoord } from '../board/hexGrid';
import {
  getValidSettlementPlacements,
  getValidRoadPlacements,
  canPlaceCity,
} from '../rules/placementRules';
import { calculateVictoryPoints } from '../../state/playerState';
import { hexesInRange } from '../board/hexGrid';
import { totalResources } from '../resources/resourceDistribution';
import { requiredDiscardCount } from '../robber/robberActions';

// Number token probability weights (dots on Catan chit = probability)
const TOKEN_WEIGHT: Record<number, number> = {
  2: 1, 12: 1, 3: 2, 11: 2, 4: 3, 10: 3,
  5: 4, 9: 4, 6: 5, 8: 5,
};

// Resource production value for a hex at a vertex
function hexProductionValue(numberToken: number | null, resource: string): number {
  if (!numberToken || resource === 'desert') return 0;
  return TOKEN_WEIGHT[numberToken] ?? 0;
}

/** Evaluate how good a vertex is for initial settlement placement. */
function evaluateVertex(state: GameState, vertexId: VertexId): number {
  const vertex = state.board.graph.vertices.get(vertexId);
  if (!vertex) return 0;

  let score = 0;
  const resources = new Set<string>();

  for (const hexCoord of vertex.adjacentHexes) {
    const hex = state.board.graph.hexes.find(h => h.coord.q === hexCoord.q && h.coord.r === hexCoord.r);
    if (!hex) continue;
    score += hexProductionValue(hex.numberToken, hex.resource);
    if (hex.resource !== 'desert') resources.add(hex.resource);
  }

  // Bonus for resource diversity
  score += (resources.size - 1) * 2;

  return score;
}

/** Find best vertex for setup placement. */
function getBestSetupVertex(state: GameState, playerId: string): VertexId | null {
  const valid = getValidSettlementPlacements(state.board, playerId, true);
  if (valid.length === 0) return null;

  let bestVertex = valid[0];
  let bestScore = -1;

  for (const vid of valid) {
    const score = evaluateVertex(state, vid);
    if (score > bestScore) {
      bestScore = score;
      bestVertex = vid;
    }
  }

  return bestVertex;
}

/** Find a road that expands toward high-value vertices. */
function getBestSetupRoad(
  state: GameState,
  playerId: string,
  lastPlacedVertexId?: VertexId
): EdgeId | null {
  const valid = getValidRoadPlacements(state.board, playerId, true, lastPlacedVertexId);
  if (valid.length === 0) return null;

  let bestEdge = valid[0];
  let bestScore = -1;

  for (const eid of valid) {
    const edge = state.board.graph.edges.get(eid);
    if (!edge) continue;

    // Evaluate the vertices at the end of this road
    let score = 0;
    for (const vid of edge.vertices) {
      if (!state.board.buildings[vid]) {
        score = Math.max(score, evaluateVertex(state, vid));
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestEdge = eid;
    }
  }

  return bestEdge;
}

/** Get robber target hex: prefer hex with opponent buildings, avoid own buildings. */
function getBestRobberHex(state: GameState, playerId: string): HexCoord | null {
  const allHexes = hexesInRange({ q: 0, r: 0 }, 2);
  const current = state.board.robberHex;

  // Find opponents sorted by VP (target the leader)
  const opponents = state.players
    .filter(p => p.id !== playerId)
    .sort((a, b) => calculateVictoryPoints(b) - calculateVictoryPoints(a));

  // Try hexes with opponent buildings
  for (const opponent of opponents) {
    for (const hex of allHexes) {
      if (hex.q === current.q && hex.r === current.r) continue;
      // Check if this hex has opponent buildings
      for (const [vid, vertex] of state.board.graph.vertices) {
        const isAdj = vertex.adjacentHexes.some(h => h.q === hex.q && h.r === hex.r);
        if (!isAdj) continue;
        const building = state.board.buildings[vid];
        if (building?.playerId === opponent.id) {
          return hex;
        }
      }
    }
  }

  // Fallback: pick any hex that's not the current robber and not occupied by own buildings
  for (const hex of allHexes) {
    if (hex.q === current.q && hex.r === current.r) continue;
    let hasOwnBuilding = false;
    for (const [vid, vertex] of state.board.graph.vertices) {
      const isAdj = vertex.adjacentHexes.some(h => h.q === hex.q && h.r === hex.r);
      if (!isAdj) continue;
      if (state.board.buildings[vid]?.playerId === playerId) {
        hasOwnBuilding = true;
        break;
      }
    }
    if (!hasOwnBuilding) return hex;
  }

  // Last resort: any hex that's not current robber
  return allHexes.find(h => !(h.q === current.q && h.r === current.r)) ?? null;
}

/** Get steal target: opponent adjacent to robber with most resources. */
function getStealTarget(state: GameState, playerId: string): string | null {
  const robberHex = state.board.robberHex;
  const opponents = new Map<string, number>(); // playerId → resource count

  for (const [vid, vertex] of state.board.graph.vertices) {
    const isAdj = vertex.adjacentHexes.some(h => h.q === robberHex.q && h.r === robberHex.r);
    if (!isAdj) continue;
    const building = state.board.buildings[vid];
    if (building && building.playerId !== playerId) {
      const opponent = state.players.find(p => p.id === building.playerId);
      if (opponent) {
        opponents.set(building.playerId, totalResources(opponent));
      }
    }
  }

  if (opponents.size === 0) return null;

  // Target opponent with most resources
  let bestId = '';
  let bestCount = -1;
  for (const [id, count] of opponents) {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }

  return bestId || null;
}

function canAfford(resources: Record<ResourceType, number>, cost: Partial<Record<ResourceType, number>>): boolean {
  return Object.entries(cost).every(([res, amt]) => (resources[res as ResourceType] ?? 0) >= (amt ?? 0));
}

const COSTS = {
  settlement: { brick: 1, wood: 1, sheep: 1, wheat: 1 },
  road: { brick: 1, wood: 1 },
  city: { ore: 3, wheat: 2 },
  devCard: { ore: 1, wheat: 1, sheep: 1 },
} as const;

function makeAction(type: GameAction['type'], playerId: string, payload: Record<string, unknown> = {}): GameAction {
  return { type, playerId, payload, timestamp: Date.now() };
}

/** Main AI decision function. Returns next action or null. */
export function getAIAction(state: GameState, playerId: string): GameAction | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;

  const isCurrentPlayer = state.players[state.currentPlayerIndex]?.id === playerId;
  if (!isCurrentPlayer) {
    // Check if this player needs to discard
    if (state.turnPhase === 'discarding' && state.pendingDiscards.includes(playerId)) {
      return getDiscardAction(state, playerId);
    }
    return null;
  }

  // Setup phase
  if (state.phase === 'setup') {
    // Determine if player needs to place road or settlement
    // settlements_placed = 5 - player.settlements
    // roads_placed = 15 - player.roads
    // Need road if more settlements placed than roads
    const settlementsPlaced = 5 - player.settlements;
    const roadsPlaced = 15 - player.roads;
    const needsRoad = settlementsPlaced > roadsPlaced;

    if (!needsRoad) {
      // Place settlement
      const vertexId = getBestSetupVertex(state, playerId);
      if (vertexId) {
        return makeAction('PLACE_SETTLEMENT', playerId, { vertexId });
      }
    } else {
      // Place road
      const edgeId = getBestSetupRoad(state, playerId);
      if (edgeId) {
        return makeAction('PLACE_ROAD', playerId, { edgeId });
      }
    }
    return null;
  }

  // Playing phase
  switch (state.turnPhase) {
    case 'preRoll': {
      return makeAction('ROLL_DICE', playerId, {
        die1: Math.floor(Math.random() * 6) + 1,
        die2: Math.floor(Math.random() * 6) + 1,
      });
    }

    case 'discarding': {
      if (state.pendingDiscards.includes(playerId)) {
        return getDiscardAction(state, playerId);
      }
      return null;
    }

    case 'robber': {
      const hexCoord = getBestRobberHex(state, playerId);
      if (hexCoord) {
        return makeAction('MOVE_ROBBER', playerId, { hexCoord });
      }
      return null;
    }

    case 'stealing': {
      const targetPlayerId = getStealTarget(state, playerId);
      if (targetPlayerId) {
        return makeAction('STEAL_RESOURCE', playerId, { targetPlayerId });
      }
      // Move to postRoll without stealing
      return makeAction('STEAL_RESOURCE', playerId, { targetPlayerId: '' });
    }

    case 'postRoll': {
      return getPostRollAction(state, playerId, player);
    }

    default:
      return null;
  }
}

/** Get the discard action for a player who has too many cards. */
function getDiscardAction(state: GameState, playerId: string): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const mustDiscard = requiredDiscardCount(player);
  const resources: Partial<Record<ResourceType, number>> = {};

  // Simple strategy: discard excess of most-held resources
  const resEntries = (Object.entries(player.resources) as [ResourceType, number][])
    .sort(([, a], [, b]) => b - a);

  let remaining = mustDiscard;
  for (const [res, count] of resEntries) {
    if (remaining <= 0) break;
    const discard = Math.min(count, remaining);
    if (discard > 0) {
      resources[res] = discard;
      remaining -= discard;
    }
  }

  return makeAction('DISCARD_RESOURCES', playerId, { resources });
}

/** Get post-roll action based on game state and VP. */
function getPostRollAction(
  state: GameState,
  playerId: string,
  player: ReturnType<typeof state.players.find>
): GameAction | null {
  if (!player) return makeAction('END_TURN', playerId);

  const vp = calculateVictoryPoints(player);
  const res = player.resources;

  // Late game: try to win ASAP
  if (vp >= 7) {
    // City upgrade first if possible
    if (canAfford(res, COSTS.city) && player.cities > 0) {
      for (const [vid] of state.board.graph.vertices) {
        if (canPlaceCity(state.board, vid, playerId)) {
          return makeAction('BUILD_CITY', playerId, { vertexId: vid });
        }
      }
    }
    // Settlement second
    if (canAfford(res, COSTS.settlement) && player.settlements > 0) {
      const valid = getValidSettlementPlacements(state.board, playerId, false);
      if (valid.length > 0) {
        return makeAction('BUILD_SETTLEMENT', playerId, { vertexId: valid[0] });
      }
    }
  }

  // Mid game (4-6 VP): cities and dev cards
  if (vp >= 4) {
    if (canAfford(res, COSTS.city) && player.cities > 0) {
      for (const [vid] of state.board.graph.vertices) {
        if (canPlaceCity(state.board, vid, playerId)) {
          return makeAction('BUILD_CITY', playerId, { vertexId: vid });
        }
      }
    }
    if (canAfford(res, COSTS.devCard)) {
      return makeAction('BUY_DEVELOPMENT_CARD', playerId, {});
    }
  }

  // Early game (<4 VP): roads and settlements
  // Try settlement
  if (canAfford(res, COSTS.settlement) && player.settlements > 0) {
    const valid = getValidSettlementPlacements(state.board, playerId, false);
    if (valid.length > 0) {
      const bestVertex = valid.reduce((best, vid) =>
        evaluateVertex(state, vid) > evaluateVertex(state, best) ? vid : best
      );
      return makeAction('BUILD_SETTLEMENT', playerId, { vertexId: bestVertex });
    }
  }

  // Try road (to expand)
  if (canAfford(res, COSTS.road) && player.roads > 0) {
    const valid = getValidRoadPlacements(state.board, playerId, false);
    if (valid.length > 0) {
      return makeAction('BUILD_ROAD', playerId, { edgeId: valid[0] });
    }
  }

  // Try city
  if (canAfford(res, COSTS.city) && player.cities > 0) {
    for (const [vid] of state.board.graph.vertices) {
      if (canPlaceCity(state.board, vid, playerId)) {
        return makeAction('BUILD_CITY', playerId, { vertexId: vid });
      }
    }
  }

  // Buy dev card
  if (canAfford(res, COSTS.devCard)) {
    return makeAction('BUY_DEVELOPMENT_CARD', playerId, {});
  }

  // End turn
  return makeAction('END_TURN', playerId);
}

/** Run AI turn: dispatches actions until END_TURN or stuck. */
export function runAITurn(
  state: GameState,
  playerId: string,
  dispatch: (action: GameAction, s: GameState) => GameState
): GameState {
  let currentState = state;
  let maxIterations = 50; // prevent infinite loops

  while (maxIterations-- > 0) {
    const action = getAIAction(currentState, playerId);
    if (!action) break;

    const newState = dispatch(action, currentState);

    // Check if state didn't change (stuck)
    if (newState === currentState) break;

    currentState = newState;

    // If the action was END_TURN or the current player changed, stop
    if (action.type === 'END_TURN') break;
    if (currentState.players[currentState.currentPlayerIndex]?.id !== playerId) break;
    if (currentState.phase === 'finished') break;
  }

  return currentState;
}

export function evaluateResourceScarcity(
  _state: GameState,
  _playerId: string
): Record<ResourceType, number> {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

export function shouldBuildSettlement(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  return canAfford(player.resources, COSTS.settlement) &&
    player.settlements > 0 &&
    getValidSettlementPlacements(state.board, playerId, false).length > 0;
}

export function shouldBuildCity(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  if (!canAfford(player.resources, COSTS.city) || player.cities === 0) return false;
  for (const [vid] of state.board.graph.vertices) {
    if (canPlaceCity(state.board, vid, playerId)) return true;
  }
  return false;
}

export function shouldBuildRoad(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  return canAfford(player.resources, COSTS.road) &&
    player.roads > 0 &&
    getValidRoadPlacements(state.board, playerId, false).length > 0;
}

export function shouldBuyDevCard(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  return canAfford(player.resources, COSTS.devCard) && state.devCardDeck.length > 0;
}
