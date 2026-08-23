import { describe, expect, it } from 'vitest';

import {
  asLeaderboardDimension,
  boardFor,
  rankLeaderboard,
} from './leaderboard';

describe('asLeaderboardDimension', () => {
  it('keeps a valid dimension', () => {
    expect(asLeaderboardDimension('breadth')).toBe('breadth');
  });

  it('falls back to the default for junk', () => {
    expect(asLeaderboardDimension('nope')).toBe('lit');
    expect(asLeaderboardDimension(null)).toBe('lit');
    expect(asLeaderboardDimension(undefined)).toBe('lit');
  });
});

describe('boardFor', () => {
  it('returns the matching board', () => {
    expect(boardFor('momentum').label).toBe('近月势头');
  });
});

describe('rankLeaderboard', () => {
  it('ranks descending by value', () => {
    const ranked = rankLeaderboard([
      { id: 'a', value: 3 },
      { id: 'b', value: 9 },
      { id: 'c', value: 5 },
    ]);

    expect(ranked.map((r) => [r.id, r.rank])).toEqual([
      ['b', 1],
      ['c', 2],
      ['a', 3],
    ]);
  });

  // Competition ranking: a tie shares a rank and the next value skips.
  it('gives tied values the same rank and skips the next', () => {
    const ranked = rankLeaderboard([
      { id: 'a', value: 10 },
      { id: 'b', value: 7 },
      { id: 'c', value: 7 },
      { id: 'd', value: 4 },
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it('drops non-positive values so empty collections never appear', () => {
    const ranked = rankLeaderboard([
      { id: 'a', value: 0 },
      { id: 'b', value: 2 },
      { id: 'c', value: -1 },
    ]);

    expect(ranked.map((r) => r.id)).toEqual(['b']);
  });

  it('sorts unordered input before ranking', () => {
    const ranked = rankLeaderboard([
      { id: 'low', value: 1 },
      { id: 'high', value: 100 },
    ]);

    expect(ranked[0].id).toBe('high');
    expect(ranked[0].rank).toBe(1);
  });
});
