import { dispatchAction } from '../engine/turnManager/turnManager';
import { advanceBarbariansAfterRoll } from '../engine/citiesAndKnights/barbarianActions';
import { updateMetropolises } from '../engine/citiesAndKnights/ckMeta';
import { updateVictoryState } from '../engine/victory/victoryEngine';
import type { KnightLevel, KnightState } from '../state/boardState';
import type {
  GameState,
  ProgressCard,
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
import type {
  DebugCommand,
  DebugCommandExecutionResult,
  ParsedDebugCommand,
} from './types';

export type DebugCommandGroup = {
  label: string;
  commands: string[];
};

const MAX_PROGRESS_HAND_SIZE = 4;

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const COMMODITIES: CommodityType[] = ['cloth', 'coin', 'paper'];
const DEV_CARD_TYPES: DevelopmentCardType[] = ['knight', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'];
const IMPROVEMENT_TRACKS: ImprovementTrack[] = ['politics', 'science', 'trade'];
const TURN_PHASES: TurnPhase[] = ['preRoll', 'robber', 'postRoll', 'setupPlacement', 'stealing', 'discarding'];
const PROGRESS_DECKS: ProgressDeckType[] = ['politics', 'science', 'trade'];
const PROGRESS_CARD_TYPES: ProgressCardType[] = [
  'warlord',
  'constitution',
  'spy',
  'deserter',
  'irrigation',
  'mining',
  'engineer',
  'chemist',
  'tradeMonopoly',
  'resourceMonopoly',
  'merchantGift',
  'merchantFleet',
];

const PROGRESS_CARD_TO_DECK: Record<ProgressCardType, ProgressDeckType> = {
  warlord: 'politics',
  constitution: 'politics',
  spy: 'politics',
  deserter: 'politics',
  irrigation: 'science',
  mining: 'science',
  engineer: 'science',
  chemist: 'science',
  tradeMonopoly: 'trade',
  resourceMonopoly: 'trade',
  merchantGift: 'trade',
  merchantFleet: 'trade',
};

const BASE_ONLY_COMMANDS = new Set<DebugCommand['type']>(['devcard', 'robber', 'award']);
const CK_ONLY_COMMANDS = new Set<DebugCommand['type']>([
  'commodity',
  'ck-improve',
  'ck-progress',
  'ck-barb',
  'ck-knight',
  'ck-wall',
  'ck-metropolis',
]);

const COMMAND_USAGE: Record<string, string> = {
  help: 'help',
  give: 'give <playerId> <resource> <count>',
  take: 'take <playerId> <resource> <count>',
  commodity: 'commodity <playerId> <cloth|coin|paper> <count>',
  setvp: 'setvp <playerId> <vp>',
  setturn: 'setturn <playerId>',
  setphase: 'setphase <preRoll|robber|postRoll|setupPlacement|stealing|discarding>',
  roll: 'roll <2-12>',
  state: 'state [playerId]',
  devcard: 'devcard <playerId> <type> [count]',
  robber: 'robber <q> <r>',
  award: 'award <largest-army|longest-road> <playerId>',
  'ck-improve': 'ck-improve <playerId> <politics|science|trade> <level>',
  'ck-progress': 'ck-progress <playerId> <cardType> [count]',
  'ck-barb': 'ck-barb <set|advance|attack> [value]',
  'ck-knight': 'ck-knight <add|activate|promote|move> ...',
  'ck-wall': 'ck-wall <add|remove> ...',
  'ck-metropolis': 'ck-metropolis <politics|science|trade> <playerId> <cityVertexId>',
  nextphase: 'nextphase',
  preset: 'preset <robber-test|trade-test|endgame-test>',
};

function parseIntStrict(value: string): number | null {
  if (!/^-?\d+$/.test(value)) return null;
  return Number(value);
}

function parsePositiveInt(value: string): number | null {
  const parsed = parseIntStrict(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
}

function parseNonNegativeInt(value: string): number | null {
  const parsed = parseIntStrict(value);
  if (parsed === null || parsed < 0) return null;
  return parsed;
}

function parseBooleanLiteral(value: string): boolean | null {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return null;
}

function isResourceType(value: string): value is ResourceType {
  return RESOURCES.includes(value as ResourceType);
}

function isCommodityType(value: string): value is CommodityType {
  return COMMODITIES.includes(value as CommodityType);
}

function isDevCardType(value: string): value is DevelopmentCardType {
  return DEV_CARD_TYPES.includes(value as DevelopmentCardType);
}

function isImprovementTrack(value: string): value is ImprovementTrack {
  return IMPROVEMENT_TRACKS.includes(value as ImprovementTrack);
}

function isTurnPhase(value: string): value is TurnPhase {
  return TURN_PHASES.includes(value as TurnPhase);
}

function isProgressCardType(value: string): value is ProgressCardType {
  return PROGRESS_CARD_TYPES.includes(value as ProgressCardType);
}

function isProgressDeckType(value: string): value is ProgressDeckType {
  return PROGRESS_DECKS.includes(value as ProgressDeckType);
}

function formatCards<T extends string>(cards: Record<T, number>): string {
  return (Object.entries(cards) as Array<[T, number]>)
    .map(([key, value]) => `${key}:${value}`)
    .join(' ');
}

function renderStateSummary(state: GameState, playerId?: string): string {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const header = `turn=${state.currentTurn} phase=${state.phase}/${state.turnPhase} current=${currentPlayer?.id ?? 'unknown'}`;

  if (playerId) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return `Player not found: ${playerId}`;
    const base = `${player.id} (${player.name}) vp=${player.victoryPoints} resources=[${formatCards(player.resources)}]`;
    if (state.expansionRules !== 'cities_and_knights' || !state.ck) {
      return `${header}\n${base}`;
    }
    const progressCount = state.ck.progressHands[player.id]?.length ?? 0;
    return `${header}\n${base} commodities=[${formatCards(player.commodities)}] improvements=[politics:${player.cityImprovements.politics} science:${player.cityImprovements.science} trade:${player.cityImprovements.trade}] progress=${progressCount}`;
  }

  const lines = state.players.map(player => {
    const base = `- ${player.id} vp=${player.victoryPoints} res=[${formatCards(player.resources)}]`;
    if (state.expansionRules !== 'cities_and_knights' || !state.ck) return base;
    const progressCount = state.ck.progressHands[player.id]?.length ?? 0;
    return `${base} com=[${formatCards(player.commodities)}] imp=[P:${player.cityImprovements.politics} S:${player.cityImprovements.science} T:${player.cityImprovements.trade}] prog=${progressCount}`;
  });

  if (state.expansionRules !== 'cities_and_knights' || !state.ck) {
    return `${header}\n${lines.join('\n')}`;
  }

  const barbarians = `barbarians=${state.ck.barbarians.position}/${state.ck.barbarians.stepsToAttack}`;
  return `${header} ${barbarians}\n${lines.join('\n')}`;
}

function renderHelpText(state: GameState): string {
  const groups = getAvailableDebugCommandGroups(state);
  const lines: string[] = [];
  for (const group of groups) {
    lines.push(`${group.label}:`);
    for (const command of group.commands) {
      lines.push(`  - ${COMMAND_USAGE[command] ?? command}`);
    }
  }
  return lines.join('\n');
}

function withUpdatedVictoryState(state: GameState): GameState {
  if (state.phase === 'playing' || state.phase === 'finished') {
    return updateVictoryState(state);
  }
  return state;
}

function findDice(total: number): { die1: number; die2: number } {
  for (let die1 = 1; die1 <= 6; die1++) {
    for (let die2 = 1; die2 <= 6; die2++) {
      if (die1 + die2 === total) return { die1, die2 };
    }
  }
  return { die1: 1, die2: 1 };
}

function findPlayerIndex(state: GameState, playerId: string): number {
  return state.players.findIndex(p => p.id === playerId);
}

function playerExists(state: GameState, playerId: string): boolean {
  return findPlayerIndex(state, playerId) !== -1;
}

function findKnightAtVertex(state: GameState, vertexId: string): KnightState | null {
  for (const knight of Object.values(state.board.knights)) {
    if (knight.vertexId === vertexId) return knight;
  }
  return null;
}

function nextDebugKnightId(state: GameState, playerId: string): string {
  let suffix = Object.keys(state.board.knights).length;
  while (true) {
    const candidate = `debug_kn_${playerId}_${state.currentTurn}_${suffix}`;
    if (!state.board.knights[candidate]) return candidate;
    suffix += 1;
  }
}

function makeProgressCards(state: GameState, cardType: ProgressCardType, count: number): ProgressCard[] {
  const deck = PROGRESS_CARD_TO_DECK[cardType];
  const stamp = `${Date.now()}_${state.currentTurn}_${Math.floor(Math.random() * 100000)}`;
  return Array.from({ length: count }, (_, idx) => ({
    id: `debug_${deck}_${cardType}_${stamp}_${idx}`,
    deck,
    type: cardType,
  }));
}

function forceBarbarianAttack(state: GameState): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const steps = state.ck.barbarians.stepsToAttack;
  const primed: GameState = {
    ...state,
    ck: {
      ...state.ck,
      barbarians: {
        ...state.ck.barbarians,
        position: Math.max(0, steps - 1),
      },
    },
  };
  return advanceBarbariansAfterRoll(primed);
}

function applySetVp(state: GameState, playerId: string, targetVp: number): GameState | null {
  const playerIndex = findPlayerIndex(state, playerId);
  if (playerIndex === -1) return null;
  const player = state.players[playerIndex];

  const settlementsPlaced = 5 - player.settlements;
  const citiesPlaced = 4 - player.cities;
  const specialPoints = (player.hasLargestArmy ? 2 : 0) + (player.hasLongestRoad ? 2 : 0);
  const structuralVp = settlementsPlaced + citiesPlaced * 2 + specialPoints;
  const neededVpCards = Math.max(0, targetVp - structuralVp);

  const nonVpCards = player.developmentCards.filter(c => c.type !== 'victoryPoint');
  const vpCards = Array.from({ length: neededVpCards }, () => ({
    type: 'victoryPoint' as const,
    playedThisTurn: false,
    turnBought: Math.max(0, state.currentTurn - 1),
  }));

  const updatedPlayers = state.players.map((p, i) => (
    i === playerIndex ? { ...p, developmentCards: [...nonVpCards, ...vpCards] } : p
  ));

  return withUpdatedVictoryState({ ...state, players: updatedPlayers });
}

function applyPreset(state: GameState, preset: 'robber-test' | 'trade-test' | 'endgame-test'): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) return state;

  if (preset === 'trade-test') {
    const updatedPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? { ...p, resources: { ...p.resources, wood: 4, brick: 2, sheep: 1, wheat: 1, ore: 0 } }
        : p
    );
    return withUpdatedVictoryState({
      ...state,
      phase: 'playing',
      turnPhase: 'postRoll',
      players: updatedPlayers,
    });
  }

  if (preset === 'endgame-test') {
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? {
          ...p,
          settlements: 1,
          cities: 2,
          resources: { ...p.resources, ore: 3, wheat: 2, wood: 1, brick: 1, sheep: 1 },
        }
        : p
    );
    return withUpdatedVictoryState({
      ...state,
      phase: 'playing',
      turnPhase: 'postRoll',
      players: updatedPlayers,
    });
  }

  const nonCurrent = state.players.find(p => p.id !== currentPlayer.id);
  if (!nonCurrent) return state;
  const targetHex = state.board.graph.hexes.find(
    h => h.coord.q !== state.board.robberHex.q || h.coord.r !== state.board.robberHex.r
  );
  if (!targetHex) return state;

  const targetVertexId = Array.from(state.board.graph.vertices.entries()).find(([, vertex]) =>
    vertex.adjacentHexes.some(h => h.q === targetHex.coord.q && h.r === targetHex.coord.r)
  )?.[0];

  if (!targetVertexId) return state;

  const updatedPlayers = state.players.map(p =>
    p.id === nonCurrent.id
      ? { ...p, resources: { ...p.resources, wood: 2, brick: 2, sheep: 1, wheat: 1, ore: 1 } }
      : p
  );

  return withUpdatedVictoryState({
    ...state,
    phase: 'playing',
    turnPhase: 'robber',
    board: {
      ...state.board,
      buildings: {
        ...state.board.buildings,
        [targetVertexId]: { type: 'settlement', playerId: nonCurrent.id },
      },
    },
    players: updatedPlayers,
  });
}

export function getAvailableDebugCommandGroups(state: GameState): DebugCommandGroup[] {
  const groups: DebugCommandGroup[] = [
    {
      label: 'General',
      commands: ['help', 'give', 'take', 'setvp', 'setturn', 'setphase', 'roll', 'nextphase', 'state', 'preset'],
    },
  ];

  if (state.expansionRules === 'base') {
    groups.push({
      label: 'Base Catan',
      commands: ['devcard', 'robber', 'award'],
    });
  }

  if (state.expansionRules === 'cities_and_knights') {
    groups.push({
      label: 'Cities & Knights',
      commands: ['commodity', 'ck-improve', 'ck-progress', 'ck-barb', 'ck-knight', 'ck-wall', 'ck-metropolis'],
    });
  }

  return groups;
}

export function getAvailableDebugCommands(state: GameState): string[] {
  return getAvailableDebugCommandGroups(state).flatMap(group => group.commands);
}

export function validateDebugCommandForState(state: GameState, command: DebugCommand): string | null {
  if (BASE_ONLY_COMMANDS.has(command.type) && state.expansionRules !== 'base') {
    return `${command.type} is only available in base Catan mode.`;
  }
  if (CK_ONLY_COMMANDS.has(command.type) && state.expansionRules !== 'cities_and_knights') {
    return `${command.type} is only available in Cities & Knights mode.`;
  }

  if (command.type === 'state' && command.playerId && !playerExists(state, command.playerId)) {
    return `Player not found: ${command.playerId}`;
  }

  if (command.type === 'robber') {
    const hexExists = state.board.graph.hexes.some(hex => hex.coord.q === command.q && hex.coord.r === command.r);
    if (!hexExists) return `Hex not found at (${command.q}, ${command.r})`;
  }

  return null;
}

export function parseDebugCommand(input: string): ParsedDebugCommand {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: 'Empty command' };

  const parts = trimmed.split(/\s+/);
  const [cmd, ...rest] = parts;

  if (cmd === 'help') {
    if (rest.length !== 0) return { ok: false, message: 'Usage: help' };
    return { ok: true, command: { type: 'help' } };
  }

  if (cmd === 'give') {
    if (rest.length !== 3) return { ok: false, message: 'Usage: give <playerId> <resource> <count>' };
    const [playerId, resource, countRaw] = rest;
    if (!isResourceType(resource)) return { ok: false, message: `Invalid resource: ${resource}` };
    const count = parsePositiveInt(countRaw);
    if (count === null) return { ok: false, message: 'Count must be a positive integer' };
    return { ok: true, command: { type: 'give', playerId, resource, count } };
  }

  if (cmd === 'take') {
    if (rest.length !== 3) return { ok: false, message: 'Usage: take <playerId> <resource> <count>' };
    const [playerId, resource, countRaw] = rest;
    if (!isResourceType(resource)) return { ok: false, message: `Invalid resource: ${resource}` };
    const count = parsePositiveInt(countRaw);
    if (count === null) return { ok: false, message: 'Count must be a positive integer' };
    return { ok: true, command: { type: 'take', playerId, resource, count } };
  }

  if (cmd === 'commodity') {
    if (rest.length !== 3) return { ok: false, message: 'Usage: commodity <playerId> <cloth|coin|paper> <count>' };
    const [playerId, commodity, countRaw] = rest;
    if (!isCommodityType(commodity)) return { ok: false, message: `Invalid commodity: ${commodity}` };
    const count = parsePositiveInt(countRaw);
    if (count === null) return { ok: false, message: 'Count must be a positive integer' };
    return { ok: true, command: { type: 'commodity', playerId, commodity, count } };
  }

  if (cmd === 'setvp') {
    if (rest.length !== 2) return { ok: false, message: 'Usage: setvp <playerId> <vp>' };
    const [playerId, vpRaw] = rest;
    const vp = parseIntStrict(vpRaw);
    if (vp === null || vp < 0 || vp > 20) return { ok: false, message: 'VP must be an integer between 0 and 20' };
    return { ok: true, command: { type: 'setvp', playerId, vp } };
  }

  if (cmd === 'setturn') {
    if (rest.length !== 1) return { ok: false, message: 'Usage: setturn <playerId>' };
    return { ok: true, command: { type: 'setturn', playerId: rest[0] } };
  }

  if (cmd === 'setphase') {
    if (rest.length !== 1) return { ok: false, message: 'Usage: setphase <preRoll|robber|postRoll|setupPlacement|stealing|discarding>' };
    const phase = rest[0];
    if (!isTurnPhase(phase)) return { ok: false, message: `Invalid phase: ${phase}` };
    return { ok: true, command: { type: 'setphase', phase } };
  }

  if (cmd === 'roll') {
    if (rest.length !== 1) return { ok: false, message: 'Usage: roll <2-12>' };
    const total = parseIntStrict(rest[0]);
    if (total === null || total < 2 || total > 12) return { ok: false, message: 'Roll total must be between 2 and 12' };
    return { ok: true, command: { type: 'roll', total } };
  }

  if (cmd === 'state') {
    if (rest.length > 1) return { ok: false, message: 'Usage: state [playerId]' };
    return { ok: true, command: { type: 'state', playerId: rest[0] } };
  }

  if (cmd === 'devcard') {
    if (rest.length < 2 || rest.length > 3) return { ok: false, message: 'Usage: devcard <playerId> <type> [count]' };
    const [playerId, cardType, countRaw] = rest;
    if (!isDevCardType(cardType)) return { ok: false, message: `Invalid dev card type: ${cardType}` };
    const count = countRaw ? parsePositiveInt(countRaw) : 1;
    if (count === null) return { ok: false, message: 'Count must be a positive integer' };
    return { ok: true, command: { type: 'devcard', playerId, cardType, count } };
  }

  if (cmd === 'robber') {
    if (rest.length !== 2) return { ok: false, message: 'Usage: robber <q> <r>' };
    const q = parseIntStrict(rest[0]);
    const r = parseIntStrict(rest[1]);
    if (q === null || r === null) return { ok: false, message: 'q and r must be integers' };
    return { ok: true, command: { type: 'robber', q, r } };
  }

  if (cmd === 'award') {
    if (rest.length !== 2) return { ok: false, message: 'Usage: award <largest-army|longest-road> <playerId>' };
    const [award, playerId] = rest;
    if (award !== 'largest-army' && award !== 'longest-road') {
      return { ok: false, message: `Invalid award type: ${award}` };
    }
    return { ok: true, command: { type: 'award', award, playerId } };
  }

  if (cmd === 'ck-improve') {
    if (rest.length !== 3) return { ok: false, message: 'Usage: ck-improve <playerId> <politics|science|trade> <level>' };
    const [playerId, track, levelRaw] = rest;
    if (!isImprovementTrack(track)) return { ok: false, message: `Invalid improvement track: ${track}` };
    const level = parseIntStrict(levelRaw);
    if (level === null || level < 0 || level > 5) return { ok: false, message: 'Improvement level must be between 0 and 5' };
    return { ok: true, command: { type: 'ck-improve', playerId, track, level } };
  }

  if (cmd === 'ck-progress') {
    if (rest.length < 2 || rest.length > 3) return { ok: false, message: 'Usage: ck-progress <playerId> <cardType> [count]' };
    const [playerId, cardTypeRaw, countRaw] = rest;
    if (!isProgressCardType(cardTypeRaw)) return { ok: false, message: `Invalid progress card type: ${cardTypeRaw}` };
    const count = countRaw ? parsePositiveInt(countRaw) : 1;
    if (count === null) return { ok: false, message: 'Count must be a positive integer' };
    return { ok: true, command: { type: 'ck-progress', playerId, cardType: cardTypeRaw, count } };
  }

  if (cmd === 'ck-barb') {
    if (rest.length < 1) return { ok: false, message: 'Usage: ck-barb <set|advance|attack> [value]' };
    const [action, valueRaw] = rest;
    if (action !== 'set' && action !== 'advance' && action !== 'attack') {
      return { ok: false, message: `Invalid ck-barb action: ${action}` };
    }
    if (action === 'attack') {
      if (rest.length !== 1) return { ok: false, message: 'Usage: ck-barb attack' };
      return { ok: true, command: { type: 'ck-barb', action: 'attack' } };
    }
    if (rest.length !== 2) return { ok: false, message: `Usage: ck-barb ${action} <value>` };
    const value = action === 'set' ? parseNonNegativeInt(valueRaw) : parsePositiveInt(valueRaw);
    if (value === null) return { ok: false, message: 'Barbarian value must be a valid integer for the selected action' };
    return { ok: true, command: { type: 'ck-barb', action, value } };
  }

  if (cmd === 'ck-knight') {
    if (rest.length < 1) return { ok: false, message: 'Usage: ck-knight <add|activate|promote|move> ...' };
    const [action, ...args] = rest;
    if (action !== 'add' && action !== 'activate' && action !== 'promote' && action !== 'move') {
      return { ok: false, message: `Invalid ck-knight action: ${action}` };
    }

    if (action === 'add') {
      if (args.length < 2 || args.length > 4) {
        return { ok: false, message: 'Usage: ck-knight add <playerId> <vertexId> [level] [active]' };
      }
      const [playerId, vertexId, levelOrActive, activeRaw] = args;
      let level: KnightLevel = 1;
      let active = false;

      if (levelOrActive) {
        const parsedLevel = parseIntStrict(levelOrActive);
        if (parsedLevel !== null) {
          if (parsedLevel < 1 || parsedLevel > 3) {
            return { ok: false, message: 'Knight level must be between 1 and 3' };
          }
          level = parsedLevel as KnightLevel;
          if (activeRaw) {
            const parsedActive = parseBooleanLiteral(activeRaw);
            if (parsedActive === null) {
              return { ok: false, message: 'Knight active flag must be true/false or 1/0' };
            }
            active = parsedActive;
          }
        } else {
          const parsedActive = parseBooleanLiteral(levelOrActive);
          if (parsedActive === null || activeRaw) {
            return { ok: false, message: 'Knight active flag must be true/false or 1/0' };
          }
          active = parsedActive;
        }
      }

      return {
        ok: true,
        command: {
          type: 'ck-knight',
          action: 'add',
          playerId,
          vertexId,
          level,
          active,
        },
      };
    }

    if (action === 'activate') {
      if (args.length !== 1) return { ok: false, message: 'Usage: ck-knight activate <knightId>' };
      return { ok: true, command: { type: 'ck-knight', action: 'activate', knightId: args[0] } };
    }

    if (action === 'promote') {
      if (args.length < 1 || args.length > 2) return { ok: false, message: 'Usage: ck-knight promote <knightId> [level]' };
      const level = args[1] ? parseIntStrict(args[1]) : null;
      if (level !== null && (level < 1 || level > 3)) {
        return { ok: false, message: 'Knight level must be between 1 and 3' };
      }
      return {
        ok: true,
        command: {
          type: 'ck-knight',
          action: 'promote',
          knightId: args[0],
          level: (level ?? undefined) as KnightLevel | undefined,
        },
      };
    }

    if (args.length !== 2) return { ok: false, message: 'Usage: ck-knight move <knightId> <toVertexId>' };
    return {
      ok: true,
      command: {
        type: 'ck-knight',
        action: 'move',
        knightId: args[0],
        toVertexId: args[1],
      },
    };
  }

  if (cmd === 'ck-wall') {
    if (rest.length < 1) return { ok: false, message: 'Usage: ck-wall <add|remove> ...' };
    const [action, ...args] = rest;
    if (action !== 'add' && action !== 'remove') return { ok: false, message: `Invalid ck-wall action: ${action}` };

    if (action === 'add') {
      if (args.length !== 2) return { ok: false, message: 'Usage: ck-wall add <playerId> <cityVertexId>' };
      const [playerId, cityVertexId] = args;
      return { ok: true, command: { type: 'ck-wall', action: 'add', playerId, cityVertexId } };
    }

    if (args.length !== 1) return { ok: false, message: 'Usage: ck-wall remove <cityVertexId>' };
    return { ok: true, command: { type: 'ck-wall', action: 'remove', cityVertexId: args[0] } };
  }

  if (cmd === 'ck-metropolis') {
    if (rest.length !== 3) return { ok: false, message: 'Usage: ck-metropolis <politics|science|trade> <playerId> <cityVertexId>' };
    const [track, playerId, cityVertexId] = rest;
    if (!isProgressDeckType(track)) return { ok: false, message: `Invalid metropolis track: ${track}` };
    return { ok: true, command: { type: 'ck-metropolis', track, playerId, cityVertexId } };
  }

  if (cmd === 'nextphase') {
    if (rest.length !== 0) return { ok: false, message: 'Usage: nextphase' };
    return { ok: true, command: { type: 'nextphase' } };
  }

  if (cmd === 'preset') {
    if (rest.length !== 1) return { ok: false, message: 'Usage: preset <robber-test|trade-test|endgame-test>' };
    const [name] = rest;
    if (name !== 'robber-test' && name !== 'trade-test' && name !== 'endgame-test') {
      return { ok: false, message: `Unknown preset: ${name}` };
    }
    return { ok: true, command: { type: 'preset', name } };
  }

  return { ok: false, message: `Unknown command: ${cmd}` };
}

export function executeDebugCommand(state: GameState, command: DebugCommand): DebugCommandExecutionResult {
  const validationError = validateDebugCommandForState(state, command);
  if (validationError) return { ok: false, message: validationError };

  if (command.type === 'help') {
    return { ok: true, state, message: renderHelpText(state) };
  }

  if (command.type === 'state') {
    return { ok: true, state, message: renderStateSummary(state, command.playerId) };
  }

  if (command.type === 'give') {
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };
    const updatedPlayers = state.players.map((player, index) => (
      index === playerIndex
        ? {
          ...player,
          resources: {
            ...player.resources,
            [command.resource]: player.resources[command.resource] + command.count,
          },
        }
        : player
    ));
    return {
      ok: true,
      state: withUpdatedVictoryState({ ...state, players: updatedPlayers }),
      message: `Added ${command.count} ${command.resource} to ${command.playerId}`,
    };
  }

  if (command.type === 'take') {
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };
    const player = state.players[playerIndex];
    const removed = Math.min(player.resources[command.resource], command.count);
    const updatedPlayers = state.players.map((p, index) => (
      index === playerIndex
        ? {
          ...p,
          resources: {
            ...p.resources,
            [command.resource]: Math.max(0, p.resources[command.resource] - command.count),
          },
        }
        : p
    ));
    return {
      ok: true,
      state: withUpdatedVictoryState({ ...state, players: updatedPlayers }),
      message: `Removed ${removed} ${command.resource} from ${command.playerId}`,
    };
  }

  if (command.type === 'commodity') {
    if (!state.ck) return { ok: false, message: 'Cities & Knights state is not initialized.' };
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };
    const updatedPlayers = state.players.map((player, index) => (
      index === playerIndex
        ? {
          ...player,
          commodities: {
            ...player.commodities,
            [command.commodity]: player.commodities[command.commodity] + command.count,
          },
        }
        : player
    ));
    return {
      ok: true,
      state: withUpdatedVictoryState({ ...state, players: updatedPlayers }),
      message: `Added ${command.count} ${command.commodity} to ${command.playerId}`,
    };
  }

  if (command.type === 'setvp') {
    const updatedState = applySetVp(state, command.playerId, command.vp);
    if (!updatedState) return { ok: false, message: `Player not found: ${command.playerId}` };
    return { ok: true, state: updatedState, message: `Set ${command.playerId} to ${command.vp} VP` };
  }

  if (command.type === 'setturn') {
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };
    return {
      ok: true,
      state: { ...state, currentPlayerIndex: playerIndex },
      message: `Set current turn to ${command.playerId}`,
    };
  }

  if (command.type === 'setphase') {
    const phaseState = {
      ...state,
      phase: command.phase === 'setupPlacement' ? 'setup' : 'playing',
      turnPhase: command.phase,
      winner: command.phase === 'setupPlacement' ? state.winner : null,
    } as GameState;
    return { ok: true, state: phaseState, message: `Set phase to ${phaseState.phase}/${phaseState.turnPhase}` };
  }

  if (command.type === 'roll') {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return { ok: false, message: 'No current player' };
    const { die1, die2 } = findDice(command.total);
    const rolledState = dispatchAction(
      {
        type: 'ROLL_DICE',
        playerId: currentPlayer.id,
        payload: { die1, die2 },
        timestamp: Date.now(),
      },
      { ...state, phase: 'playing' }
    );
    return { ok: true, state: rolledState, message: `Forced roll total ${command.total}` };
  }

  if (command.type === 'devcard') {
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };
    const newCards = Array.from({ length: command.count }, () => ({
      type: command.cardType,
      playedThisTurn: false,
      turnBought: Math.max(0, state.currentTurn - 1),
    }));
    const updatedPlayers = state.players.map((player, index) => (
      index === playerIndex
        ? {
          ...player,
          developmentCards: [...player.developmentCards, ...newCards],
        }
        : player
    ));
    return {
      ok: true,
      state: withUpdatedVictoryState({ ...state, players: updatedPlayers }),
      message: `Gave ${command.count} ${command.cardType} card(s) to ${command.playerId}`,
    };
  }

  if (command.type === 'robber') {
    const hex = state.board.graph.hexes.find(h => h.coord.q === command.q && h.coord.r === command.r);
    if (!hex) return { ok: false, message: `Hex not found at (${command.q}, ${command.r})` };
    return {
      ok: true,
      state: {
        ...state,
        board: {
          ...state.board,
          robberHex: { q: command.q, r: command.r },
        },
      },
      message: `Moved robber to (${command.q}, ${command.r})`,
    };
  }

  if (command.type === 'award') {
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };

    const updatedPlayers = state.players.map(player => {
      if (command.award === 'largest-army') {
        return {
          ...player,
          hasLargestArmy: player.id === command.playerId,
        };
      }
      return {
        ...player,
        hasLongestRoad: player.id === command.playerId,
      };
    });

    const awardedState = {
      ...state,
      players: updatedPlayers,
      largestArmySize: command.award === 'largest-army' ? Math.max(state.largestArmySize, 3) : state.largestArmySize,
      longestRoadLength: command.award === 'longest-road' ? Math.max(state.longestRoadLength, 5) : state.longestRoadLength,
    };

    return {
      ok: true,
      state: withUpdatedVictoryState(awardedState),
      message: `Awarded ${command.award} to ${command.playerId}`,
    };
  }

  if (command.type === 'ck-improve') {
    if (!state.ck) return { ok: false, message: 'Cities & Knights state is not initialized.' };
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };

    const updatedPlayers = state.players.map((player, index) => (
      index === playerIndex
        ? {
          ...player,
          cityImprovements: {
            ...player.cityImprovements,
            [command.track]: command.level,
          },
        }
        : player
    ));

    const updatedState = withUpdatedVictoryState(updateMetropolises({ ...state, players: updatedPlayers }));
    return {
      ok: true,
      state: updatedState,
      message: `Set ${command.playerId} ${command.track} improvement to level ${command.level}`,
    };
  }

  if (command.type === 'ck-progress') {
    if (!state.ck) return { ok: false, message: 'Cities & Knights state is not initialized.' };
    const playerIndex = findPlayerIndex(state, command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };

    const currentHand = state.ck.progressHands[command.playerId] ?? [];
    const availableSlots = Math.max(0, MAX_PROGRESS_HAND_SIZE - currentHand.length);
    if (availableSlots === 0) {
      return { ok: false, message: `${command.playerId} already has the maximum progress hand size (${MAX_PROGRESS_HAND_SIZE}).` };
    }

    const toGrant = Math.min(command.count, availableSlots);
    const cards = makeProgressCards(state, command.cardType, toGrant);

    const updatedState: GameState = {
      ...state,
      ck: {
        ...state.ck,
        progressHands: {
          ...state.ck.progressHands,
          [command.playerId]: [...currentHand, ...cards],
        },
      },
    };

    const overflow = command.count - toGrant;
    return {
      ok: true,
      state: updatedState,
      message: overflow > 0
        ? `Added ${toGrant}/${command.count} ${command.cardType} card(s) to ${command.playerId} (hand cap ${MAX_PROGRESS_HAND_SIZE}).`
        : `Added ${toGrant} ${command.cardType} card(s) to ${command.playerId}`,
    };
  }

  if (command.type === 'ck-barb') {
    if (!state.ck) return { ok: false, message: 'Cities & Knights state is not initialized.' };

    if (command.action === 'attack') {
      const attacked = withUpdatedVictoryState(forceBarbarianAttack(state));
      return { ok: true, state: attacked, message: 'Forced barbarian attack.' };
    }

    if (command.action === 'set') {
      const value = command.value ?? 0;
      const steps = state.ck.barbarians.stepsToAttack;
      if (value >= steps) {
        const attacked = withUpdatedVictoryState(forceBarbarianAttack(state));
        return { ok: true, state: attacked, message: `Set barbarians to attack threshold (${value}) and resolved attack.` };
      }
      const nextState: GameState = {
        ...state,
        ck: {
          ...state.ck,
          barbarians: {
            ...state.ck.barbarians,
            position: value,
          },
          pending: { type: 'NONE', payload: null },
        },
      };
      return { ok: true, state: nextState, message: `Set barbarian track to ${value}` };
    }

    let nextState = state;
    for (let i = 0; i < (command.value ?? 0); i += 1) {
      nextState = advanceBarbariansAfterRoll(nextState);
    }
    return {
      ok: true,
      state: withUpdatedVictoryState(nextState),
      message: `Advanced barbarians by ${command.value ?? 0} step(s).`,
    };
  }

  if (command.type === 'ck-knight') {
    if (!state.ck) return { ok: false, message: 'Cities & Knights state is not initialized.' };

    if (command.action === 'add') {
      if (!command.playerId) return { ok: false, message: 'Usage: ck-knight add <playerId> <vertexId> [level] [active]' };
      if (!command.vertexId) return { ok: false, message: 'Usage: ck-knight add <playerId> <vertexId> [level] [active]' };
      if (!playerExists(state, command.playerId)) return { ok: false, message: `Player not found: ${command.playerId}` };
      if (!state.board.graph.vertices.has(command.vertexId)) return { ok: false, message: `Vertex not found: ${command.vertexId}` };
      if (state.board.buildings[command.vertexId]) return { ok: false, message: `Vertex ${command.vertexId} is occupied by a building.` };
      if (findKnightAtVertex(state, command.vertexId)) return { ok: false, message: `Vertex ${command.vertexId} already has a knight.` };

      const level = command.level ?? 1;
      const knightId = nextDebugKnightId(state, command.playerId);
      const knight: KnightState = {
        id: knightId,
        ownerId: command.playerId,
        vertexId: command.vertexId,
        level,
        active: command.active ?? false,
        hasActedThisTurn: false,
      };

      return {
        ok: true,
        state: {
          ...state,
          board: {
            ...state.board,
            knights: {
              ...state.board.knights,
              [knightId]: knight,
            },
          },
        },
        message: `Added knight ${knightId} at ${command.vertexId}`,
      };
    }

    if (!command.knightId) return { ok: false, message: `Knight id is required for ck-knight ${command.action}` };
    const existingKnight = state.board.knights[command.knightId];
    if (!existingKnight) return { ok: false, message: `Knight not found: ${command.knightId}` };

    if (command.action === 'activate') {
      return {
        ok: true,
        state: {
          ...state,
          board: {
            ...state.board,
            knights: {
              ...state.board.knights,
              [command.knightId]: {
                ...existingKnight,
                active: true,
              },
            },
          },
        },
        message: `Activated knight ${command.knightId}`,
      };
    }

    if (command.action === 'promote') {
      const targetLevel = command.level ?? ((existingKnight.level + 1) as KnightLevel);
      if (targetLevel < existingKnight.level || targetLevel > 3) {
        return { ok: false, message: 'Promote target level must be between current level and 3.' };
      }
      return {
        ok: true,
        state: {
          ...state,
          board: {
            ...state.board,
            knights: {
              ...state.board.knights,
              [command.knightId]: {
                ...existingKnight,
                level: targetLevel,
              },
            },
          },
        },
        message: `Set knight ${command.knightId} to level ${targetLevel}`,
      };
    }

    if (!command.toVertexId) return { ok: false, message: 'Usage: ck-knight move <knightId> <toVertexId>' };
    if (!state.board.graph.vertices.has(command.toVertexId)) return { ok: false, message: `Vertex not found: ${command.toVertexId}` };
    if (state.board.buildings[command.toVertexId]) return { ok: false, message: `Vertex ${command.toVertexId} is occupied by a building.` };
    const occupyingKnight = findKnightAtVertex(state, command.toVertexId);
    if (occupyingKnight) return { ok: false, message: `Vertex ${command.toVertexId} already has knight ${occupyingKnight.id}.` };

    return {
      ok: true,
      state: {
        ...state,
        board: {
          ...state.board,
          knights: {
            ...state.board.knights,
            [command.knightId]: {
              ...existingKnight,
              vertexId: command.toVertexId,
              hasActedThisTurn: true,
            },
          },
        },
      },
      message: `Moved knight ${command.knightId} to ${command.toVertexId}`,
    };
  }

  if (command.type === 'ck-wall') {
    if (!state.ck) return { ok: false, message: 'Cities & Knights state is not initialized.' };

    if (command.action === 'add') {
      if (!command.playerId) return { ok: false, message: 'Usage: ck-wall add <playerId> <cityVertexId>' };
      if (!playerExists(state, command.playerId)) return { ok: false, message: `Player not found: ${command.playerId}` };
      const building = state.board.buildings[command.cityVertexId];
      if (!building || building.type !== 'city' || building.playerId !== command.playerId) {
        return { ok: false, message: `City ${command.cityVertexId} is not owned by ${command.playerId}.` };
      }
      return {
        ok: true,
        state: {
          ...state,
          board: {
            ...state.board,
            cityWalls: {
              ...state.board.cityWalls,
              [command.cityVertexId]: command.playerId,
            },
          },
        },
        message: `Added city wall at ${command.cityVertexId}`,
      };
    }

    if (!state.board.cityWalls[command.cityVertexId]) {
      return { ok: false, message: `No city wall exists at ${command.cityVertexId}.` };
    }
    const updatedWalls = { ...state.board.cityWalls };
    delete updatedWalls[command.cityVertexId];
    return {
      ok: true,
      state: {
        ...state,
        board: {
          ...state.board,
          cityWalls: updatedWalls,
        },
      },
      message: `Removed city wall at ${command.cityVertexId}`,
    };
  }

  if (command.type === 'ck-metropolis') {
    if (!state.ck) return { ok: false, message: 'Cities & Knights state is not initialized.' };
    if (!playerExists(state, command.playerId)) return { ok: false, message: `Player not found: ${command.playerId}` };

    const building = state.board.buildings[command.cityVertexId];
    if (!building || building.type !== 'city' || building.playerId !== command.playerId) {
      return { ok: false, message: `City ${command.cityVertexId} is not owned by ${command.playerId}.` };
    }

    const updatedMetropolises = {
      politics: { ...state.ck.metropolises.politics },
      science: { ...state.ck.metropolises.science },
      trade: { ...state.ck.metropolises.trade },
    };

    for (const track of PROGRESS_DECKS) {
      if (track !== command.track && updatedMetropolises[track].cityVertexId === command.cityVertexId) {
        updatedMetropolises[track] = { playerId: null, cityVertexId: null };
      }
    }

    updatedMetropolises[command.track] = {
      playerId: command.playerId,
      cityVertexId: command.cityVertexId,
    };

    return {
      ok: true,
      state: withUpdatedVictoryState({
        ...state,
        ck: {
          ...state.ck,
          metropolises: updatedMetropolises,
        },
      }),
      message: `Assigned ${command.track} metropolis to ${command.playerId} at ${command.cityVertexId}`,
    };
  }

  if (command.type === 'nextphase') {
    const nextPhaseMap: Record<GameState['turnPhase'], GameState['turnPhase']> = {
      preRoll: 'postRoll',
      postRoll: 'robber',
      robber: 'stealing',
      stealing: 'discarding',
      discarding: 'preRoll',
      setupPlacement: 'preRoll',
    };
    const nextState = {
      ...state,
      phase: 'playing' as const,
      turnPhase: nextPhaseMap[state.turnPhase] ?? 'preRoll',
    };
    return { ok: true, state: nextState, message: `Advanced phase to ${nextState.turnPhase}` };
  }

  const presetState = applyPreset(state, command.name);
  return { ok: true, state: presetState, message: `Applied preset: ${command.name}` };
}
