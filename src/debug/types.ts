import type { KnightLevel } from '../state/boardState';
import type {
  GameAction,
  GameState,
  ProgressCardType,
  ProgressDeckType,
  TurnPhase,
} from '../state/gameState';
import type {
  CommodityType,
  DevelopmentCardType,
  ImprovementTrack,
  ResourceType,
} from '../state/playerState';

export type DebugAwardType = 'largest-army' | 'longest-road';
export type DebugCkBarbarianAction = 'set' | 'advance' | 'attack';
export type DebugCkKnightAction = 'add' | 'activate' | 'promote' | 'move';
export type DebugCkWallAction = 'add' | 'remove';

export type DebugCommand =
  | { type: 'help' }
  | { type: 'give'; playerId: string; resource: ResourceType; count: number }
  | { type: 'take'; playerId: string; resource: ResourceType; count: number }
  | { type: 'commodity'; playerId: string; commodity: CommodityType; count: number }
  | { type: 'setvp'; playerId: string; vp: number }
  | { type: 'setturn'; playerId: string }
  | { type: 'setphase'; phase: TurnPhase }
  | { type: 'roll'; total: number }
  | { type: 'state'; playerId?: string }
  | { type: 'devcard'; playerId: string; cardType: DevelopmentCardType; count: number }
  | { type: 'robber'; q: number; r: number }
  | { type: 'award'; award: DebugAwardType; playerId: string }
  | { type: 'ck-improve'; playerId: string; track: ImprovementTrack; level: number }
  | { type: 'ck-progress'; playerId: string; cardType: ProgressCardType; count: number }
  | { type: 'ck-barb'; action: DebugCkBarbarianAction; value?: number }
  | {
      type: 'ck-knight';
      action: DebugCkKnightAction;
      playerId?: string;
      knightId?: string;
      vertexId?: string;
      toVertexId?: string;
      level?: KnightLevel;
      active?: boolean;
    }
  | {
      type: 'ck-wall';
      action: DebugCkWallAction;
      playerId?: string;
      cityVertexId: string;
    }
  | { type: 'ck-metropolis'; track: ProgressDeckType; playerId: string; cityVertexId: string }
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
