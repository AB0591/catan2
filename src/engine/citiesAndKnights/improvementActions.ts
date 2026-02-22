import type { GameAction, GameState } from '../../state/gameState';
import type { CommodityType, ImprovementTrack } from '../../state/playerState';
import { hasCommodities, removeCommodities } from '../resources/resourceDistribution';
import { updateMetropolises } from './ckMeta';

const MAX_IMPROVEMENT_LEVEL = 5;

const TRACK_TO_COMMODITY: Record<ImprovementTrack, CommodityType> = {
  politics: 'coin',
  science: 'paper',
  trade: 'cloth',
};

function isImprovementTrack(value: unknown): value is ImprovementTrack {
  return value === 'politics' || value === 'science' || value === 'trade';
}

function hasAtLeastOneCity(state: GameState, playerId: string): boolean {
  return Object.values(state.board.buildings).some(
    b => b.playerId === playerId && b.type === 'city'
  );
}

export function handleImproveCity(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;

  const { area } = action.payload as { area?: unknown };
  if (!isImprovementTrack(area)) return state;

  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];

  if (!hasAtLeastOneCity(state, action.playerId)) return state;

  const currentLevel = player.cityImprovements[area];
  if (currentLevel >= MAX_IMPROVEMENT_LEVEL) return state;

  const costAmount = currentLevel + 1;
  const commodity = TRACK_TO_COMMODITY[area];
  const cost = { [commodity]: costAmount } as Record<CommodityType, number>;
  if (!hasCommodities(player, cost)) return state;

  const updated = removeCommodities(player, cost);
  if (!updated) return state;

  const updatedPlayer = {
    ...updated,
    cityImprovements: {
      ...updated.cityImprovements,
      [area]: currentLevel + 1,
    },
  };
  const updatedPlayers = state.players.map((p, idx) => (idx === playerIndex ? updatedPlayer : p));

  return updateMetropolises({ ...state, players: updatedPlayers });
}
