import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import {
  distributeResources,
  addResources,
  removeResources,
  hasResources,
  totalResources,
} from '../resourceDistribution';
import type { GameState } from '../../../state/gameState';

function make2PlayerState() {
  return createInitialGameState([
    { id: 'p1', name: 'Player 1', color: 'red' },
    { id: 'p2', name: 'Player 2', color: 'blue' },
  ], 42);
}

/** Find a hex with a given numberToken and return a vertex adjacent to it */
function findVertexForHex(state: GameState, numberToken: number): { vertexId: string; resource: string } | null {
  for (const hex of state.board.graph.hexes) {
    if (hex.numberToken === numberToken && hex.resource !== 'desert') {
      const hexKey = `${hex.coord.q},${hex.coord.r}`;
      for (const [vertexId, vertex] of state.board.graph.vertices) {
        void hexKey;
        if (vertex.adjacentHexes.some(h => h.q === hex.coord.q && h.r === hex.coord.r)) {
          return { vertexId, resource: hex.resource };
        }
      }
    }
  }
  return null;
}

describe('distributeResources', () => {
  it('settlement adjacent to hex with matching roll receives 1 resource', () => {
    const state = make2PlayerState();
    const found = findVertexForHex(state, 6);
    if (!found) return; // board might not have token 6

    const { vertexId, resource } = found;
    const stateWithBuilding: GameState = {
      ...state,
      board: {
        ...state.board,
        buildings: { ...state.board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
      },
    };

    const after = distributeResources(stateWithBuilding, 6);
    expect(after.players[0].resources[resource as import("../../../state/playerState").ResourceType]).toBeGreaterThanOrEqual(1);
  });

  it('city adjacent to hex with matching roll receives 2 resources', () => {
    const state = make2PlayerState();
    const found = findVertexForHex(state, 5);
    if (!found) return;

    const { vertexId, resource } = found;
    const stateWithCity: GameState = {
      ...state,
      board: {
        ...state.board,
        buildings: { ...state.board.buildings, [vertexId]: { type: 'city', playerId: 'p1' } },
      },
    };

    const after = distributeResources(stateWithCity, 5);
    expect(after.players[0].resources[resource as import("../../../state/playerState").ResourceType]).toBeGreaterThanOrEqual(2);
  });

  it('no resources distributed on roll of 7', () => {
    const state = make2PlayerState();
    const found = findVertexForHex(state, 6);
    if (!found) return;

    const { vertexId } = found;
    const stateWithBuilding: GameState = {
      ...state,
      board: {
        ...state.board,
        buildings: { ...state.board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
      },
    };

    const after = distributeResources(stateWithBuilding, 7);
    // Players should have same resources as before
    expect(after.players[0].resources).toEqual(stateWithBuilding.players[0].resources);
  });

  it('robber hex produces no resources', () => {
    const state = make2PlayerState();
    // Find a non-desert hex and put the robber on it
    const targetHex = state.board.graph.hexes.find(h => h.numberToken !== null && h.resource !== 'desert');
    if (!targetHex) return;

    const found = findVertexForHex(state, targetHex.numberToken!);
    if (!found) return;

    const { vertexId } = found;
    const stateWithRobber: GameState = {
      ...state,
      board: {
        ...state.board,
        robberHex: targetHex.coord,
        buildings: { ...state.board.buildings, [vertexId]: { type: 'settlement', playerId: 'p1' } },
      },
    };

    const before = stateWithRobber.players[0].resources[targetHex.resource as import("../../../state/playerState").ResourceType];
    const after = distributeResources(stateWithRobber, targetHex.numberToken!);
    const afterVal = after.players[0].resources[targetHex.resource as import("../../../state/playerState").ResourceType];
    expect(afterVal).toBe(before); // no change
  });

  it('multiple players receive resources simultaneously', () => {
    const state = make2PlayerState();
    // Find a hex with token 8 and place settlements for both players on different vertices
    const hex8 = state.board.graph.hexes.find(h => h.numberToken === 8 && h.resource !== 'desert');
    if (!hex8) return;

    const adjacentVertices: string[] = [];
    for (const [vertexId, vertex] of state.board.graph.vertices) {
      if (vertex.adjacentHexes.some(h => h.q === hex8.coord.q && h.r === hex8.coord.r)) {
        adjacentVertices.push(vertexId);
      }
    }
    if (adjacentVertices.length < 2) return;

    const stateWithBuildings: GameState = {
      ...state,
      board: {
        ...state.board,
        buildings: {
          [adjacentVertices[0]]: { type: 'settlement', playerId: 'p1' },
          [adjacentVertices[1]]: { type: 'settlement', playerId: 'p2' },
        },
      },
    };

    const after = distributeResources(stateWithBuildings, 8);
    const resource = hex8.resource as import("../../../state/playerState").ResourceType;
    expect(after.players[0].resources[resource]).toBeGreaterThanOrEqual(1);
    expect(after.players[1].resources[resource]).toBeGreaterThanOrEqual(1);
  });
});

describe('hasResources', () => {
  it('returns true when sufficient', () => {
    const state = make2PlayerState();
    const player = { ...state.players[0], resources: { wood: 2, brick: 1, sheep: 0, wheat: 0, ore: 0 } };
    expect(hasResources(player, { wood: 2, brick: 1 })).toBe(true);
  });

  it('returns false when insufficient', () => {
    const state = make2PlayerState();
    const player = { ...state.players[0], resources: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
    expect(hasResources(player, { wood: 2 })).toBe(false);
  });
});

describe('removeResources', () => {
  it('returns null when insufficient', () => {
    const state = make2PlayerState();
    const player = state.players[0];
    expect(removeResources(player, { wood: 1 })).toBeNull();
  });

  it('deducts correctly when sufficient', () => {
    const state = make2PlayerState();
    const player = { ...state.players[0], resources: { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
    const updated = removeResources(player, { wood: 2 });
    expect(updated).not.toBeNull();
    expect(updated!.resources.wood).toBe(1);
  });
});

describe('addResources', () => {
  it('correctly adds to existing count', () => {
    const state = make2PlayerState();
    const player = { ...state.players[0], resources: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 } };
    const updated = addResources(player, { wood: 3, ore: 1 });
    expect(updated.resources.wood).toBe(5);
    expect(updated.resources.ore).toBe(1);
  });
});

describe('totalResources', () => {
  it('sums all resource types', () => {
    const state = make2PlayerState();
    const player = { ...state.players[0], resources: { wood: 1, brick: 2, sheep: 3, wheat: 4, ore: 5 } };
    expect(totalResources(player)).toBe(15);
  });

  it('returns 0 for empty hand', () => {
    const state = make2PlayerState();
    expect(totalResources(state.players[0])).toBe(0);
  });
});
