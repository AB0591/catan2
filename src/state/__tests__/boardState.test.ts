import { describe, it, expect } from 'vitest';
import { createBoardState } from '../boardState';
import { createBoard } from '../../engine/board';

describe('createBoardState', () => {
  const board = createBoard(42);
  const boardState = createBoardState(board, []);

  it('starts with empty buildings', () => {
    expect(boardState.buildings).toEqual({});
  });

  it('starts with empty roads', () => {
    expect(boardState.roads).toEqual({});
  });

  it('buildings is empty object', () => {
    expect(Object.keys(boardState.buildings)).toHaveLength(0);
  });

  it('roads is empty object', () => {
    expect(Object.keys(boardState.roads)).toHaveLength(0);
  });

  it('robberHex matches board desert hex', () => {
    expect(boardState.robberHex).toEqual(board.robberHex);
    // robberHex should be the desert tile
    const desertHex = board.hexes.find(h => h.resource === 'desert');
    expect(boardState.robberHex).toEqual(desertHex?.coord);
  });
});
