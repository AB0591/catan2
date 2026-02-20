import { describe, it, expect } from 'vitest';
import { createPlayer, calculateVictoryPoints } from '../playerState';
import type { PlayerState } from '../playerState';

describe('createPlayer', () => {
  it('creates player with correct defaults', () => {
    const player = createPlayer('p1', 'Alice', 'red');
    expect(player.id).toBe('p1');
    expect(player.name).toBe('Alice');
    expect(player.color).toBe('red');
    expect(player.resources).toEqual({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
    expect(player.settlements).toBe(5);
    expect(player.cities).toBe(4);
    expect(player.roads).toBe(15);
    expect(player.developmentCards).toEqual([]);
    expect(player.victoryPoints).toBe(0);
    expect(player.knightsPlayed).toBe(0);
    expect(player.hasLargestArmy).toBe(false);
    expect(player.hasLongestRoad).toBe(false);
  });
});

describe('calculateVictoryPoints', () => {
  it('returns 0 for new player', () => {
    const player = createPlayer('p1', 'Alice', 'red');
    expect(calculateVictoryPoints(player)).toBe(0);
  });

  it('counts settlements placed correctly (5 - remaining)', () => {
    const player: PlayerState = { ...createPlayer('p1', 'Alice', 'red'), settlements: 3 };
    // 5 - 3 = 2 settlements placed = 2 VP
    expect(calculateVictoryPoints(player)).toBe(2);
  });

  it('counts cities placed correctly', () => {
    const player: PlayerState = { ...createPlayer('p1', 'Alice', 'red'), settlements: 4, cities: 2 };
    // 1 settlement placed + 2 cities placed = 1 + 4 = 5
    expect(calculateVictoryPoints(player)).toBe(5);
  });

  it('counts VP dev cards', () => {
    const player: PlayerState = {
      ...createPlayer('p1', 'Alice', 'red'),
      developmentCards: [
        { type: 'victoryPoint', playedThisTurn: false },
        { type: 'victoryPoint', playedThisTurn: false },
        { type: 'knight', playedThisTurn: false },
      ],
    };
    expect(calculateVictoryPoints(player)).toBe(2);
  });

  it('counts largest army and longest road bonuses', () => {
    const player: PlayerState = {
      ...createPlayer('p1', 'Alice', 'red'),
      hasLargestArmy: true,
      hasLongestRoad: true,
    };
    expect(calculateVictoryPoints(player)).toBe(4);
  });
});
