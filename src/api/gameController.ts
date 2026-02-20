import type { GameState, GameAction } from '../state/gameState';
import type { Vertex, Edge } from '../engine/board/boardTypes';
import { dispatchAction } from '../engine/turnManager/turnManager';

/**
 * Serialize full game state to a JSON string.
 * BoardGraph.vertices and .edges are Maps — convert to plain objects.
 */
export function serializeState(state: GameState): string {
  const serializable = {
    ...state,
    board: {
      ...state.board,
      graph: {
        ...state.board.graph,
        vertices: Object.fromEntries(state.board.graph.vertices),
        edges: Object.fromEntries(state.board.graph.edges),
      },
    },
  };
  return JSON.stringify(serializable);
}

/**
 * Deserialize a JSON string back to GameState.
 * Reconstructs BoardGraph.vertices and .edges as Maps.
 */
export function deserializeState(json: string): GameState {
  const raw = JSON.parse(json) as {
    board: {
      graph: {
        vertices: Record<string, Vertex>;
        edges: Record<string, Edge>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  const vertices = new Map(Object.entries(raw.board.graph.vertices));
  const edges = new Map(Object.entries(raw.board.graph.edges));

  return {
    ...raw,
    board: {
      ...raw.board,
      graph: {
        ...raw.board.graph,
        vertices,
        edges,
      },
    },
  } as GameState;
}

/**
 * Replay all actions from an action log against an initial state.
 * Returns the final state.
 */
export function replayFromLog(initialState: GameState, log: GameAction[]): GameState {
  let state = initialState;
  for (const action of log) {
    state = dispatchAction(action, state);
  }
  return state;
}

/**
 * Validate whether an action is legal in the given state.
 * Returns { valid: boolean, reason?: string }.
 */
export function validateAction(
  action: GameAction,
  state: GameState
): { valid: boolean; reason?: string } {
  const player = state.players.find(p => p.id === action.playerId);

  if (!player) {
    return { valid: false, reason: `Player ${action.playerId} not found` };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.phase !== 'playing') {
        return { valid: false, reason: 'Can only roll dice during playing phase' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      if (state.turnPhase !== 'preRoll') {
        return { valid: false, reason: 'Can only roll in preRoll phase' };
      }
      const { die1, die2 } = action.payload as { die1?: number; die2?: number };
      if (!die1 || !die2 || die1 < 1 || die1 > 6 || die2 < 1 || die2 > 6) {
        return { valid: false, reason: 'Invalid dice values' };
      }
      return { valid: true };
    }

    case 'END_TURN': {
      if (state.phase !== 'playing') {
        return { valid: false, reason: 'Can only end turn during playing phase' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      if (state.turnPhase !== 'postRoll') {
        return { valid: false, reason: 'Can only end turn in postRoll phase' };
      }
      return { valid: true };
    }

    case 'PLACE_SETTLEMENT': {
      if (state.phase !== 'setup') {
        return { valid: false, reason: 'Can only place settlement during setup' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      const { vertexId } = action.payload as { vertexId?: string };
      if (!vertexId) {
        return { valid: false, reason: 'Missing vertexId' };
      }
      if (!state.board.graph.vertices.has(vertexId)) {
        return { valid: false, reason: 'Invalid vertexId' };
      }
      return { valid: true };
    }

    case 'PLACE_ROAD': {
      if (state.phase !== 'setup') {
        return { valid: false, reason: 'Can only place road during setup' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      const { edgeId } = action.payload as { edgeId?: string };
      if (!edgeId) {
        return { valid: false, reason: 'Missing edgeId' };
      }
      if (!state.board.graph.edges.has(edgeId)) {
        return { valid: false, reason: 'Invalid edgeId' };
      }
      return { valid: true };
    }

    case 'MOVE_ROBBER': {
      if (state.turnPhase !== 'robber') {
        return { valid: false, reason: 'Can only move robber in robber phase' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      return { valid: true };
    }

    case 'STEAL_RESOURCE': {
      if (state.turnPhase !== 'stealing') {
        return { valid: false, reason: 'Can only steal in stealing phase' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      return { valid: true };
    }

    case 'DISCARD_RESOURCES': {
      if (state.turnPhase !== 'discarding') {
        return { valid: false, reason: 'Can only discard in discarding phase' };
      }
      if (!state.pendingDiscards.includes(action.playerId)) {
        return { valid: false, reason: 'Player does not need to discard' };
      }
      return { valid: true };
    }

    case 'BUILD_SETTLEMENT':
    case 'BUILD_ROAD':
    case 'BUILD_CITY':
    case 'BUY_DEVELOPMENT_CARD': {
      if (state.phase !== 'playing') {
        return { valid: false, reason: 'Can only build during playing phase' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      if (state.turnPhase !== 'postRoll') {
        return { valid: false, reason: 'Can only build in postRoll phase' };
      }
      return { valid: true };
    }

    case 'TRADE_BANK':
    case 'TRADE_PORT':
    case 'TRADE_PLAYER': {
      if (state.phase !== 'playing') {
        return { valid: false, reason: 'Can only trade during playing phase' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      if (state.turnPhase !== 'postRoll') {
        return { valid: false, reason: 'Can only trade in postRoll phase' };
      }
      return { valid: true };
    }

    case 'PLAY_KNIGHT':
    case 'PLAY_ROAD_BUILDING':
    case 'PLAY_YEAR_OF_PLENTY':
    case 'PLAY_MONOPOLY': {
      if (state.phase !== 'playing') {
        return { valid: false, reason: 'Can only play cards during playing phase' };
      }
      if (currentPlayer?.id !== action.playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
      return { valid: true };
    }

    default:
      return { valid: true }; // allow unknown actions
  }
}
