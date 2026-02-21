import type { GameAction, GameState } from '../state/gameState';
import type { DevelopmentCardType, ResourceType } from '../state/playerState';

export type DebugCommand =
  | { type: 'give'; playerId: string; resource: ResourceType; count: number }
  | { type: 'setvp'; playerId: string; vp: number }
  | { type: 'roll'; total: number }
  | { type: 'devcard'; playerId: string; cardType: DevelopmentCardType }
  | { type: 'nextphase' }
  | { type: 'preset'; name: 'robber-test' | 'trade-test' | 'endgame-test' };

export type ParsedDebugCommand =
  | { ok: true; command: DebugCommand }
  | { ok: false; message: string };

export type DebugCommandExecutionResult =
  | { ok: true; state: GameState; message: string }
  | { ok: false; message: string };

export type ScenarioSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  version: 1;
  stateJson: string;
  initialStateJson: string;
  actionLog: GameAction[];
  aiPlayerIds: string[];
};

export type OnboardingSeen = {
  startScreen: boolean;
  firstTurn: boolean;
  buildPhase: boolean;
  devCards: boolean;
};
