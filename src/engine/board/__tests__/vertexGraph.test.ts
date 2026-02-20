import { describe, it, expect } from 'vitest';
import { createDefaultBoard } from '../boardSetup';

describe('vertexGraph', () => {
  it('Catan board has exactly 54 vertices', () => {
    const board = createDefaultBoard();
    expect(board.vertices.size).toBe(54);
  });

  it('each vertex has 2 or 3 adjacent hexes', () => {
    const board = createDefaultBoard();
    for (const [, vertex] of board.vertices) {
      expect(vertex.adjacentHexes.length).toBeGreaterThanOrEqual(1);
      expect(vertex.adjacentHexes.length).toBeLessThanOrEqual(3);
    }
  });

  it('each vertex has 2 or 3 adjacent vertices', () => {
    const board = createDefaultBoard();
    for (const [, vertex] of board.vertices) {
      expect(vertex.adjacentVertices.length).toBeGreaterThanOrEqual(2);
      expect(vertex.adjacentVertices.length).toBeLessThanOrEqual(3);
    }
  });

  it('each vertex has 2 or 3 adjacent edges', () => {
    const board = createDefaultBoard();
    for (const [, vertex] of board.vertices) {
      expect(vertex.adjacentEdges.length).toBeGreaterThanOrEqual(2);
      expect(vertex.adjacentEdges.length).toBeLessThanOrEqual(3);
    }
  });
});
