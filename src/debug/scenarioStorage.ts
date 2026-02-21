import { deserializeState, serializeState } from '../api/gameController';
import type { GameState } from '../state/gameState';
import type { ScenarioSnapshot } from './types';

export const SCENARIO_STORAGE_KEY = 'catan2.scenarios.v1';

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.localStorage &&
    typeof window.localStorage.getItem === 'function' &&
    typeof window.localStorage.setItem === 'function'
  );
}

export function loadSavedScenarios(): ScenarioSnapshot[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isScenarioSnapshot);
  } catch {
    return [];
  }
}

export function persistSavedScenarios(scenarios: ScenarioSnapshot[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarios));
}

export function makeScenarioSnapshot(
  name: string,
  liveState: GameState,
  initialState: GameState,
  aiPlayerIds: string[]
): ScenarioSnapshot {
  const id = `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: name.trim() || `Scenario ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    version: 1,
    stateJson: serializeState(liveState),
    initialStateJson: serializeState(initialState),
    actionLog: liveState.actionLog,
    aiPlayerIds: [...aiPlayerIds],
  };
}

export function parseScenarioImport(json: string): { ok: true; snapshot: ScenarioSnapshot } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isScenarioSnapshot(parsed)) {
      return { ok: false, message: 'Invalid scenario format' };
    }
    const scenario = parsed as ScenarioSnapshot;
    if (scenario.version !== 1) {
      return { ok: false, message: `Unsupported scenario version: ${scenario.version}` };
    }
    deserializeState(scenario.stateJson);
    deserializeState(scenario.initialStateJson);
    return { ok: true, snapshot: scenario };
  } catch {
    return { ok: false, message: 'Invalid JSON file' };
  }
}

function isScenarioSnapshot(value: unknown): value is ScenarioSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') return false;
  if (typeof v.name !== 'string') return false;
  if (typeof v.createdAt !== 'string') return false;
  if (v.version !== 1) return false;
  if (typeof v.stateJson !== 'string') return false;
  if (typeof v.initialStateJson !== 'string') return false;
  if (!Array.isArray(v.actionLog)) return false;
  if (!Array.isArray(v.aiPlayerIds) || !v.aiPlayerIds.every(id => typeof id === 'string')) return false;
  return true;
}
