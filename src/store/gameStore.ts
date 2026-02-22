import { create } from 'zustand';
import type { GameState, GameAction } from '../state/gameState';
import type { ExpansionRules } from '../state/gameState';
import type { PlayerState } from '../state/playerState';
import type { VertexId, EdgeId } from '../engine/board/boardTypes';
import { dispatchAction } from '../engine/turnManager/turnManager';
import { createInitialGameState, getDefaultVictoryPointTarget } from '../state/gameStateFactory';
import type { PlayerConfig } from '../state/gameStateFactory';
import {
  getValidSettlementPlacements,
  getValidRoadPlacements,
  canPlaceCity,
} from '../engine/rules/placementRules';
import { runAITurn, getAIAction } from '../engine/ai/aiPlayer';
import { deserializeState, replayFromLog } from '../api/gameController';
import { executeDebugCommand, parseDebugCommand, validateDebugCommandForState } from '../debug/commands';
import {
  loadSavedScenarios,
  makeScenarioSnapshot,
  parseScenarioImport,
  persistSavedScenarios,
} from '../debug/scenarioStorage';
import type { OnboardingSeen, ScenarioSnapshot } from '../debug/types';

const AI_ACTION_DELAY_MS = 700;
const AI_ROLL_DISPLAY_MS = 1200;
const ONBOARDING_STORAGE_KEY = 'catan2.onboarding.v1';
const DEBUG_ENABLED = Boolean(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true');

function delayMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const DEFAULT_ONBOARDING_SEEN: OnboardingSeen = {
  startScreen: false,
  firstTurn: false,
  buildPhase: false,
  devCards: false,
};

function loadOnboardingSeen(): OnboardingSeen {
  if (
    typeof window === 'undefined' ||
    !window.localStorage ||
    typeof window.localStorage.getItem !== 'function'
  ) {
    return DEFAULT_ONBOARDING_SEEN;
  }
  const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) return DEFAULT_ONBOARDING_SEEN;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingSeen>;
    return {
      startScreen: Boolean(parsed.startScreen),
      firstTurn: Boolean(parsed.firstTurn),
      buildPhase: Boolean(parsed.buildPhase),
      devCards: Boolean(parsed.devCards),
    };
  } catch {
    return DEFAULT_ONBOARDING_SEEN;
  }
}

function persistOnboardingSeen(onboardingSeen: OnboardingSeen): void {
  if (
    typeof window === 'undefined' ||
    !window.localStorage ||
    typeof window.localStorage.setItem !== 'function'
  ) {
    return;
  }
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingSeen));
}

function withClearedActionLog(state: GameState): GameState {
  return { ...state, actionLog: [] };
}

function buildPlayerConfigs(playerNames: string[]): PlayerConfig[] {
  return playerNames.map((name, i) => ({
    id: `player_${i}`,
    name,
    color: (['red', 'blue', 'orange', 'white'] as const)[i % 4],
  }));
}

function applyLiveState(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  nextLiveState: GameState,
  extra: Partial<GameStore> = {}
): void {
  if (get().isReplayMode) {
    set({ liveGameState: nextLiveState, ...extra });
  } else {
    set({ liveGameState: nextLiveState, gameState: nextLiveState, ...extra });
  }
}

type CommandResult = {
  ok: boolean;
  message: string;
};

type ScenarioActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

type GameStore = {
  gameState: GameState | null;
  liveGameState: GameState | null;
  initialGameState: GameState | null;
  selectedAction: 'settlement' | 'road' | 'city' | null;
  lastPlacedSettlementVertexId: VertexId | null;
  aiPlayerIds: string[];
  lastPlayerNames: string[];
  lastAiPlayerIds: string[];
  isAIThinking: boolean;
  lastExpansionRules: ExpansionRules;
  lastVictoryPointTarget: number;
  debugEnabled: boolean;
  lastDebugMessage: string | null;
  isReplayMode: boolean;
  timelineIndex: number | null;
  savedScenarios: ScenarioSnapshot[];
  onboardingSeen: OnboardingSeen;
  startGame: (
    playerNames: string[],
    aiPlayerIds?: string[],
    expansionRules?: ExpansionRules,
    victoryPointTarget?: number
  ) => void;
  restartGame: () => void;
  dispatch: (action: GameAction) => void;
  dispatchLive: (action: GameAction) => void;
  setSelectedAction: (action: 'settlement' | 'road' | 'city' | null) => void;
  setLastPlacedSettlement: (vertexId: VertexId | null) => void;
  getCurrentPlayer: () => PlayerState | null;
  getValidPlacements: () => { vertices: VertexId[]; edges: EdgeId[] };
  setTimelineIndex: (index: number | null) => void;
  exitReplayMode: () => void;
  resumeLiveFromReplay: () => void;
  runDebugCommand: (input: string) => CommandResult;
  saveScenario: (name: string) => ScenarioActionResult;
  loadScenario: (id: string) => ScenarioActionResult;
  importScenario: (json: string) => ScenarioActionResult;
  exportScenario: (id: string) => string | null;
  deleteScenario: (id: string) => void;
  dismissCoachmark: (key: keyof OnboardingSeen) => void;
  resetOnboarding: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  liveGameState: null,
  initialGameState: null,
  selectedAction: null,
  lastPlacedSettlementVertexId: null,
  aiPlayerIds: [],
  lastPlayerNames: [],
  lastAiPlayerIds: [],
  isAIThinking: false,
  lastExpansionRules: 'base',
  lastVictoryPointTarget: getDefaultVictoryPointTarget('base'),
  debugEnabled: DEBUG_ENABLED,
  lastDebugMessage: null,
  isReplayMode: false,
  timelineIndex: null,
  savedScenarios: loadSavedScenarios(),
  onboardingSeen: loadOnboardingSeen(),

  startGame: (
    playerNames: string[],
    aiPlayerIds: string[] = [],
    expansionRules: ExpansionRules = 'base',
    victoryPointTarget?: number
  ) => {
    const configs = buildPlayerConfigs(playerNames);
    const seed = Math.floor(Math.random() * 2147483647);
    const gameState = createInitialGameState(configs, seed, expansionRules, victoryPointTarget);
    set({
      gameState,
      liveGameState: gameState,
      initialGameState: gameState,
      aiPlayerIds,
      lastPlayerNames: [...playerNames],
      lastAiPlayerIds: [...aiPlayerIds],
      lastExpansionRules: expansionRules,
      lastVictoryPointTarget: gameState.victoryPointTarget,
      lastPlacedSettlementVertexId: null,
      selectedAction: null,
      isAIThinking: false,
      isReplayMode: false,
      timelineIndex: null,
      lastDebugMessage: null,
    });
    setTimeout(() => runAITurnsAsync(get, set), 0);
  },

  restartGame: () => {
    const { lastPlayerNames, lastAiPlayerIds, lastExpansionRules, lastVictoryPointTarget } = get();
    if (lastPlayerNames.length === 0) return;
    const configs = buildPlayerConfigs(lastPlayerNames);
    const seed = Math.floor(Math.random() * 2147483647);
    const gameState = createInitialGameState(configs, seed, lastExpansionRules, lastVictoryPointTarget);
    set({
      gameState,
      liveGameState: gameState,
      initialGameState: gameState,
      aiPlayerIds: [...lastAiPlayerIds],
      lastPlacedSettlementVertexId: null,
      selectedAction: null,
      isAIThinking: false,
      isReplayMode: false,
      timelineIndex: null,
      lastDebugMessage: null,
    });
    setTimeout(() => runAITurnsAsync(get, set), 0);
  },

  dispatch: (action: GameAction) => {
    if (get().isReplayMode) return;
    get().dispatchLive(action);
  },

  dispatchLive: (action: GameAction) => {
    const { liveGameState, aiPlayerIds, isReplayMode } = get();
    if (!liveGameState || isReplayMode) return;

    const newLiveState = dispatchAction(action, liveGameState);
    set({ liveGameState: newLiveState, gameState: newLiveState });

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
    const { gameState, lastPlacedSettlementVertexId, isReplayMode } = get();
    if (!gameState || isReplayMode) return { vertices: [], edges: [] };
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player) return { vertices: [], edges: [] };

    const isSetup = gameState.phase === 'setup';
    if (isSetup) {
      const settlementsPlaced = 5 - player.settlements;
      const roadsPlaced = 15 - player.roads;
      const needsRoad = settlementsPlaced > roadsPlaced;
      if (!needsRoad) {
        return { vertices: getValidSettlementPlacements(gameState.board, player.id, true), edges: [] };
      }
      return {
        vertices: [],
        edges: getValidRoadPlacements(gameState.board, player.id, true, lastPlacedSettlementVertexId ?? undefined),
      };
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

  setTimelineIndex: (index: number | null) => {
    if (index === null) {
      get().exitReplayMode();
      return;
    }

    const { liveGameState, initialGameState } = get();
    if (!liveGameState || !initialGameState) return;

    const boundedIndex = Math.max(0, Math.min(index, liveGameState.actionLog.length));
    if (boundedIndex >= liveGameState.actionLog.length) {
      get().exitReplayMode();
      return;
    }

    const replayedState = replayFromLog(initialGameState, liveGameState.actionLog.slice(0, boundedIndex));
    set({
      gameState: replayedState,
      isReplayMode: true,
      timelineIndex: boundedIndex,
      selectedAction: null,
      lastPlacedSettlementVertexId: null,
      isAIThinking: false,
    });
  },

  exitReplayMode: () => {
    const { liveGameState } = get();
    if (!liveGameState) return;
    set({ gameState: liveGameState, isReplayMode: false, timelineIndex: null });
  },

  resumeLiveFromReplay: () => {
    const { isReplayMode, timelineIndex, liveGameState, initialGameState, aiPlayerIds } = get();
    if (!isReplayMode || timelineIndex === null || !liveGameState || !initialGameState) return;

    const resumedState = replayFromLog(initialGameState, liveGameState.actionLog.slice(0, timelineIndex));
    set({
      gameState: resumedState,
      liveGameState: resumedState,
      isReplayMode: false,
      timelineIndex: null,
      selectedAction: null,
      lastPlacedSettlementVertexId: null,
    });

    const currentPlayer = resumedState.players[resumedState.currentPlayerIndex];
    if (currentPlayer && aiPlayerIds.includes(currentPlayer.id)) {
      setTimeout(() => runAITurnsAsync(get, set), 0);
    }
  },

  runDebugCommand: (input: string) => {
    const { debugEnabled, liveGameState, isReplayMode } = get();
    if (!debugEnabled) return { ok: false, message: 'Debug tools are disabled in this build.' };
    if (!liveGameState) return { ok: false, message: 'No active game.' };
    if (isReplayMode) return { ok: false, message: 'Exit replay mode before running debug commands.' };

    const parsed = parseDebugCommand(input);
    if (!parsed.ok) return { ok: false, message: parsed.message };
    const validationError = validateDebugCommandForState(liveGameState, parsed.command);
    if (validationError) return { ok: false, message: validationError };

    const result = executeDebugCommand(liveGameState, parsed.command);
    if (!result.ok) return { ok: false, message: result.message };

    const rebasedState = withClearedActionLog(result.state);
    set({
      gameState: rebasedState,
      liveGameState: rebasedState,
      initialGameState: rebasedState,
      lastExpansionRules: rebasedState.expansionRules,
      lastVictoryPointTarget: rebasedState.victoryPointTarget,
      isReplayMode: false,
      timelineIndex: null,
      selectedAction: null,
      lastPlacedSettlementVertexId: null,
      isAIThinking: false,
      lastDebugMessage: result.message,
    });
    return { ok: true, message: result.message };
  },

  saveScenario: (name: string) => {
    const { liveGameState, initialGameState, savedScenarios, aiPlayerIds } = get();
    if (!liveGameState || !initialGameState) return { ok: false, message: 'No active game.' };

    const snapshot = makeScenarioSnapshot(name, liveGameState, initialGameState, aiPlayerIds);
    const nextScenarios = [snapshot, ...savedScenarios];
    persistSavedScenarios(nextScenarios);
    set({ savedScenarios: nextScenarios, lastDebugMessage: `Saved scenario: ${snapshot.name}` });
    return { ok: true, message: `Saved scenario: ${snapshot.name}`, id: snapshot.id };
  },

  loadScenario: (id: string) => {
    const snapshot = get().savedScenarios.find(s => s.id === id);
    if (!snapshot) return { ok: false, message: 'Scenario not found.' };

    const state = deserializeState(snapshot.stateJson);
    const initialState = deserializeState(snapshot.initialStateJson);

    set({
      gameState: state,
      liveGameState: state,
      initialGameState: initialState,
      aiPlayerIds: [...snapshot.aiPlayerIds],
      lastAiPlayerIds: [...snapshot.aiPlayerIds],
      lastExpansionRules: state.expansionRules,
      lastVictoryPointTarget: state.victoryPointTarget,
      lastPlayerNames: state.players.map(p => p.name),
      isReplayMode: false,
      timelineIndex: null,
      selectedAction: null,
      lastPlacedSettlementVertexId: null,
      isAIThinking: false,
      lastDebugMessage: `Loaded scenario: ${snapshot.name}`,
    });
    return { ok: true, message: `Loaded scenario: ${snapshot.name}` };
  },

  importScenario: (json: string) => {
    const parsed = parseScenarioImport(json);
    if (!parsed.ok) return { ok: false, message: parsed.message };

    const snapshot = parsed.snapshot;
    const deduped = get().savedScenarios.filter(s => s.id !== snapshot.id);
    const nextScenarios = [snapshot, ...deduped];
    persistSavedScenarios(nextScenarios);
    set({ savedScenarios: nextScenarios, lastDebugMessage: `Imported scenario: ${snapshot.name}` });
    return { ok: true, message: `Imported scenario: ${snapshot.name}`, id: snapshot.id };
  },

  exportScenario: (id: string) => {
    const snapshot = get().savedScenarios.find(s => s.id === id);
    if (!snapshot) return null;
    return JSON.stringify(snapshot, null, 2);
  },

  deleteScenario: (id: string) => {
    const nextScenarios = get().savedScenarios.filter(s => s.id !== id);
    persistSavedScenarios(nextScenarios);
    set({ savedScenarios: nextScenarios });
  },

  dismissCoachmark: (key: keyof OnboardingSeen) => {
    const current = get().onboardingSeen;
    const next = { ...current, [key]: true };
    persistOnboardingSeen(next);
    set({ onboardingSeen: next });
  },

  resetOnboarding: () => {
    persistOnboardingSeen(DEFAULT_ONBOARDING_SEEN);
    set({ onboardingSeen: DEFAULT_ONBOARDING_SEEN });
  },
}));

async function runAITurnsAsync(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void
): Promise<void> {
  const { aiPlayerIds } = get();
  let maxCycles = 200;

  while (maxCycles-- > 0) {
    const { liveGameState, isReplayMode } = get();
    if (!liveGameState || liveGameState.phase === 'finished' || isReplayMode) break;

    const currentPlayer = liveGameState.players[liveGameState.currentPlayerIndex];
    if (!currentPlayer) break;

    if (liveGameState.turnPhase === 'discarding') {
      const nextDiscardAI = liveGameState.pendingDiscards.find(id => aiPlayerIds.includes(id));
      if (nextDiscardAI) {
        const discardPlayer = liveGameState.players.find(p => p.id === nextDiscardAI);
        const stateWithMsg = { ...liveGameState, aiMessage: `${discardPlayer?.name ?? 'AI'} is discarding...` };
        applyLiveState(get, set, stateWithMsg, { isAIThinking: true });
        await delayMs(AI_ACTION_DELAY_MS);
        const { liveGameState: current, isReplayMode: nowReplay } = get();
        if (!current || nowReplay) break;
        const newState = runAITurn(current, nextDiscardAI, (action, s) => dispatchAction(action, s));
        applyLiveState(get, set, newState);
        continue;
      }
      break;
    }

    if (!aiPlayerIds.includes(currentPlayer.id)) {
      set({ isAIThinking: false });
      break;
    }

    set({ isAIThinking: true });
    const stateWithThinking = { ...liveGameState, aiMessage: `${currentPlayer.name} is thinking...` };
    applyLiveState(get, set, stateWithThinking);
    await delayMs(AI_ACTION_DELAY_MS);

    const { liveGameState: current, isReplayMode: nowReplay } = get();
    if (!current || nowReplay) break;

    const action = getAIAction(current, currentPlayer.id);
    if (!action) {
      set({ isAIThinking: false });
      break;
    }

    const newState = dispatchAction(action, current);

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
            const gainStr = Object.entries(gains)
              .filter(([, v]) => (v ?? 0) > 0)
              .map(([r, v]) => `${v} ${r}`)
              .join(', ');
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

    applyLiveState(get, set, { ...newState, aiMessage: msg });
    const pauseMs = action.type === 'ROLL_DICE' ? AI_ROLL_DISPLAY_MS : AI_ACTION_DELAY_MS;
    await delayMs(pauseMs);
  }

  set({ isAIThinking: false });
}
