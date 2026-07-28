import { describe, expect, it } from 'vitest';

import {
  sortUserGoodsStatuses,
  userGoodsStatusSchema,
} from './user-goods-status';

describe('sortUserGoodsStatuses', () => {
  it('orders statuses owned, wanted, exchange regardless of input order', () => {
    expect(sortUserGoodsStatuses(['exchange', 'owned', 'wanted'])).toEqual([
      'owned',
      'wanted',
      'exchange',
    ]);
  });

  it('deduplicates', () => {
    expect(sortUserGoodsStatuses(['owned', 'owned', 'wanted'])).toEqual([
      'owned',
      'wanted',
    ]);
  });

  it('handles an empty input', () => {
    expect(sortUserGoodsStatuses([])).toEqual([]);
  });
});

describe('userGoodsStatusSchema', () => {
  it('accepts exactly the three values the enum column allows', () => {
    for (const value of ['owned', 'wanted', 'exchange']) {
      expect(userGoodsStatusSchema.parse(value)).toBe(value);
    }
  });

  it('rejects anything else', () => {
    expect(() => userGoodsStatusSchema.parse('collected')).toThrow();
    expect(() => userGoodsStatusSchema.parse('')).toThrow();
  });
});
