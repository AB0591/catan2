import type { GameState } from './gameState';
import type { PlayerColor } from './playerState';
import { createPlayer, calculateVictoryPoints } from './playerState';
import { createBoardState } from './boardState';
import { createBoard } from '../engine/board';
import type { Port } from './boardState';
import type { DevelopmentCardType } from './playerState';
import { createStandardPorts } from '../engine/trading/tradingActions';

// Mulberry32 seeded RNG (same as board)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard dev card deck: 14 knight, 5 VP, 2 road building, 2 year of plenty, 2 monopoly
function createDevCardDeck(rng: () => number): DevelopmentCardType[] {
  const deck: DevelopmentCardType[] = [
    ...Array(14).fill('knight'),
    ...Array(5).fill('victoryPoint'),
    ...Array(2).fill('roadBuilding'),
    ...Array(2).fill('yearOfPlenty'),
    ...Array(2).fill('monopoly'),
  ];
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export type PlayerConfig = {
  id: string;
  name: string;
  color: PlayerColor;
};

export function createInitialGameState(
  playerConfigs: PlayerConfig[],
  seed: number
): GameState {
  const rng = mulberry32(seed);
  const board = createBoard(seed);
  const ports: Port[] = createStandardPorts(board.hexes, board.vertices);
  const boardState = createBoardState(board, ports);
  const players = playerConfigs.map(p => createPlayer(p.id, p.name, p.color));
  const devCardDeck = createDevCardDeck(rng);

  // Setup order: 1,2,3,4,4,3,2,1 (snake draft)
  const forward = players.map((_, i) => i);
  const backward = [...forward].reverse();
  const setupPlayerOrder = [...forward, ...backward];

  return {
    id: `game_${seed}_${Date.now()}`,
    phase: 'setup',
    turnPhase: 'setupPlacement',
    players,
    currentPlayerIndex: 0,
    board: boardState,
    devCardDeck,
    lastDiceRoll: null,
    actionLog: [],
    setupRound: 0,
    setupPlayerOrder,
    setupOrderIndex: 0,
    winner: null,
    seed,
    longestRoadLength: 0,
    largestArmySize: 0,
    pendingDiscards: [],
    currentTurn: 0,
    lastDistribution: null,
    lastSteal: null,
    aiMessage: null,
  };
}

export function serializeGameState(state: GameState): string {
  // BoardGraph contains Maps — convert to serializable form
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

export function getVictoryPoints(state: GameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;
  return calculateVictoryPoints(player);
}
