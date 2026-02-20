import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import {
  handleTradeBank,
  handleTradePlayer,
  getTradeRatio,
} from '../tradingActions';
import type { GameState } from '../../../state/gameState';
import type { GameAction } from '../../../state/gameState';

function makeState(overrides?: Partial<GameState>): GameState {
  const state = createInitialGameState([
    { id: 'p1', name: 'Alice', color: 'red' },
    { id: 'p2', name: 'Bob', color: 'blue' },
  ], 42);
  return { ...state, phase: 'playing', turnPhase: 'postRoll', ...overrides };
}

function setResources(
  state: GameState,
  playerId: string,
  resources: Partial<Record<string, number>>
): GameState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId
        ? { ...p, resources: { ...p.resources, ...resources } }
        : p
    ),
  };
}

function makeAction(type: GameAction['type'], playerId: string, payload: Record<string, unknown>): GameAction {
  return { type, playerId, payload, timestamp: 0 };
}

describe('tradingActions', () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState();
  });

  it('handleTradeBank at 4:1 deducts 4 resources and gives 1', () => {
    state = setResources(state, 'p1', { wood: 4, brick: 0 });
    const action = makeAction('TRADE_BANK', 'p1', { give: 'wood', receive: 'brick' });
    const result = handleTradeBank(state, action);
    const player = result.players.find(p => p.id === 'p1')!;
    expect(player.resources.wood).toBe(0);
    expect(player.resources.brick).toBe(1);
  });

  it('handleTradeBank fails with insufficient resources', () => {
    state = setResources(state, 'p1', { wood: 3 });
    const action = makeAction('TRADE_BANK', 'p1', { give: 'wood', receive: 'brick' });
    const result = handleTradeBank(state, action);
    const player = result.players.find(p => p.id === 'p1')!;
    expect(player.resources.wood).toBe(3); // unchanged
  });

  it('handleTradeBank at 3:1 port deducts 3 resources', () => {
    // Give player a 3:1 port by placing settlement on port vertex
    const ports = state.board.ports;
    const anyPort = ports.find(p => p.resource === 'any');
    if (!anyPort) return; // skip if no port found

    const portVertex = anyPort.vertices[0];
    const stateWithSettlement = {
      ...state,
      board: {
        ...state.board,
        buildings: {
          ...state.board.buildings,
          [portVertex]: { type: 'settlement' as const, playerId: 'p1' },
        },
      },
    };
    const withResources = setResources(stateWithSettlement, 'p1', { wood: 3 });
    const action = makeAction('TRADE_BANK', 'p1', { give: 'wood', receive: 'brick' });
    const result = handleTradeBank(withResources, action);
    const player = result.players.find(p => p.id === 'p1')!;
    expect(player.resources.wood).toBe(0);
    expect(player.resources.brick).toBe(1);
  });

  it('handleTradeBank at 2:1 port deducts 2 resources', () => {
    const ports = state.board.ports;
    const woodPort = ports.find(p => p.resource === 'wood');
    if (!woodPort) return;

    const portVertex = woodPort.vertices[0];
    const stateWithSettlement = {
      ...state,
      board: {
        ...state.board,
        buildings: {
          ...state.board.buildings,
          [portVertex]: { type: 'settlement' as const, playerId: 'p1' },
        },
      },
    };
    const withResources = setResources(stateWithSettlement, 'p1', { wood: 2 });
    const action = makeAction('TRADE_BANK', 'p1', { give: 'wood', receive: 'brick' });
    const result = handleTradeBank(withResources, action);
    const player = result.players.find(p => p.id === 'p1')!;
    expect(player.resources.wood).toBe(0);
    expect(player.resources.brick).toBe(1);
  });

  it('getTradeRatio returns 4 with no port', () => {
    const ratio = getTradeRatio(state, 'p1', 'wood');
    expect(ratio).toBe(4);
  });

  it('getTradeRatio returns 3 with 3:1 port access', () => {
    const ports = state.board.ports;
    const anyPort = ports.find(p => p.resource === 'any');
    if (!anyPort) return;

    const portVertex = anyPort.vertices[0];
    const stateWithPort = {
      ...state,
      board: {
        ...state.board,
        buildings: {
          ...state.board.buildings,
          [portVertex]: { type: 'settlement' as const, playerId: 'p1' },
        },
      },
    };
    const ratio = getTradeRatio(stateWithPort, 'p1', 'wood');
    expect(ratio).toBe(3);
  });

  it('getTradeRatio returns 2 with 2:1 specific port access', () => {
    const ports = state.board.ports;
    const woodPort = ports.find(p => p.resource === 'wood');
    if (!woodPort) return;

    const portVertex = woodPort.vertices[0];
    const stateWithPort = {
      ...state,
      board: {
        ...state.board,
        buildings: {
          ...state.board.buildings,
          [portVertex]: { type: 'settlement' as const, playerId: 'p1' },
        },
      },
    };
    const ratio = getTradeRatio(stateWithPort, 'p1', 'wood');
    expect(ratio).toBe(2);
  });

  it('handleTradePlayer transfers resources between players', () => {
    state = setResources(state, 'p1', { wood: 2 });
    state = setResources(state, 'p2', { brick: 1 });
    const action = makeAction('TRADE_PLAYER', 'p1', {
      targetPlayerId: 'p2',
      give: { wood: 2 },
      receive: { brick: 1 },
    });
    const result = handleTradePlayer(state, action);
    const p1 = result.players.find(p => p.id === 'p1')!;
    const p2 = result.players.find(p => p.id === 'p2')!;
    expect(p1.resources.wood).toBe(0);
    expect(p1.resources.brick).toBe(1);
    expect(p2.resources.wood).toBe(2);
    expect(p2.resources.brick).toBe(0);
  });

  it('handleTradePlayer fails if initiator has insufficient resources', () => {
    state = setResources(state, 'p1', { wood: 1 });
    state = setResources(state, 'p2', { brick: 1 });
    const action = makeAction('TRADE_PLAYER', 'p1', {
      targetPlayerId: 'p2',
      give: { wood: 2 },
      receive: { brick: 1 },
    });
    const result = handleTradePlayer(state, action);
    const p1 = result.players.find(p => p.id === 'p1')!;
    expect(p1.resources.wood).toBe(1); // unchanged
  });

  it('handleTradePlayer fails if target has insufficient resources', () => {
    state = setResources(state, 'p1', { wood: 2 });
    state = setResources(state, 'p2', { brick: 0 });
    const action = makeAction('TRADE_PLAYER', 'p1', {
      targetPlayerId: 'p2',
      give: { wood: 2 },
      receive: { brick: 1 },
    });
    const result = handleTradePlayer(state, action);
    const p1 = result.players.find(p => p.id === 'p1')!;
    expect(p1.resources.wood).toBe(2); // unchanged
  });
});
