import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../state/gameStateFactory';
import { makeScenarioSnapshot, parseScenarioImport } from '../scenarioStorage';

function makeState() {
  return createInitialGameState(
    [
      { id: 'player_0', name: 'A', color: 'red' },
      { id: 'player_1', name: 'B', color: 'blue' },
    ],
    42
  );
}

describe('scenario storage helpers', () => {
  it('round-trips snapshot JSON through parser', () => {
    const state = makeState();
    const snapshot = makeScenarioSnapshot('Test Scenario', state, state, ['player_1']);
    const parsed = parseScenarioImport(JSON.stringify(snapshot));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.snapshot.name).toBe('Test Scenario');
      expect(parsed.snapshot.aiPlayerIds).toEqual(['player_1']);
    }
  });

  it('rejects malformed import payload', () => {
    const parsed = parseScenarioImport('{"invalid":true}');
    expect(parsed.ok).toBe(false);
  });
});
