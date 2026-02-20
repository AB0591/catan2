import type { GameState } from '../../state/gameState';
import type { PlayerState, ResourceCards, ResourceType } from '../../state/playerState';
import type { ResourceGains } from '../../state/gameState';

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

export function totalResources(player: PlayerState): number {
  return Object.values(player.resources).reduce((sum, n) => sum + n, 0);
}

export function distributeResources(state: GameState, diceTotal: number): GameState {
  if (diceTotal === 7) return { ...state, lastDistribution: null };

  // Build a map of playerId -> resources to add
  const gains: Map<string, Partial<ResourceCards>> = new Map();

  for (const hex of state.board.graph.hexes) {
    if (hex.numberToken !== diceTotal) continue;

    // Robber hex produces no resources
    const robber = state.board.robberHex;
    if (hex.coord.q === robber.q && hex.coord.r === robber.r) continue;

    if (hex.resource === 'desert') continue;

    const resource = hex.resource as ResourceType;
    const hexKey = `${hex.coord.q},${hex.coord.r}`;

    // Get vertices for this hex
    for (const [vertexId, vertex] of state.board.graph.vertices) {
      const isOnHex = vertex.adjacentHexes.some(
        h => h.q === hex.coord.q && h.r === hex.coord.r
      );
      if (!isOnHex) continue;

      const building = state.board.buildings[vertexId];
      if (!building) continue;

      const amount = building.type === 'city' ? 2 : 1;
      const pid = building.playerId;
      const current = gains.get(pid) ?? {};
      gains.set(pid, {
        ...current,
        [resource]: ((current[resource] ?? 0) + amount),
      });
    }
    void hexKey;
  }

  // Apply gains to players
  const updatedPlayers = state.players.map(player => {
    const playerGains = gains.get(player.id);
    if (!playerGains) return player;
    return addResources(player, playerGains);
  });

  const lastDistribution: ResourceGains = {};
  for (const [pid, g] of gains) {
    lastDistribution[pid] = g;
  }

  return { ...state, players: updatedPlayers, lastDistribution };
}
