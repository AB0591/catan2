import type { GameAction, GameState } from '../../state/gameState';
import type { BoardState, KnightLevel, KnightState } from '../../state/boardState';
import type { VertexId } from '../board/boardTypes';
import { hasResources, removeResources, hasCommodities, removeCommodities } from '../resources/resourceDistribution';

const KNIGHT_BUILD_COST = { sheep: 1, ore: 1 } as const;
const KNIGHT_ACTIVATION_COST = { wheat: 1 } as const;
const KNIGHT_PROMOTION_COST = { coin: 1 } as const;

function findKnightAtVertex(board: BoardState, vertexId: VertexId): KnightState | null {
  for (const knight of Object.values(board.knights)) {
    if (knight.vertexId === vertexId) return knight;
  }
  return null;
}

function hasAdjacentPlayerRoad(board: BoardState, vertexId: VertexId, playerId: string): boolean {
  const vertex = board.graph.vertices.get(vertexId);
  if (!vertex) return false;
  return vertex.adjacentEdges.some(edgeId => board.roads[edgeId]?.playerId === playerId);
}

function getEdgeOwnerBetweenVertices(
  board: BoardState,
  fromVertexId: VertexId,
  toVertexId: VertexId
): string | null {
  const from = board.graph.vertices.get(fromVertexId);
  if (!from) return null;
  for (const edgeId of from.adjacentEdges) {
    const edge = board.graph.edges.get(edgeId);
    if (!edge) continue;
    if (edge.vertices.includes(toVertexId)) {
      return board.roads[edgeId]?.playerId ?? null;
    }
  }
  return null;
}

function isVertexOpenForKnight(board: BoardState, vertexId: VertexId): boolean {
  if (!board.graph.vertices.has(vertexId)) return false;
  if (board.buildings[vertexId]) return false;
  if (findKnightAtVertex(board, vertexId)) return false;
  return true;
}

function canMoveKnightAlongOwnRoad(
  board: BoardState,
  playerId: string,
  fromVertexId: VertexId,
  toVertexId: VertexId
): boolean {
  const owner = getEdgeOwnerBetweenVertices(board, fromVertexId, toVertexId);
  return owner === playerId;
}

function findDisplacementTarget(board: BoardState, displaced: KnightState): VertexId | null {
  const vertex = board.graph.vertices.get(displaced.vertexId);
  if (!vertex) return null;
  const candidates: VertexId[] = [];
  for (const adjacentVertexId of vertex.adjacentVertices) {
    if (!isVertexOpenForKnight(board, adjacentVertexId)) continue;
    if (!canMoveKnightAlongOwnRoad(board, displaced.ownerId, displaced.vertexId, adjacentVertexId)) continue;
    candidates.push(adjacentVertexId);
  }
  candidates.sort();
  return candidates[0] ?? null;
}

function nextKnightId(board: BoardState, playerId: string, turn: number): string {
  let suffix = Object.keys(board.knights).length;
  while (true) {
    const candidate = `kn_${playerId}_${turn}_${suffix}`;
    if (!board.knights[candidate]) return candidate;
    suffix += 1;
  }
}

function getKnight(state: GameState, knightId: string): KnightState | null {
  return state.board.knights[knightId] ?? null;
}

function getPromotionCapByPolitics(politicsLevel: number): KnightLevel {
  if (politicsLevel >= 4) return 3;
  if (politicsLevel >= 2) return 2;
  return 1;
}

export function getValidKnightBuildVertices(state: GameState, playerId: string): VertexId[] {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return [];
  const result: VertexId[] = [];
  for (const vertexId of state.board.graph.vertices.keys()) {
    if (!isVertexOpenForKnight(state.board, vertexId)) continue;
    if (!hasAdjacentPlayerRoad(state.board, vertexId, playerId)) continue;
    result.push(vertexId);
  }
  return result;
}

export function getValidKnightMoveTargets(state: GameState, knightId: string): VertexId[] {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return [];
  const knight = getKnight(state, knightId);
  if (!knight) return [];
  if (!knight.active || knight.hasActedThisTurn) return [];

  const currentVertex = state.board.graph.vertices.get(knight.vertexId);
  if (!currentVertex) return [];

  const result: VertexId[] = [];
  for (const targetVertexId of currentVertex.adjacentVertices) {
    if (!canMoveKnightAlongOwnRoad(state.board, knight.ownerId, knight.vertexId, targetVertexId)) continue;
    if (state.board.buildings[targetVertexId]) continue;

    const occupyingKnight = findKnightAtVertex(state.board, targetVertexId);
    if (!occupyingKnight) {
      result.push(targetVertexId);
      continue;
    }

    if (occupyingKnight.ownerId === knight.ownerId) continue;
    if (knight.level <= occupyingKnight.level) continue;

    const displacedTarget = findDisplacementTarget(state.board, occupyingKnight);
    if (!displacedTarget) continue;
    result.push(targetVertexId);
  }

  return result;
}

export function getDriveAwayRobberTargets(state: GameState, knightId: string): Array<{ q: number; r: number }> {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return [];
  const knight = getKnight(state, knightId);
  if (!knight || !knight.active || knight.hasActedThisTurn) return [];
  const vertex = state.board.graph.vertices.get(knight.vertexId);
  if (!vertex) return [];

  const robber = state.board.robberHex;
  const adjacentToRobber = vertex.adjacentHexes.some(h => h.q === robber.q && h.r === robber.r);
  if (!adjacentToRobber) return [];

  return state.board.graph.hexes
    .map(h => h.coord)
    .filter(c => !(c.q === robber.q && c.r === robber.r));
}

export function handleBuildKnight(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const { vertexId } = action.payload as { vertexId?: VertexId };
  if (!vertexId) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  if (!hasResources(player, KNIGHT_BUILD_COST)) return state;
  if (!getValidKnightBuildVertices(state, action.playerId).includes(vertexId)) return state;

  const updatedPlayer = removeResources(player, KNIGHT_BUILD_COST);
  if (!updatedPlayer) return state;

  const knightId = nextKnightId(state.board, action.playerId, state.currentTurn);
  const knight: KnightState = {
    id: knightId,
    ownerId: action.playerId,
    vertexId,
    level: 1,
    active: false,
    hasActedThisTurn: false,
  };

  const updatedPlayers = state.players.map((p, idx) => (idx === playerIndex ? updatedPlayer : p));
  return {
    ...state,
    players: updatedPlayers,
    board: {
      ...state.board,
      knights: {
        ...state.board.knights,
        [knightId]: knight,
      },
    },
  };
}

export function handleActivateKnight(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const { knightId } = action.payload as { knightId?: string };
  if (!knightId) return state;

  const knight = getKnight(state, knightId);
  if (!knight || knight.ownerId !== action.playerId || knight.active) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  if (!hasResources(player, KNIGHT_ACTIVATION_COST)) return state;
  const updatedPlayer = removeResources(player, KNIGHT_ACTIVATION_COST);
  if (!updatedPlayer) return state;

  const updatedPlayers = state.players.map((p, idx) => (idx === playerIndex ? updatedPlayer : p));
  return {
    ...state,
    players: updatedPlayers,
    board: {
      ...state.board,
      knights: {
        ...state.board.knights,
        [knightId]: {
          ...knight,
          active: true,
        },
      },
    },
  };
}

export function handleMoveKnight(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const { knightId, toVertexId } = action.payload as { knightId?: string; toVertexId?: VertexId };
  if (!knightId || !toVertexId) return state;

  const knight = getKnight(state, knightId);
  if (!knight || knight.ownerId !== action.playerId) return state;

  if (!getValidKnightMoveTargets(state, knightId).includes(toVertexId)) return state;

  const occupyingKnight = findKnightAtVertex(state.board, toVertexId);
  let updatedKnights = { ...state.board.knights };
  if (occupyingKnight && occupyingKnight.ownerId !== action.playerId) {
    const displacedTo = findDisplacementTarget(state.board, occupyingKnight);
    if (!displacedTo) return state;
    updatedKnights[occupyingKnight.id] = {
      ...occupyingKnight,
      vertexId: displacedTo,
      hasActedThisTurn: true,
    };
  }

  updatedKnights = {
    ...updatedKnights,
    [knightId]: {
      ...knight,
      vertexId: toVertexId,
      hasActedThisTurn: true,
    },
  };

  return {
    ...state,
    board: {
      ...state.board,
      knights: updatedKnights,
    },
  };
}

export function handlePromoteKnight(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const { knightId } = action.payload as { knightId?: string };
  if (!knightId) return state;

  const knight = getKnight(state, knightId);
  if (!knight || knight.ownerId !== action.playerId) return state;
  if (!knight.active || knight.hasActedThisTurn || knight.level >= 3) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  const maxAllowedLevel = getPromotionCapByPolitics(player.cityImprovements.politics);
  const nextLevel = (knight.level + 1) as KnightLevel;
  if (nextLevel > maxAllowedLevel) return state;

  if (!hasCommodities(player, KNIGHT_PROMOTION_COST)) return state;
  const updatedPlayer = removeCommodities(player, KNIGHT_PROMOTION_COST);
  if (!updatedPlayer) return state;

  const updatedPlayers = state.players.map((p, idx) => (idx === playerIndex ? updatedPlayer : p));
  return {
    ...state,
    players: updatedPlayers,
    board: {
      ...state.board,
      knights: {
        ...state.board.knights,
        [knightId]: {
          ...knight,
          level: nextLevel,
          hasActedThisTurn: true,
        },
      },
    },
  };
}

export function handleDriveAwayRobber(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const { knightId, hexCoord } = action.payload as { knightId?: string; hexCoord?: { q: number; r: number } };
  if (!knightId || !hexCoord) return state;

  const knight = getKnight(state, knightId);
  if (!knight || knight.ownerId !== action.playerId) return state;

  const validTargets = getDriveAwayRobberTargets(state, knightId);
  const isValidTarget = validTargets.some(c => c.q === hexCoord.q && c.r === hexCoord.r);
  if (!isValidTarget) return state;

  return {
    ...state,
    board: {
      ...state.board,
      robberHex: hexCoord,
      knights: {
        ...state.board.knights,
        [knightId]: {
          ...knight,
          hasActedThisTurn: true,
        },
      },
    },
  };
}

export function resetKnightActionsForPlayer(board: BoardState, playerId: string): BoardState {
  const updatedKnights: Record<string, KnightState> = {};
  for (const [id, knight] of Object.entries(board.knights)) {
    updatedKnights[id] = knight.ownerId === playerId
      ? { ...knight, hasActedThisTurn: false }
      : knight;
  }
  return {
    ...board,
    knights: updatedKnights,
  };
}

