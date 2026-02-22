import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../state/gameStateFactory';
import { executeDebugCommand, getAvailableDebugCommandGroups, getAvailableDebugCommands, parseDebugCommand } from '../commands';

function makeState(mode: 'base' | 'cities_and_knights' = 'base') {
  const state = createInitialGameState(
    [
      { id: 'player_0', name: 'A', color: 'red' },
      { id: 'player_1', name: 'B', color: 'blue' },
    ],
    42,
    mode
  );
  return { ...state, phase: 'playing' as const, turnPhase: 'postRoll' as const };
}

function findTwoAdjacentVertices(state: ReturnType<typeof makeState>): [string, string] {
  for (const [vertexId, vertex] of state.board.graph.vertices.entries()) {
    const adjacent = vertex.adjacentVertices[0];
    if (adjacent) return [vertexId, adjacent];
  }
  throw new Error('Expected at least two adjacent vertices');
}

describe('debug command parser', () => {
  it('parses general commands', () => {
    const give = parseDebugCommand('give player_0 wood 3');
    expect(give.ok).toBe(true);

    const take = parseDebugCommand('take player_0 brick 2');
    expect(take.ok).toBe(true);

    const state = parseDebugCommand('state player_0');
    expect(state.ok).toBe(true);

    const setphase = parseDebugCommand('setphase robber');
    expect(setphase.ok).toBe(true);
  });

  it('parses cities and knights commands', () => {
    expect(parseDebugCommand('commodity player_0 coin 2').ok).toBe(true);
    expect(parseDebugCommand('ck-improve player_0 politics 4').ok).toBe(true);
    expect(parseDebugCommand('ck-progress player_0 warlord 2').ok).toBe(true);
    expect(parseDebugCommand('ck-barb advance 2').ok).toBe(true);
    expect(parseDebugCommand('ck-knight add player_0 v0 2 true').ok).toBe(true);
    expect(parseDebugCommand('ck-wall add player_0 v0').ok).toBe(true);
    expect(parseDebugCommand('ck-metropolis politics player_0 v0').ok).toBe(true);
  });

  it('rejects invalid command arguments', () => {
    expect(parseDebugCommand('give player_0 invalid 3').ok).toBe(false);
    expect(parseDebugCommand('setphase nope').ok).toBe(false);
    expect(parseDebugCommand('ck-barb attack 2').ok).toBe(false);
    expect(parseDebugCommand('devcard player_0 invalid').ok).toBe(false);
  });
});

describe('debug command availability', () => {
  it('returns grouped commands by ruleset', () => {
    const baseGroups = getAvailableDebugCommandGroups(makeState('base'));
    expect(baseGroups.some(group => group.label === 'Base Catan')).toBe(true);
    expect(baseGroups.some(group => group.label === 'Cities & Knights')).toBe(false);

    const ckGroups = getAvailableDebugCommandGroups(makeState('cities_and_knights'));
    expect(ckGroups.some(group => group.label === 'Cities & Knights')).toBe(true);
    expect(ckGroups.some(group => group.label === 'Base Catan')).toBe(false);
  });

  it('hides base-only command in C&K flat list', () => {
    const commands = getAvailableDebugCommands(makeState('cities_and_knights'));
    expect(commands).not.toContain('devcard');
    expect(commands).toContain('ck-progress');
  });
});

describe('debug command execution', () => {
  it('adds and takes resources with clamp-to-zero behavior', () => {
    const state = makeState();
    const added = executeDebugCommand(state, {
      type: 'give',
      playerId: 'player_0',
      resource: 'wood',
      count: 2,
    });
    expect(added.ok).toBe(true);

    if (!added.ok) return;
    const taken = executeDebugCommand(added.state, {
      type: 'take',
      playerId: 'player_0',
      resource: 'wood',
      count: 5,
    });

    expect(taken.ok).toBe(true);
    if (taken.ok) {
      expect(taken.state.players[0].resources.wood).toBe(0);
    }
  });

  it('sets turn and phase', () => {
    const state = makeState();
    const turned = executeDebugCommand(state, { type: 'setturn', playerId: 'player_1' });
    expect(turned.ok).toBe(true);
    if (!turned.ok) return;
    expect(turned.state.players[turned.state.currentPlayerIndex]?.id).toBe('player_1');

    const phased = executeDebugCommand(turned.state, { type: 'setphase', phase: 'robber' });
    expect(phased.ok).toBe(true);
    if (phased.ok) {
      expect(phased.state.turnPhase).toBe('robber');
      expect(phased.state.phase).toBe('playing');
    }
  });

  it('supports base-only devcard count and blocks devcard in C&K', () => {
    const base = makeState('base');
    const grant = executeDebugCommand(base, {
      type: 'devcard',
      playerId: 'player_0',
      cardType: 'knight',
      count: 2,
    });
    expect(grant.ok).toBe(true);
    if (grant.ok) {
      expect(grant.state.players[0].developmentCards).toHaveLength(2);
    }

    const ck = makeState('cities_and_knights');
    const blocked = executeDebugCommand(ck, {
      type: 'devcard',
      playerId: 'player_0',
      cardType: 'knight',
      count: 1,
    });
    expect(blocked.ok).toBe(false);
  });

  it('moves robber in base mode', () => {
    const state = makeState('base');
    const target = state.board.graph.hexes[0]?.coord;
    expect(target).toBeDefined();
    if (!target) return;

    const result = executeDebugCommand(state, { type: 'robber', q: target.q, r: target.r });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.board.robberHex.q).toBe(target.q);
      expect(result.state.board.robberHex.r).toBe(target.r);
    }
  });

  it('handles C&K commodity, improve, progress and barbarian commands', () => {
    const state = makeState('cities_and_knights');

    const commodity = executeDebugCommand(state, {
      type: 'commodity',
      playerId: 'player_0',
      commodity: 'coin',
      count: 3,
    });
    expect(commodity.ok).toBe(true);
    if (!commodity.ok) return;
    expect(commodity.state.players[0].commodities.coin).toBe(3);

    const improve = executeDebugCommand(commodity.state, {
      type: 'ck-improve',
      playerId: 'player_0',
      track: 'politics',
      level: 4,
    });
    expect(improve.ok).toBe(true);
    if (!improve.ok) return;
    expect(improve.state.players[0].cityImprovements.politics).toBe(4);

    const progress = executeDebugCommand(improve.state, {
      type: 'ck-progress',
      playerId: 'player_0',
      cardType: 'warlord',
      count: 2,
    });
    expect(progress.ok).toBe(true);
    if (!progress.ok) return;
    expect(progress.state.ck?.progressHands.player_0).toHaveLength(2);

    const barb = executeDebugCommand(progress.state, {
      type: 'ck-barb',
      action: 'set',
      value: 3,
    });
    expect(barb.ok).toBe(true);
    if (barb.ok) {
      expect(barb.state.ck?.barbarians.position).toBe(3);
    }
  });

  it('handles C&K knight, wall and metropolis commands', () => {
    const state = makeState('cities_and_knights');
    const [fromVertex, toVertex] = findTwoAdjacentVertices(state);

    const addKnight = executeDebugCommand(state, {
      type: 'ck-knight',
      action: 'add',
      playerId: 'player_0',
      vertexId: fromVertex,
      level: 1,
      active: false,
    });
    expect(addKnight.ok).toBe(true);
    if (!addKnight.ok) return;

    const knightId = Object.keys(addKnight.state.board.knights)[0];
    expect(knightId).toBeDefined();
    if (!knightId) return;

    const moveKnight = executeDebugCommand(addKnight.state, {
      type: 'ck-knight',
      action: 'move',
      knightId,
      toVertexId: toVertex,
    });
    expect(moveKnight.ok).toBe(true);
    if (moveKnight.ok) {
      expect(moveKnight.state.board.knights[knightId]?.vertexId).toBe(toVertex);
    }

    const withCity = {
      ...(moveKnight.ok ? moveKnight.state : addKnight.state),
      board: {
        ...(moveKnight.ok ? moveKnight.state : addKnight.state).board,
        buildings: {
          ...(moveKnight.ok ? moveKnight.state : addKnight.state).board.buildings,
          [fromVertex]: { type: 'city' as const, playerId: 'player_0' },
        },
      },
    };

    const wall = executeDebugCommand(withCity, {
      type: 'ck-wall',
      action: 'add',
      playerId: 'player_0',
      cityVertexId: fromVertex,
    });
    expect(wall.ok).toBe(true);
    if (!wall.ok) return;
    expect(wall.state.board.cityWalls[fromVertex]).toBe('player_0');

    const metro = executeDebugCommand(wall.state, {
      type: 'ck-metropolis',
      track: 'politics',
      playerId: 'player_0',
      cityVertexId: fromVertex,
    });
    expect(metro.ok).toBe(true);
    if (metro.ok) {
      expect(metro.state.ck?.metropolises.politics.playerId).toBe('player_0');
      expect(metro.state.ck?.metropolises.politics.cityVertexId).toBe(fromVertex);
    }
  });

  it('returns state/help text without mutating state', () => {
    const state = makeState('cities_and_knights');
    const help = executeDebugCommand(state, { type: 'help' });
    expect(help.ok).toBe(true);
    if (!help.ok) return;
    expect(help.message).toContain('General:');

    const details = executeDebugCommand(help.state, { type: 'state', playerId: 'player_0' });
    expect(details.ok).toBe(true);
    if (details.ok) {
      expect(details.message).toContain('player_0');
      expect(details.state).toBe(help.state);
    }
  });
});
