import { describe, expect, it } from 'vitest';

import {
  createEmptyUserGoodsStateSnapshot,
  getUserGoodsStateFlags,
  type UserGoodsStateSnapshot,
} from './user-goods';

function cabinetSnapshot(litAt: Date | null): UserGoodsStateSnapshot {
  return {
    goodsId: '10000000-0000-4000-8000-000000000001',
    statuses: [
      {
        status: 'owned',
        quantity: 1,
        tradableQuantity: 0,
        wishlistPriority: 'normal',
        note: null,
        litAt,
        updatedAt: new Date('2026-08-22T00:00:00.000Z'),
      },
    ],
  };
}

describe('getUserGoodsStateFlags', () => {
  it('keeps a manually saved cabinet entry dormant', () => {
    expect(getUserGoodsStateFlags(cabinetSnapshot(null))).toMatchObject({
      isInCabinet: true,
      isLit: false,
      isOwned: false,
      activeStatuses: ['owned'],
    });
  });

  it('only treats a cabinet entry with litAt as owned and lit', () => {
    expect(
      getUserGoodsStateFlags(cabinetSnapshot(new Date('2026-08-22T01:00:00Z'))),
    ).toMatchObject({
      isInCabinet: true,
      isLit: true,
      isOwned: true,
    });
  });

  it('keeps an untracked SKU dormant', () => {
    expect(
      getUserGoodsStateFlags(
        createEmptyUserGoodsStateSnapshot(
          '10000000-0000-4000-8000-000000000001',
        ),
      ),
    ).toMatchObject({
      isInCabinet: false,
      isLit: false,
      isOwned: false,
    });
  });
});
