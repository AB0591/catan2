import { dispatchAction } from '../engine/turnManager/turnManager';
import { updateVictoryState } from '../engine/victory/victoryEngine';
import type { GameState } from '../state/gameState';
import type { DevelopmentCardType, ResourceType } from '../state/playerState';
import type {
  DebugCommand,
  DebugCommandExecutionResult,
  ParsedDebugCommand,
} from './types';

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const DEV_CARD_TYPES: DevelopmentCardType[] = ['knight', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'];

function isResourceType(value: string): value is ResourceType {
  return RESOURCES.includes(value as ResourceType);
}

function isDevCardType(value: string): value is DevelopmentCardType {
  return DEV_CARD_TYPES.includes(value as DevelopmentCardType);
}

function parseIntStrict(value: string): number | null {
  if (!/^-?\d+$/.test(value)) return null;
  return Number(value);
}

export function parseDebugCommand(input: string): ParsedDebugCommand {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: 'Empty command' };

  const parts = trimmed.split(/\s+/);
  const [cmd, ...rest] = parts;

  if (cmd === 'give') {
    if (rest.length !== 3) return { ok: false, message: 'Usage: give <playerId> <resource> <count>' };
    const [playerId, resource, countRaw] = rest;
    if (!isResourceType(resource)) return { ok: false, message: `Invalid resource: ${resource}` };
    const count = parseIntStrict(countRaw);
    if (count === null || count <= 0) return { ok: false, message: 'Count must be a positive integer' };
    return { ok: true, command: { type: 'give', playerId, resource, count } };
  }

  if (cmd === 'setvp') {
    if (rest.length !== 2) return { ok: false, message: 'Usage: setvp <playerId> <vp>' };
    const [playerId, vpRaw] = rest;
    const vp = parseIntStrict(vpRaw);
    if (vp === null || vp < 0 || vp > 20) return { ok: false, message: 'VP must be an integer between 0 and 20' };
    return { ok: true, command: { type: 'setvp', playerId, vp } };
  }

  if (cmd === 'roll') {
    if (rest.length !== 1) return { ok: false, message: 'Usage: roll <2-12>' };
    const total = parseIntStrict(rest[0]);
    if (total === null || total < 2 || total > 12) return { ok: false, message: 'Roll total must be between 2 and 12' };
    return { ok: true, command: { type: 'roll', total } };
  }

  if (cmd === 'devcard') {
    if (rest.length !== 2) return { ok: false, message: 'Usage: devcard <playerId> <type>' };
    const [playerId, cardType] = rest;
    if (!isDevCardType(cardType)) return { ok: false, message: `Invalid dev card type: ${cardType}` };
    return { ok: true, command: { type: 'devcard', playerId, cardType } };
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

function applySetVp(state: GameState, playerId: string, targetVp: number): GameState | null {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
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

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, developmentCards: [...nonVpCards, ...vpCards] } : p
  );

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

  // robber-test
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

export function executeDebugCommand(state: GameState, command: DebugCommand): DebugCommandExecutionResult {
  if (command.type === 'give') {
    const playerIndex = state.players.findIndex(p => p.id === command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };
    const updatedPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? {
            ...p,
            resources: {
              ...p.resources,
              [command.resource]: p.resources[command.resource] + command.count,
            },
          }
        : p
    );
    return {
      ok: true,
      state: withUpdatedVictoryState({ ...state, players: updatedPlayers }),
      message: `Added ${command.count} ${command.resource} to ${command.playerId}`,
    };
  }

  if (command.type === 'setvp') {
    const updatedState = applySetVp(state, command.playerId, command.vp);
    if (!updatedState) return { ok: false, message: `Player not found: ${command.playerId}` };
    return { ok: true, state: updatedState, message: `Set ${command.playerId} to ${command.vp} VP` };
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
    const playerIndex = state.players.findIndex(p => p.id === command.playerId);
    if (playerIndex === -1) return { ok: false, message: `Player not found: ${command.playerId}` };
    const updatedPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? {
            ...p,
            developmentCards: [
              ...p.developmentCards,
              {
                type: command.cardType,
                playedThisTurn: false,
                turnBought: Math.max(0, state.currentTurn - 1),
              },
            ],
          }
        : p
    );
    return {
      ok: true,
      state: withUpdatedVictoryState({ ...state, players: updatedPlayers }),
      message: `Gave ${command.cardType} card to ${command.playerId}`,
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
