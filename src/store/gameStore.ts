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
import { runAITurn, getAIAction } from '../engine/ai/aiPlayer';

const AI_ACTION_DELAY_MS = 700;
const AI_ROLL_DISPLAY_MS = 1200;

function delayMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type GameStore = {
  gameState: GameState | null;
  selectedAction: 'settlement' | 'road' | 'city' | null;
  lastPlacedSettlementVertexId: VertexId | null;
  aiPlayerIds: string[];
  isAIThinking: boolean;
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
  isAIThinking: false,

  startGame: (playerNames: string[], aiPlayerIds: string[] = []) => {
    const configs: PlayerConfig[] = playerNames.map((name, i) => ({
      id: `player_${i}`,
      name,
      color: (['red', 'blue', 'orange', 'white'] as const)[i % 4],
    }));
    const gameState = createInitialGameState(configs);
    set({ gameState, aiPlayerIds, lastPlacedSettlementVertexId: null, selectedAction: null, isAIThinking: false });
    // If first player is AI, start AI loop
    setTimeout(() => runAITurnsAsync(get, set), 0);
  },

  dispatch: (action: GameAction) => {
    const { gameState, aiPlayerIds } = get();
    if (!gameState) return;
    const newState = dispatchAction(action, gameState);
    set({ gameState: newState });
    // Trigger async AI processing after human action
    if (aiPlayerIds.length > 0) {
      setTimeout(() => runAITurnsAsync(get, set), 0);
    }
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
      const settlementsPlaced = 5 - player.settlements;
      const roadsPlaced = 15 - player.roads;
      const needsRoad = settlementsPlaced > roadsPlaced;
      if (!needsRoad) {
        return { vertices: getValidSettlementPlacements(gameState.board, player.id, true), edges: [] };
      } else {
        return {
          vertices: [],
          edges: getValidRoadPlacements(gameState.board, player.id, true, lastPlacedSettlementVertexId ?? undefined),
        };
      }
    }
    const { selectedAction } = get();
    if (selectedAction === 'settlement') {
      return { vertices: getValidSettlementPlacements(gameState.board, player.id, false), edges: [] };
    }
    if (selectedAction === 'road') {
      return { vertices: [], edges: getValidRoadPlacements(gameState.board, player.id, false) };
    }
    if (selectedAction === 'city') {
      const vertices: VertexId[] = [];
      for (const vertexId of gameState.board.graph.vertices.keys()) {
        if (canPlaceCity(gameState.board, vertexId, player.id)) vertices.push(vertexId);
      }
      return { vertices, edges: [] };
    }
    return { vertices: [], edges: [] };
  },
}));

async function runAITurnsAsync(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void
): Promise<void> {
  const { aiPlayerIds } = get();
  let maxCycles = 200;

  while (maxCycles-- > 0) {
    const { gameState } = get();
    if (!gameState || gameState.phase === 'finished') break;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) break;

    // Handle discarding for AI players
    if (gameState.turnPhase === 'discarding') {
      const nextDiscardAI = gameState.pendingDiscards.find(id => aiPlayerIds.includes(id));
      if (nextDiscardAI) {
        const discardPlayer = gameState.players.find(p => p.id === nextDiscardAI);
        const stateWithMsg = { ...gameState, aiMessage: `${discardPlayer?.name ?? 'AI'} is discarding...` };
        set({ gameState: stateWithMsg, isAIThinking: true });
        await delayMs(AI_ACTION_DELAY_MS);
        const { gameState: current } = get();
        if (!current) break;
        const newState = runAITurn(current, nextDiscardAI, (action, s) => dispatchAction(action, s));
        set({ gameState: newState });
        continue;
      }
      break; // human must discard
    }

    if (!aiPlayerIds.includes(currentPlayer.id)) {
      set({ isAIThinking: false });
      break;
    }

    set({ isAIThinking: true });

    // Show thinking message
    const stateWithThinking = { ...gameState, aiMessage: `${currentPlayer.name} is thinking...` };
    set({ gameState: stateWithThinking });
    await delayMs(AI_ACTION_DELAY_MS);

    const { gameState: current } = get();
    if (!current) break;

    // Get one AI action
    const action = getAIAction(current, currentPlayer.id);
    if (!action) {
      set({ isAIThinking: false });
      break;
    }

    const newState = dispatchAction(action, current);

    // Build a descriptive message
    let msg: string | null = null;
    if (action.type === 'ROLL_DICE') {
      const roll = newState.lastDiceRoll;
      if (roll) {
        msg = `${currentPlayer.name} rolled ${roll.total} (${roll.die1}+${roll.die2})`;
        if (roll.total === 7) {
          msg += ' — 🦹 Robber!';
        } else if (newState.lastDistribution) {
          const gains = newState.lastDistribution[currentPlayer.id];
          if (gains) {
            const gainStr = Object.entries(gains).filter(([,v]) => (v ?? 0) > 0).map(([r,v]) => `${v} ${r}`).join(', ');
            if (gainStr) msg += ` — got ${gainStr}`;
          }
        }
      }
    } else if (action.type === 'MOVE_ROBBER') {
      msg = `${currentPlayer.name} moved the robber`;
    } else if (action.type === 'STEAL_RESOURCE' && newState.lastSteal) {
      const victim = newState.players.find(p => p.id === newState.lastSteal?.victimId);
      msg = `${currentPlayer.name} stole 1 ${newState.lastSteal.resource} from ${victim?.name ?? 'opponent'}`;
    } else if (action.type === 'BUILD_SETTLEMENT') {
      msg = `${currentPlayer.name} built a settlement`;
    } else if (action.type === 'BUILD_CITY') {
      msg = `${currentPlayer.name} built a city`;
    } else if (action.type === 'BUILD_ROAD') {
      msg = `${currentPlayer.name} built a road`;
    } else if (action.type === 'PLAY_KNIGHT') {
      msg = `${currentPlayer.name} played a Knight`;
    } else if (action.type === 'END_TURN') {
      msg = null;
    }

    set({ gameState: { ...newState, aiMessage: msg } });

    const pauseMs = action.type === 'ROLL_DICE' ? AI_ROLL_DISPLAY_MS : AI_ACTION_DELAY_MS;
    await delayMs(pauseMs);

    // If END_TURN, loop will naturally check next player
  }

  set({ isAIThinking: false });
}
