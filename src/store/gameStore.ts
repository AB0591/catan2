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
} from '../engine/rules/placementRules';
import { canPlaceCity } from '../engine/rules/placementRules';

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
    const { gameState } = get();
    if (!gameState) return;
    const newState = dispatchAction(action, gameState);
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
      // During setup, alternate between settlement and road placement
      // If there are no buildings on the current player, they need to place a settlement
      // Track what's needed via setupOrderIndex parity (even = settlement, odd = road)
      const setupStep = gameState.setupOrderIndex % 2;
      if (setupStep === 0) {
        // Place settlement
        return {
          vertices: getValidSettlementPlacements(gameState.board, player.id, true),
          edges: [],
        };
      } else {
        // Place road adjacent to last settlement
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
