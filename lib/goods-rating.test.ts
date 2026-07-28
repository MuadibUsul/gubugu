import { describe, expect, it } from 'vitest';

import {
  calculateGoodsRatingScore,
  createDefaultGoodsRatingValues,
  goodsRatingValueSchema,
} from './goods-rating';

const perfect = {
  artworkScore: 5,
  craftsmanshipScore: 5,
  valueScore: 5,
  rarityScore: 5,
  satisfactionScore: 5,
};

describe('calculateGoodsRatingScore', () => {
  it('averages the five dimensions to two decimals', () => {
    expect(
      calculateGoodsRatingScore({
        artworkScore: 5,
        craftsmanshipScore: 4,
        valueScore: 3,
        rarityScore: 2,
        satisfactionScore: 1,
      }),
    ).toBe('3.00');
  });

  it('keeps the result inside the range the ratings_score_range_check constraint allows', () => {
    // The column is numeric(4, 2) with `score between 1 and 5`, so both bounds
    // must survive the toFixed(2) formatting.
    expect(calculateGoodsRatingScore(perfect)).toBe('5.00');
    expect(
      calculateGoodsRatingScore({
        artworkScore: 1,
        craftsmanshipScore: 1,
        valueScore: 1,
        rarityScore: 1,
        satisfactionScore: 1,
      }),
    ).toBe('1.00');
  });

  it('rounds rather than truncating a repeating average', () => {
    // 1+1+1+1+2 = 6 / 5 = 1.2 exactly; 4+4+4+4+5 = 21 / 5 = 4.2
    expect(
      calculateGoodsRatingScore({
        artworkScore: 4,
        craftsmanshipScore: 4,
        valueScore: 4,
        rarityScore: 4,
        satisfactionScore: 5,
      }),
    ).toBe('4.20');
  });
});

describe('goodsRatingValueSchema', () => {
  it('coerces the string values a form submission produces', () => {
    const parsed = goodsRatingValueSchema.parse({
      ...perfect,
      artworkScore: '4',
      worthBuying: true,
      overallTag: 'positive',
    });

    expect(parsed.artworkScore).toBe(4);
  });

  it('rejects scores outside 1-5 before they reach the check constraint', () => {
    expect(() =>
      goodsRatingValueSchema.parse({
        ...perfect,
        artworkScore: 6,
        worthBuying: false,
        overallTag: 'neutral',
      }),
    ).toThrow();

    expect(() =>
      goodsRatingValueSchema.parse({
        ...perfect,
        artworkScore: 0,
        worthBuying: false,
        overallTag: 'neutral',
      }),
    ).toThrow();
  });

  it('rejects fractional scores', () => {
    expect(() =>
      goodsRatingValueSchema.parse({
        ...perfect,
        artworkScore: 3.5,
        worthBuying: false,
        overallTag: 'neutral',
      }),
    ).toThrow();
  });

  it('accepts its own defaults', () => {
    expect(() =>
      goodsRatingValueSchema.parse(createDefaultGoodsRatingValues()),
    ).not.toThrow();
  });
});
