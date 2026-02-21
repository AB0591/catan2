import type { GameState } from '../../state/gameState';
import type { PlayerState } from '../../state/playerState';
import { RESOURCE_NAMES } from '../resourceMeta';

const COSTS = {
  settlement: { brick: 1, wood: 1, sheep: 1, wheat: 1 },
  road: { brick: 1, wood: 1 },
  city: { ore: 3, wheat: 2 },
  devCard: { ore: 1, wheat: 1, sheep: 1 },
} as const;

type BuildKey = keyof typeof COSTS;

function canAfford(resources: PlayerState['resources'], key: BuildKey): boolean {
  const cost = COSTS[key];
  return Object.entries(cost).every(([res, amount]) => resources[res as keyof typeof resources] >= amount);
}

function missingResourceText(resources: PlayerState['resources'], key: BuildKey): string {
  const cost = COSTS[key];
  const missing: string[] = [];
  for (const [resource, amount] of Object.entries(cost)) {
    const have = resources[resource as keyof typeof resources] ?? 0;
    if (have < amount) {
      missing.push(`${amount - have} ${RESOURCE_NAMES[resource as keyof typeof RESOURCE_NAMES]}`);
    }
  }
  return missing.length > 0 ? `Missing: ${missing.join(', ')}` : '';
}

export function getRollDisabledReason(
  gameState: GameState,
  currentPlayerId: string | undefined,
  isReplayMode: boolean
): string | null {
  if (isReplayMode) return 'Replay mode active. Return to live play to roll.';
  if (gameState.phase !== 'playing') return 'Can only roll during the playing phase.';
  const activePlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  if (!currentPlayerId || currentPlayerId !== activePlayerId) return 'Not your turn.';
  if (gameState.turnPhase !== 'preRoll') return 'Roll is only available at the start of your turn.';
  return null;
}

export function getEndTurnDisabledReason(
  gameState: GameState,
  currentPlayerId: string | undefined,
  isReplayMode: boolean
): string | null {
  if (isReplayMode) return 'Replay mode active. Return to live play to end a turn.';
  if (gameState.phase !== 'playing') return 'Can only end turn during the playing phase.';
  const activePlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  if (!currentPlayerId || currentPlayerId !== activePlayerId) return 'Not your turn.';
  if (gameState.turnPhase !== 'postRoll') return 'End turn is only available after rolling.';
  return null;
}

export function getBuildDisabledReason(
  key: BuildKey,
  gameState: GameState,
  player: PlayerState,
  isReplayMode: boolean
): string | null {
  if (isReplayMode) return 'Replay mode active. Return to live play to build.';
  if (gameState.phase !== 'playing') return 'Can only build during the playing phase.';
  if (gameState.turnPhase !== 'postRoll') return 'Can only build in post-roll phase.';

  if (!canAfford(player.resources, key)) {
    return missingResourceText(player.resources, key);
  }

  if (key === 'settlement' && player.settlements <= 0) return 'No settlements remaining.';
  if (key === 'road' && player.roads <= 0) return 'No roads remaining.';
  if (key === 'city' && player.cities <= 0) return 'No cities remaining.';

  return null;
}

export function getDevCardPlayReason(gameState: GameState, isReplayMode: boolean): string | null {
  if (isReplayMode) return 'Replay mode active. Return to live play to use dev cards.';
  if (gameState.phase !== 'playing') return 'Dev cards are only playable during the playing phase.';
  if (!(gameState.turnPhase === 'postRoll' || gameState.turnPhase === 'preRoll')) {
    return 'Dev cards can be played before or after rolling.';
  }
  return null;
}
