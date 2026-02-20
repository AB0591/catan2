import { describe, it, expect } from 'vitest';
import { createBoard, createDefaultBoard } from '../boardSetup';

describe('boardSetup', () => {
  it('board has exactly 19 hexes', () => {
    const board = createDefaultBoard();
    expect(board.hexes.length).toBe(19);
  });

  it('resource distribution is correct', () => {
    const board = createDefaultBoard();
    const counts: Record<string, number> = {};
    for (const hex of board.hexes) {
      counts[hex.resource] = (counts[hex.resource] ?? 0) + 1;
    }
    expect(counts['wood']).toBe(4);
    expect(counts['sheep']).toBe(4);
    expect(counts['wheat']).toBe(4);
    expect(counts['brick']).toBe(3);
    expect(counts['ore']).toBe(3);
    expect(counts['desert']).toBe(1);
  });

  it('18 number tokens placed, none on desert', () => {
    const board = createDefaultBoard();
    const withTokens = board.hexes.filter(h => h.numberToken !== null);
    const desertWithToken = board.hexes.find(h => h.resource === 'desert' && h.numberToken !== null);
    expect(withTokens.length).toBe(18);
    expect(desertWithToken).toBeUndefined();
  });

  it('number token values are valid', () => {
    const board = createDefaultBoard();
    const valid = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
    for (const hex of board.hexes) {
      if (hex.numberToken !== null) {
        expect(valid).toContain(hex.numberToken);
      }
    }
  });

  it('robber starts on desert hex', () => {
    const board = createDefaultBoard();
    const desert = board.hexes.find(h => h.resource === 'desert')!;
    expect(board.robberHex).toEqual(desert.coord);
  });

  it('determinism: two boards with same seed are identical', () => {
    const board1 = createBoard(123);
    const board2 = createBoard(123);
    expect(board1.hexes).toEqual(board2.hexes);
    expect(board1.robberHex).toEqual(board2.robberHex);
  });
});
