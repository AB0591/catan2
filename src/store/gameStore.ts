import { create } from 'zustand';
import type { GameState, GameAction } from '../state/gameState';
import type { PlayerState } from '../state/playerState';
import type { VertexId, EdgeId } from '../engine/board/boardTypes';
import { dispatchAction } from '../engine/turnManager/turnManager';
import { createInitialGameState } from '../state/gameStateFactory';
import type { PlayerConfig } from '../state/gameStateFactory';
import {
  getValidSettlementPlacements,
  getValidRoadPlacements,
  canPlaceCity,
} from '../engine/rules/placementRules';
import { runAITurn } from '../engine/ai/aiPlayer';

type GameStore = {
  gameState: GameState | null;
  selectedAction: 'settlement' | 'road' | 'city' | null;
  lastPlacedSettlementVertexId: VertexId | null;
  aiPlayerIds: string[];
  startGame: (playerNames: string[], aiPlayerIds?: string[]) => void;
  dispatch: (action: GameAction) => void;
  setSelectedAction: (action: 'settlement' | 'road' | 'city' | null) => void;
  setLastPlacedSettlement: (vertexId: VertexId | null) => void;
  getCurrentPlayer: () => PlayerState | null;
  getValidPlacements: () => { vertices: VertexId[]; edges: EdgeId[] };
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  selectedAction: null,
  lastPlacedSettlementVertexId: null,
  aiPlayerIds: [],

  startGame: (playerNames: string[], aiPlayerIds: string[] = []) => {
    const configs: PlayerConfig[] = playerNames.map((name, i) => ({
      id: `player_${i}`,
      name,
      color: (['red', 'blue', 'orange', 'white'] as const)[i % 4],
    }));
    const gameState = createInitialGameState(configs);
    set({ gameState, aiPlayerIds, lastPlacedSettlementVertexId: null, selectedAction: null });
  },

  dispatch: (action: GameAction) => {
    const { gameState, aiPlayerIds } = get();
    if (!gameState) return;
    let newState = dispatchAction(action, gameState);

    // Auto-run AI turns after each human action
    if (aiPlayerIds.length > 0) {
      newState = runAITurnsIfNeeded(newState, aiPlayerIds);
    }

    set({ gameState: newState });
  },

  setSelectedAction: (action) => set({ selectedAction: action }),

  setLastPlacedSettlement: (vertexId) => set({ lastPlacedSettlementVertexId: vertexId }),

  getCurrentPlayer: () => {
    const { gameState } = get();
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex] ?? null;
  },

  getValidPlacements: () => {
    const { gameState, lastPlacedSettlementVertexId } = get();
    if (!gameState) return { vertices: [], edges: [] };

    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player) return { vertices: [], edges: [] };

    const isSetup = gameState.phase === 'setup';

    if (isSetup) {
      // Determine if player needs settlement or road
      // settlements_placed > roads_placed means player needs a road next
      const settlementsPlaced = 5 - player.settlements;
      const roadsPlaced = 15 - player.roads;
      const needsRoad = settlementsPlaced > roadsPlaced;

      if (!needsRoad) {
        return {
          vertices: getValidSettlementPlacements(gameState.board, player.id, true),
          edges: [],
        };
      } else {
        return {
          vertices: [],
          edges: getValidRoadPlacements(
            gameState.board,
            player.id,
            true,
            lastPlacedSettlementVertexId ?? undefined
          ),
        };
      }
    }

    // Playing phase
    const { selectedAction } = get();
    if (selectedAction === 'settlement') {
      return {
        vertices: getValidSettlementPlacements(gameState.board, player.id, false),
        edges: [],
      };
    }
    if (selectedAction === 'road') {
      return {
        vertices: [],
        edges: getValidRoadPlacements(gameState.board, player.id, false),
      };
    }
    if (selectedAction === 'city') {
      const vertices: VertexId[] = [];
      for (const vertexId of gameState.board.graph.vertices.keys()) {
        if (canPlaceCity(gameState.board, vertexId, player.id)) {
          vertices.push(vertexId);
        }
      }
      return { vertices, edges: [] };
    }

    return { vertices: [], edges: [] };
  },
}));

/** Run AI turns for any AI players until it's a human player's turn or game is finished. */
function runAITurnsIfNeeded(state: GameState, aiPlayerIds: string[]): GameState {
  let currentState = state;
  let maxCycles = 200; // safety limit

  while (maxCycles-- > 0) {
    if (currentState.phase === 'finished') break;

    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentPlayer) break;

    // Handle discarding for AI players
    if (currentState.turnPhase === 'discarding') {
      const nextDiscardAI = currentState.pendingDiscards.find(id => aiPlayerIds.includes(id));
      if (nextDiscardAI) {
        currentState = runAITurn(currentState, nextDiscardAI, (action, s) => dispatchAction(action, s));
        continue;
      }
      break; // human player needs to discard
    }

    if (!aiPlayerIds.includes(currentPlayer.id)) break; // human's turn

    currentState = runAITurn(currentState, currentPlayer.id, (action, s) => dispatchAction(action, s));
  }

  return currentState;
}
