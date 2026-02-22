import type { ResourceType, CommodityType } from '../state/playerState';

export const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  wood: 'Wood (Lumber)',
  brick: 'Brick',
  sheep: 'Sheep (Wool)',
  wheat: 'Wheat (Grain)',
  ore: 'Ore',
};

export const COMMODITY_ICONS: Record<CommodityType, string> = {
  cloth: '🧵',
  coin: '🪙',
  paper: '📜',
};

export const COMMODITY_NAMES: Record<CommodityType, string> = {
  cloth: 'Cloth',
  coin: 'Coin',
  paper: 'Paper',
};

export function formatResourceCostTooltip(
  cost: Partial<Record<ResourceType, number>>
): string {
  return Object.entries(cost)
    .map(([res, amount]) => `${amount} ${RESOURCE_NAMES[res as ResourceType]}`)
    .join(', ');
}
