import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../state/gameStateFactory';
import { executeDebugCommand, parseDebugCommand } from '../commands';

function makeState() {
  const base = createInitialGameState(
    [
      { id: 'player_0', name: 'A', color: 'red' },
      { id: 'player_1', name: 'B', color: 'blue' },
    ],
    42
  );
  return { ...base, phase: 'playing' as const, turnPhase: 'postRoll' as const };
}

describe('debug command parser', () => {
  it('parses give command', () => {
    const parsed = parseDebugCommand('give player_0 wood 3');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.command).toEqual({
        type: 'give',
        playerId: 'player_0',
        resource: 'wood',
        count: 3,
      });
    }
  });

  it('rejects invalid command', () => {
    const parsed = parseDebugCommand('give player_0 invalid 3');
    expect(parsed.ok).toBe(false);
  });
});

describe('debug command execution', () => {
  it('adds resources with give command', () => {
    const state = makeState();
    const result = executeDebugCommand(state, {
      type: 'give',
      playerId: 'player_0',
      resource: 'wood',
      count: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.players[0].resources.wood).toBe(2);
    }
  });

  it('applies trade-test preset', () => {
    const state = makeState();
    const result = executeDebugCommand(state, { type: 'preset', name: 'trade-test' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.phase).toBe('playing');
      expect(result.state.turnPhase).toBe('postRoll');
      expect(result.state.players[result.state.currentPlayerIndex].resources.wood).toBeGreaterThanOrEqual(4);
    }
  });
});
