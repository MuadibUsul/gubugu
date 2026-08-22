import { describe, expect, it } from 'vitest';

import { canReserveLitTradeInventory } from './inventory';

const exchangeRow = { id: 'exchange-row', tradableQuantity: 2 };
const litOwnedRow = { quantity: 2, litAt: new Date('2026-08-22T00:00:00Z') };

describe('canReserveLitTradeInventory', () => {
  it('requires both sufficient exchange inventory and a lit owned row', () => {
    expect(canReserveLitTradeInventory(exchangeRow, litOwnedRow, 2)).toBe(true);
    expect(
      canReserveLitTradeInventory(
        exchangeRow,
        { ...litOwnedRow, litAt: null },
        1,
      ),
    ).toBe(false);
    expect(canReserveLitTradeInventory(exchangeRow, undefined, 1)).toBe(false);
    expect(canReserveLitTradeInventory(exchangeRow, litOwnedRow, 0)).toBe(
      false,
    );
    expect(
      canReserveLitTradeInventory(
        { ...exchangeRow, tradableQuantity: 1 },
        litOwnedRow,
        2,
      ),
    ).toBe(false);
    expect(
      canReserveLitTradeInventory(
        exchangeRow,
        { ...litOwnedRow, quantity: 1 },
        2,
      ),
    ).toBe(false);
  });
});
