import type { GameState, GameAction } from '../../state/gameState';
import type { ResourceType } from '../../state/playerState';
import type { Port } from '../../state/boardState';
import type { VertexId } from '../board/boardTypes';
import { hexCornerPositions, round4 } from '../board/vertexGraph';

// Standard Catan port definitions: hex coord + two vertex indices (0-5 on that hex)
const STANDARD_PORT_DEFS: Array<{
  q: number; r: number;
  vi1: number; vi2: number;
  resource: Port['resource'];
  ratio: 2 | 3;
}> = [
  { q: 0,  r: -2, vi1: 3, vi2: 4, resource: 'any',   ratio: 3 },
  { q: 1,  r: -2, vi1: 4, vi2: 5, resource: 'wood',  ratio: 2 },
  { q: 2,  r: -1, vi1: 5, vi2: 0, resource: 'any',   ratio: 3 },
  { q: 2,  r: 0,  vi1: 0, vi2: 1, resource: 'ore',   ratio: 2 },
  { q: 1,  r: 1,  vi1: 1, vi2: 2, resource: 'any',   ratio: 3 },
  { q: 0,  r: 2,  vi1: 2, vi2: 3, resource: 'wheat', ratio: 2 },
  { q: -1, r: 2,  vi1: 2, vi2: 3, resource: 'any',   ratio: 3 },
  { q: -2, r: 1,  vi1: 3, vi2: 4, resource: 'brick', ratio: 2 },
  { q: -2, r: 0,  vi1: 4, vi2: 5, resource: 'sheep', ratio: 2 },
];

/** Build a pixel-key → vertexId map from a BoardGraph (same algorithm as buildVertexGraph). */
function buildPixelKeyToVertexId(
  hexes: GameState['board']['graph']['hexes'],
  vertices: GameState['board']['graph']['vertices']
): Map<string, VertexId> {
  const pixelKeyToCounter = new Map<string, number>();
  let counter = 0;

  for (const hex of hexes) {
    const corners = hexCornerPositions(hex.coord.q, hex.coord.r);
    for (const [x, y] of corners) {
      const key = `${round4(x)},${round4(y)}`;
      if (!pixelKeyToCounter.has(key)) {
        pixelKeyToCounter.set(key, counter++);
      }
    }
  }

  const counterToKey = new Map<number, string>();
  for (const [key, idx] of pixelKeyToCounter) {
    counterToKey.set(idx, key);
  }

  const result = new Map<string, VertexId>();
  for (const vid of vertices.keys()) {
    const idx = parseInt(vid.substring(1), 10);
    const key = counterToKey.get(idx);
    if (key) result.set(key, vid);
  }

  return result;
}

/** Compute the VertexId for vertex index vi on hex (q, r). */
function getPortVertexId(
  pixelToVid: Map<string, VertexId>,
  q: number,
  r: number,
  vi: number
): VertexId | null {
  const corners = hexCornerPositions(q, r);
  const pos = corners[vi];
  if (!pos) return null;
  const key = `${round4(pos[0])},${round4(pos[1])}`;
  return pixelToVid.get(key) ?? null;
}

/** Generate the 9 standard ports with resolved VertexId pairs from a board graph. */
export function createStandardPorts(
  hexes: GameState['board']['graph']['hexes'],
  vertices: GameState['board']['graph']['vertices']
): Port[] {
  const pixelToVid = buildPixelKeyToVertexId(hexes, vertices);
  const ports: Port[] = [];

  for (const def of STANDARD_PORT_DEFS) {
    const v1 = getPortVertexId(pixelToVid, def.q, def.r, def.vi1);
    const v2 = getPortVertexId(pixelToVid, def.q, def.r, def.vi2);
    if (v1 && v2) {
      ports.push({ resource: def.resource, ratio: def.ratio, vertices: [v1, v2] });
    }
  }

  return ports;
}

/** Generate the 9 standard ports with resolved VertexId pairs. */
export function computeStandardPorts(state: GameState): Port[] {
  return createStandardPorts(state.board.graph.hexes, state.board.graph.vertices);
}

/**
 * Get the best trade ratio for a player for a specific resource type.
 * Returns 2 if player has 2:1 port for that resource,
 * 3 if player has any 3:1 port, 4 otherwise.
 */
export function getTradeRatio(
  state: GameState,
  playerId: string,
  resource: ResourceType
): number {
  const buildings = state.board.buildings;
  const ports = state.board.ports;
  let bestRatio = 4;

  for (const port of ports) {
    const onPort = port.vertices.some(vid => buildings[vid]?.playerId === playerId);
    if (!onPort) continue;

    if (port.resource === resource && port.ratio === 2) {
      return 2; // best possible
    }
    if (port.resource === 'any' && port.ratio === 3) {
      bestRatio = Math.min(bestRatio, 3);
    }
  }

  return bestRatio;
}

/** Handle TRADE_BANK action: player gives resources to bank and receives 1 in return. */
export function handleTradeBank(state: GameState, action: GameAction): GameState {
  const { give, receive } = action.payload as { give: ResourceType; receive: ResourceType };
  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const ratio = getTradeRatio(state, action.playerId, give);

  if ((player.resources[give] ?? 0) < ratio) return state;
  if (give === receive) return state;

  const newResources = { ...player.resources };
  newResources[give] = (newResources[give] ?? 0) - ratio;
  newResources[receive] = (newResources[receive] ?? 0) + 1;

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, resources: newResources } : p
  );

  return { ...state, players: updatedPlayers };
}

/** Handle TRADE_PLAYER action: two players exchange resources. */
export function handleTradePlayer(state: GameState, action: GameAction): GameState {
  const { targetPlayerId, give, receive } = action.payload as {
    targetPlayerId: string;
    give: Partial<Record<ResourceType, number>>;
    receive: Partial<Record<ResourceType, number>>;
  };

  const initiatorIndex = state.players.findIndex(p => p.id === action.playerId);
  const targetIndex = state.players.findIndex(p => p.id === targetPlayerId);
  if (initiatorIndex === -1 || targetIndex === -1) return state;

  const initiator = state.players[initiatorIndex];
  const target = state.players[targetIndex];

  // Validate initiator has enough to give
  for (const [res, amt] of Object.entries(give) as [ResourceType, number][]) {
    if ((initiator.resources[res] ?? 0) < (amt ?? 0)) return state;
  }
  // Validate target has enough to give back
  for (const [res, amt] of Object.entries(receive) as [ResourceType, number][]) {
    if ((target.resources[res] ?? 0) < (amt ?? 0)) return state;
  }

  const newInitiatorResources = { ...initiator.resources };
  const newTargetResources = { ...target.resources };

  for (const [res, amt] of Object.entries(give) as [ResourceType, number][]) {
    newInitiatorResources[res] = (newInitiatorResources[res] ?? 0) - (amt ?? 0);
    newTargetResources[res] = (newTargetResources[res] ?? 0) + (amt ?? 0);
  }
  for (const [res, amt] of Object.entries(receive) as [ResourceType, number][]) {
    newTargetResources[res] = (newTargetResources[res] ?? 0) - (amt ?? 0);
    newInitiatorResources[res] = (newInitiatorResources[res] ?? 0) + (amt ?? 0);
  }

  const updatedPlayers = state.players.map((p, i) => {
    if (i === initiatorIndex) return { ...p, resources: newInitiatorResources };
    if (i === targetIndex) return { ...p, resources: newTargetResources };
    return p;
  });

  return { ...state, players: updatedPlayers };
}
