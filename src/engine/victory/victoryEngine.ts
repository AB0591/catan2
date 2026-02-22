import type { GameState } from '../../state/gameState';
import type { VertexId, EdgeId } from '../board/boardTypes';
import { metropolisPointsForPlayer } from '../citiesAndKnights/ckMeta';

export function calculateTotalVP(state: GameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;

  const settlementsPlaced = 5 - player.settlements;
  const citiesPlaced = 4 - player.cities;
  const vpCards = player.developmentCards.filter(c => c.type === 'victoryPoint').length;
  const specialPoints =
    (player.hasLargestArmy ? 2 : 0)
    + (player.hasLongestRoad ? 2 : 0)
    + player.ckVictoryPoints
    + metropolisPointsForPlayer(state, playerId);

  return settlementsPlaced + citiesPlaced * 2 + vpCards + specialPoints;
}

export function checkVictory(state: GameState): string | null {
  for (const player of state.players) {
    if (calculateTotalVP(state, player.id) >= state.victoryPointTarget) {
      return player.id;
    }
  }
  return null;
}

export function calculateLongestRoad(state: GameState, playerId: string): number {
  // Collect all edges belonging to this player
  const playerEdges = new Set<EdgeId>();
  for (const [edgeId, road] of Object.entries(state.board.roads)) {
    if (road.playerId === playerId) playerEdges.add(edgeId);
  }

  if (playerEdges.size === 0) return 0;

  // DFS to find longest simple path (no repeated edges)
  let maxLength = 0;

  function dfs(currentVertex: VertexId, usedEdges: Set<EdgeId>, length: number): void {
    if (length > maxLength) maxLength = length;

    const vertex = state.board.graph.vertices.get(currentVertex);
    if (!vertex) return;

    for (const edgeId of vertex.adjacentEdges) {
      if (!playerEdges.has(edgeId)) continue;
      if (usedEdges.has(edgeId)) continue;

      const edge = state.board.graph.edges.get(edgeId)!;
      const nextVertex = edge.vertices[0] === currentVertex ? edge.vertices[1] : edge.vertices[0];

      // Check if an opponent's building blocks this vertex
      const buildingAtNext = state.board.buildings[nextVertex];
      if (buildingAtNext && buildingAtNext.playerId !== playerId) continue;

      usedEdges.add(edgeId);
      dfs(nextVertex, usedEdges, length + 1);
      usedEdges.delete(edgeId);
    }
  }

  // Try starting from every vertex that has a player road
  const startVertices = new Set<VertexId>();
  for (const edgeId of playerEdges) {
    const edge = state.board.graph.edges.get(edgeId)!;
    startVertices.add(edge.vertices[0]);
    startVertices.add(edge.vertices[1]);
  }

  for (const startVertex of startVertices) {
    dfs(startVertex, new Set(), 0);
  }

  return maxLength;
}

export function updateLongestRoad(state: GameState): GameState {
  let newState = state;
  const currentHolder = state.players.find(p => p.hasLongestRoad);
  const currentLength = currentHolder ? calculateLongestRoad(state, currentHolder.id) : 0;

  let bestPlayerId: string | null = null;
  let bestLength = Math.max(4, currentLength); // must be > current length, min 5

  for (const player of state.players) {
    const length = calculateLongestRoad(state, player.id);
    if (length >= 5 && length > bestLength) {
      bestLength = length;
      bestPlayerId = player.id;
    }
  }

  if (bestPlayerId && bestPlayerId !== currentHolder?.id) {
    const updatedPlayers = newState.players.map(p => {
      if (p.hasLongestRoad) return { ...p, hasLongestRoad: false };
      if (p.id === bestPlayerId) return { ...p, hasLongestRoad: true };
      return p;
    });
    newState = { ...newState, players: updatedPlayers, longestRoadLength: bestLength };
  }

  return newState;
}

export function updateVictoryState(state: GameState): GameState {
  let newState = updateLongestRoad(state);

  // Update VP for all players
  const updatedPlayers = newState.players.map(p => ({
    ...p,
    victoryPoints: calculateTotalVP(newState, p.id),
  }));
  newState = { ...newState, players: updatedPlayers };

  const winner = checkVictory(newState);
  if (winner) {
    newState = { ...newState, phase: 'finished', winner };
  }

  return newState;
}
