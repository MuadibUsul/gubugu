import { describe, expect, it } from 'vitest';

import { cosineSimilarity, rankByCosineSimilarity } from './vector-similarity';

describe('cosineSimilarity', () => {
  it('scores an identical vector as 1', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('is scale invariant, so magnitude does not affect ranking', () => {
    expect(cosineSimilarity([1, 2, 3], [10, 20, 30])).toBeCloseTo(1, 10);
  });

  it('scores an orthogonal vector as 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('scores an opposite vector as -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
  });

  it('never exceeds 1 despite floating point drift', () => {
    const vector = [0.1, 0.2, 0.3, 0.4];
    const score = cosineSimilarity(vector, vector);

    expect(score).not.toBeNull();
    expect(score as number).toBeLessThanOrEqual(1);
  });

  // Returning null rather than NaN keeps a broken embedding from being ranked
  // as a weak match instead of being discarded.
  it('returns null on mismatched dimensions', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBeNull();
  });

  it('returns null on empty vectors', () => {
    expect(cosineSimilarity([], [])).toBeNull();
  });

  it('returns null when either vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBeNull();
    expect(cosineSimilarity([1, 1], [0, 0])).toBeNull();
  });

  it('returns null when a component is not finite', () => {
    expect(cosineSimilarity([1, Number.NaN], [1, 2])).toBeNull();
    expect(cosineSimilarity([1, 2], [1, Number.POSITIVE_INFINITY])).toBeNull();
  });
});

describe('rankByCosineSimilarity', () => {
  const candidates = [
    { item: 'opposite', vector: [-1, 0] },
    { item: 'exact', vector: [1, 0] },
    { item: 'orthogonal', vector: [0, 1] },
    { item: 'close', vector: [0.9, 0.1] },
  ];

  it('returns the best match first', () => {
    const ranked = rankByCosineSimilarity([1, 0], candidates, {
      minScore: -1,
    });

    expect(ranked.map((entry) => entry.item)).toEqual([
      'exact',
      'close',
      'orthogonal',
      'opposite',
    ]);
  });

  it('drops candidates below minScore', () => {
    const ranked = rankByCosineSimilarity([1, 0], candidates, {
      minScore: 0.5,
    });

    expect(ranked.map((entry) => entry.item)).toEqual(['exact', 'close']);
  });

  it('defaults to dropping negative and zero scores', () => {
    const ranked = rankByCosineSimilarity([1, 0], candidates);

    expect(ranked.map((entry) => entry.item)).toEqual([
      'exact',
      'close',
      'orthogonal',
    ]);
  });

  it('limits after ranking, not before', () => {
    const ranked = rankByCosineSimilarity([1, 0], candidates, {
      minScore: -1,
      limit: 2,
    });

    expect(ranked.map((entry) => entry.item)).toEqual(['exact', 'close']);
  });

  it('drops an uncomparable candidate instead of ranking it last', () => {
    const ranked = rankByCosineSimilarity(
      [1, 0],
      [
        { item: 'wrong-dimensions', vector: [1, 0, 0] },
        { item: 'zero', vector: [0, 0] },
        { item: 'fine', vector: [1, 0] },
      ],
      { minScore: -1 },
    );

    expect(ranked.map((entry) => entry.item)).toEqual(['fine']);
  });

  it('returns nothing when there are no candidates', () => {
    expect(rankByCosineSimilarity([1, 0], [])).toEqual([]);
  });
});
