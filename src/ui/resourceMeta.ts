import type { ResourceType } from '../state/playerState';

export const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  wood: 'Wood (Lumber)',
  brick: 'Brick (Grain)',
  sheep: 'Sheep (Wool)',
  wheat: 'Wheat (Grain)',
  ore: 'Ore',
};

export function formatResourceCostTooltip(
  cost: Partial<Record<ResourceType, number>>
): string {
  return Object.entries(cost)
    .map(([res, amount]) => `${amount} ${RESOURCE_NAMES[res as ResourceType]}`)
    .join(', ');
}
