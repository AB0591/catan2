import { describe, it, expect } from 'vitest';
import { createDefaultBoard } from '../boardSetup';

describe('edgeGraph', () => {
  it('Catan board has exactly 72 edges', () => {
    const board = createDefaultBoard();
    expect(board.edges.size).toBe(72);
  });

  it('each edge connects exactly 2 vertices', () => {
    const board = createDefaultBoard();
    for (const [, edge] of board.edges) {
      expect(edge.vertices.length).toBe(2);
      expect(edge.vertices[0]).not.toBe(edge.vertices[1]);
    }
  });

  it('each edge has 1 or 2 adjacent hexes', () => {
    const board = createDefaultBoard();
    for (const [, edge] of board.edges) {
      expect(edge.adjacentHexes.length).toBeGreaterThanOrEqual(1);
      expect(edge.adjacentHexes.length).toBeLessThanOrEqual(2);
    }
  });
});
