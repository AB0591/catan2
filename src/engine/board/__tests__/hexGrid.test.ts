import { describe, it, expect } from 'vitest';
import { hexesInRange, hexNeighbors, hexDistance, hexEquals } from '../hexGrid';

describe('hexGrid', () => {
  it('hexesInRange(origin, 2) returns 19 hexes', () => {
    const hexes = hexesInRange({ q: 0, r: 0 }, 2);
    expect(hexes.length).toBe(19);
  });

  it('hexNeighbors returns 6 neighbors', () => {
    const neighbors = hexNeighbors({ q: 0, r: 0 });
    expect(neighbors.length).toBe(6);
  });

  it('hexDistance is correct for known pairs', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
    expect(hexDistance({ q: -2, r: 2 }, { q: 2, r: -2 })).toBe(4);
  });

  it('hexEquals works', () => {
    expect(hexEquals({ q: 1, r: 2 }, { q: 1, r: 2 })).toBe(true);
    expect(hexEquals({ q: 1, r: 2 }, { q: 1, r: 3 })).toBe(false);
  });
});
