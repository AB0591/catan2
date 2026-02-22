import type { GameState } from '../../state/gameState';
import type {
  PlayerState,
  ResourceCards,
  ResourceType,
  CommodityCards,
  CommodityType,
} from '../../state/playerState';
import type { ResourceGains, DistributionCards } from '../../state/gameState';

export function addResources(player: PlayerState, resources: Partial<ResourceCards>): PlayerState {
  const updated: ResourceCards = { ...player.resources };
  for (const [key, val] of Object.entries(resources)) {
    if (val) {
      updated[key as ResourceType] = (updated[key as ResourceType] ?? 0) + val;
    }
  }
  return { ...player, resources: updated };
}

export function removeResources(
  player: PlayerState,
  resources: Partial<ResourceCards>
): PlayerState | null {
  if (!hasResources(player, resources)) return null;
  const updated: ResourceCards = { ...player.resources };
  for (const [key, val] of Object.entries(resources)) {
    if (val) {
      updated[key as ResourceType] = (updated[key as ResourceType] ?? 0) - val;
    }
  }
  return { ...player, resources: updated };
}

export function hasResources(player: PlayerState, resources: Partial<ResourceCards>): boolean {
  for (const [key, val] of Object.entries(resources)) {
    if (val && (player.resources[key as ResourceType] ?? 0) < val) return false;
  }
  return true;
}

export function addCommodities(player: PlayerState, commodities: Partial<CommodityCards>): PlayerState {
  const updated: CommodityCards = { ...player.commodities };
  for (const [key, val] of Object.entries(commodities)) {
    if (val) {
      updated[key as CommodityType] = (updated[key as CommodityType] ?? 0) + val;
    }
  }
  return { ...player, commodities: updated };
}

export function removeCommodities(
  player: PlayerState,
  commodities: Partial<CommodityCards>
): PlayerState | null {
  if (!hasCommodities(player, commodities)) return null;
  const updated: CommodityCards = { ...player.commodities };
  for (const [key, val] of Object.entries(commodities)) {
    if (val) {
      updated[key as CommodityType] = (updated[key as CommodityType] ?? 0) - val;
    }
  }
  return { ...player, commodities: updated };
}

export function hasCommodities(player: PlayerState, commodities: Partial<CommodityCards>): boolean {
  for (const [key, val] of Object.entries(commodities)) {
    if (val && (player.commodities[key as CommodityType] ?? 0) < val) return false;
  }
  return true;
}

export function totalResources(player: PlayerState): number {
  return Object.values(player.resources).reduce((sum, n) => sum + n, 0);
}

type GainKey = keyof (ResourceCards & CommodityCards);

function commodityForResource(resource: ResourceType): CommodityType | null {
  if (resource === 'sheep') return 'cloth';
  if (resource === 'ore') return 'coin';
  if (resource === 'wheat') return 'paper';
  return null;
}

function incrementGain(gains: DistributionCards, key: GainKey, amount: number): DistributionCards {
  return {
    ...gains,
    [key]: (gains[key] ?? 0) + amount,
  };
}

export function distributeResources(state: GameState, diceTotal: number): GameState {
  if (diceTotal === 7) return { ...state, lastDistribution: null };

  // Build a map of playerId -> distributed cards (resources + commodities in C&K mode)
  const gains: Map<string, DistributionCards> = new Map();

  for (const hex of state.board.graph.hexes) {
    if (hex.numberToken !== diceTotal) continue;

    // Robber hex produces no resources
    const robber = state.board.robberHex;
    if (hex.coord.q === robber.q && hex.coord.r === robber.r) continue;

    if (hex.resource === 'desert') continue;

    const resourceType = hex.resource as ResourceType;
    const hexKey = `${hex.coord.q},${hex.coord.r}`;

    // Get vertices for this hex
    for (const [vertexId, vertex] of state.board.graph.vertices) {
      const isOnHex = vertex.adjacentHexes.some(
        h => h.q === hex.coord.q && h.r === hex.coord.r
      );
      if (!isOnHex) continue;

      const building = state.board.buildings[vertexId];
      if (!building) continue;

      const pid = building.playerId;
      const current = gains.get(pid) ?? {};
      if (building.type === 'settlement') {
        gains.set(pid, incrementGain(current, resourceType, 1));
        continue;
      }

      // City production differs in C&K mode for wheat/ore/sheep hexes.
      if (state.expansionRules === 'cities_and_knights') {
        const commodity = commodityForResource(resourceType);
        if (commodity) {
          gains.set(pid, incrementGain(incrementGain(current, resourceType, 1), commodity, 1));
          continue;
        }
      }

      gains.set(pid, incrementGain(current, resourceType, 2));
    }
    void hexKey;
  }

  // Apply gains to players
  const updatedPlayers = state.players.map(player => {
    const playerGains = gains.get(player.id);
    if (!playerGains) return player;

    const resourceGains: Partial<ResourceCards> = {};
    const commodityGains: Partial<CommodityCards> = {};
    for (const [key, value] of Object.entries(playerGains)) {
      if (!value) continue;
      if (key === 'wood' || key === 'brick' || key === 'sheep' || key === 'wheat' || key === 'ore') {
        resourceGains[key] = value;
      } else if (key === 'cloth' || key === 'coin' || key === 'paper') {
        commodityGains[key] = value;
      }
    }

    const withResources = addResources(player, resourceGains);
    return addCommodities(withResources, commodityGains);
  });

  const lastDistribution: ResourceGains = {};
  for (const [pid, g] of gains) {
    lastDistribution[pid] = g;
  }

  return { ...state, players: updatedPlayers, lastDistribution };
}
