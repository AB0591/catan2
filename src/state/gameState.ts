import type { PlayerState } from './playerState';
import type { BoardState } from './boardState';
import type { ResourceType, DevelopmentCardType } from './playerState';

export type GamePhase =
  | 'setup'           // initial placement
  | 'playing'         // main game
  | 'finished';       // game over

export type TurnPhase =
  | 'preRoll'         // before dice roll
  | 'robber'          // moving robber after 7
  | 'postRoll'        // after roll, before end turn (trade/build)
  | 'setupPlacement'  // placing initial settlements/roads
  | 'stealing'        // choosing a player to steal from
  | 'discarding';     // players with >7 cards must discard

export type DiceRoll = {
  die1: number;
  die2: number;
  total: number;
};

export type ActionType =
  | 'ROLL_DICE'
  | 'PLACE_SETTLEMENT'
  | 'PLACE_ROAD'
  | 'PLACE_CITY'
  | 'MOVE_ROBBER'
  | 'STEAL_RESOURCE'
  | 'BUILD_SETTLEMENT'
  | 'BUILD_ROAD'
  | 'BUILD_CITY'
  | 'BUY_DEVELOPMENT_CARD'
  | 'PLAY_KNIGHT'
  | 'PLAY_ROAD_BUILDING'
  | 'PLAY_YEAR_OF_PLENTY'
  | 'PLAY_MONOPOLY'
  | 'TRADE_BANK'
  | 'TRADE_PORT'
  | 'TRADE_PLAYER'
  | 'DISCARD_RESOURCES'
  | 'END_TURN';

export type GameAction = {
  type: ActionType;
  playerId: string;
  payload: Record<string, unknown>;
  timestamp: number;
};

export type GameState = {
  id: string;
  phase: GamePhase;
  turnPhase: TurnPhase;
  players: PlayerState[];
  currentPlayerIndex: number;
  board: BoardState;
  devCardDeck: DevelopmentCardType[];   // remaining deck
  lastDiceRoll: DiceRoll | null;
  actionLog: GameAction[];
  setupRound: number;   // 0 = first round, 1 = second round (snake)
  setupPlayerOrder: number[]; // indices for setup placement
  setupOrderIndex: number;    // current index in setupPlayerOrder
  winner: string | null;      // playerId of winner, null if not finished
  seed: number;               // RNG seed for reproducibility
  longestRoadLength: number;
  largestArmySize: number;
  pendingDiscards: string[];  // playerIds who still need to discard (after rolling 7)
};

// Suppress unused import warning — ResourceType is re-exported via index
export type { ResourceType };
