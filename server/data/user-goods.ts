import 'server-only';

import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';

import { exchanges, userGoods } from '@/drizzle/schema';
import {
  sortUserGoodsStatuses,
  userGoodsStatusSchema,
  type UserGoodsStatus,
} from '@/lib/user-goods-status';
import { getDb, type DatabaseTransaction } from '@/server/db/client';

const userGoodsStateInputSchema = z.object({
  userId: z.string().uuid(),
  goodsIds: z.array(z.string().uuid()).min(1).max(100),
});

const singleUserGoodsStateInputSchema = z.object({
  userId: z.string().uuid(),
  goodsId: z.string().uuid(),
});

const toggleUserGoodsStatusInputSchema = z.object({
  userId: z.string().uuid(),
  goodsId: z.string().uuid(),
  status: userGoodsStatusSchema,
});

const updateUserGoodsDetailsInputSchema = z
  .object({
    userId: z.string().uuid(),
    goodsId: z.string().uuid(),
    status: userGoodsStatusSchema,
    quantity: z.number().int().min(1).max(999),
    tradableQuantity: z.number().int().min(0).max(999),
    wishlistPriority: z.enum(['normal', 'super_want']),
  })
  .superRefine((value, context) => {
    if (value.tradableQuantity > value.quantity) {
      context.addIssue({
        code: 'custom',
        message: '可交换数量不能超过总数量。',
      });
    }
    if (value.status !== 'exchange' && value.tradableQuantity !== 0) {
      context.addIssue({
        code: 'custom',
        message: '只有可交换状态可设置可交换数量。',
      });
    }
  });

export type UserGoodsStateSnapshot = {
  goodsId: string;
  statuses: Array<{
    status: UserGoodsStatus;
    quantity: number;
    tradableQuantity: number;
    wishlistPriority: 'normal' | 'super_want';
    note: string | null;
    litAt: Date | null;
    updatedAt: Date;
  }>;
};

export function createEmptyUserGoodsStateSnapshot(
  goodsId: string,
): UserGoodsStateSnapshot {
  return {
    goodsId,
    statuses: [],
  };
}

export function getUserGoodsStateFlags(snapshot: UserGoodsStateSnapshot) {
  const cabinetEntry = snapshot.statuses.find(
    ({ status }) => status === 'owned',
  );

  return {
    isInCabinet: Boolean(cabinetEntry),
    isLit: Boolean(cabinetEntry?.litAt),
    // 业务上的「拥有」必须经过识别点亮。原始 owned 行只是谷柜收藏记录。
    isOwned: Boolean(cabinetEntry?.litAt),
    isWanted: snapshot.statuses.some(({ status }) => status === 'wanted'),
    isExchange: snapshot.statuses.some(({ status }) => status === 'exchange'),
    activeStatuses: sortUserGoodsStatuses(
      snapshot.statuses.map(({ status }) => status),
    ),
  };
}

export async function getUserGoodsStateMap(
  input: z.input<typeof userGoodsStateInputSchema>,
) {
  const db = getDb();
  const { userId, goodsIds } = userGoodsStateInputSchema.parse(input);

  const rows = await db
    .select({
      goodsId: userGoods.goodsId,
      status: userGoods.status,
      quantity: userGoods.quantity,
      tradableQuantity: userGoods.tradableQuantity,
      wishlistPriority: userGoods.wishlistPriority,
      note: userGoods.note,
      litAt: userGoods.litAt,
      updatedAt: userGoods.updatedAt,
    })
    .from(userGoods)
    .where(
      and(eq(userGoods.userId, userId), inArray(userGoods.goodsId, goodsIds)),
    )
    .orderBy(asc(userGoods.goodsId), asc(userGoods.status));

  const snapshots = Object.fromEntries(
    goodsIds.map((goodsId) => [
      goodsId,
      createEmptyUserGoodsStateSnapshot(goodsId),
    ]),
  ) as Record<string, UserGoodsStateSnapshot>;

  for (const row of rows) {
    snapshots[row.goodsId].statuses.push({
      status: row.status,
      quantity: row.quantity,
      tradableQuantity: row.tradableQuantity,
      wishlistPriority: row.wishlistPriority,
      note: row.note,
      litAt: row.litAt,
      updatedAt: row.updatedAt,
    });
  }

  return snapshots;
}

export async function getUserGoodsStateForGood(
  input: z.input<typeof singleUserGoodsStateInputSchema>,
) {
  const { userId, goodsId } = singleUserGoodsStateInputSchema.parse(input);
  const snapshots = await getUserGoodsStateMap({
    userId,
    goodsIds: [goodsId],
  });

  return snapshots[goodsId];
}

export async function toggleUserGoodsStatus(
  input: z.input<typeof toggleUserGoodsStatusInputSchema>,
) {
  const db = getDb();
  const { userId, goodsId, status } =
    toggleUserGoodsStatusInputSchema.parse(input);

  await db.transaction(async (tx) => {
    const existing = (
      await tx
        .select({ id: userGoods.id })
        .from(userGoods)
        .where(
          and(
            eq(userGoods.userId, userId),
            eq(userGoods.goodsId, goodsId),
            eq(userGoods.status, status),
          ),
        )
        .limit(1)
        .for('update')
    )[0];

    if (existing) {
      if (
        status === 'exchange' &&
        (await getReservedExchangeQuantity(tx, userId, goodsId)) > 0
      ) {
        throw new Error('RESERVED_TRADE_INVENTORY');
      }
      if (status === 'owned') {
        const activeExchange = await tx
          .select({ id: userGoods.id })
          .from(userGoods)
          .where(
            and(
              eq(userGoods.userId, userId),
              eq(userGoods.goodsId, goodsId),
              eq(userGoods.status, 'exchange'),
            ),
          )
          .limit(1)
          .for('update');

        if (activeExchange.length > 0) {
          throw new Error('ACTIVE_EXCHANGE_STATUS');
        }
      }
      await tx.delete(userGoods).where(eq(userGoods.id, existing.id));
      return;
    }

    if (status === 'exchange') {
      const litOwned = await tx
        .select({ id: userGoods.id })
        .from(userGoods)
        .where(
          and(
            eq(userGoods.userId, userId),
            eq(userGoods.goodsId, goodsId),
            eq(userGoods.status, 'owned'),
            isNotNull(userGoods.litAt),
          ),
        )
        .limit(1)
        .for('update');

      if (litOwned.length === 0) {
        throw new Error('UNLIT_GOODS');
      }
    }
    await tx.insert(userGoods).values({
      userId,
      goodsId,
      status,
      tradableQuantity: status === 'exchange' ? 1 : 0,
    });
  });

  return (
    (await getUserGoodsStateForGood({
      userId,
      goodsId,
    })) ?? createEmptyUserGoodsStateSnapshot(goodsId)
  );
}

export async function updateUserGoodsDetails(
  input: z.input<typeof updateUserGoodsDetailsInputSchema>,
) {
  const value = updateUserGoodsDetailsInputSchema.parse(input);
  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    const locked = (
      await tx
        .select({ id: userGoods.id })
        .from(userGoods)
        .where(
          and(
            eq(userGoods.userId, value.userId),
            eq(userGoods.goodsId, value.goodsId),
            eq(userGoods.status, value.status),
          ),
        )
        .limit(1)
        .for('update')
    )[0];
    if (!locked) return [];
    if (value.status === 'exchange') {
      const litOwned = (
        await tx
          .select({ quantity: userGoods.quantity })
          .from(userGoods)
          .where(
            and(
              eq(userGoods.userId, value.userId),
              eq(userGoods.goodsId, value.goodsId),
              eq(userGoods.status, 'owned'),
              isNotNull(userGoods.litAt),
            ),
          )
          .limit(1)
          .for('update')
      )[0];

      if (!litOwned) {
        throw new Error('UNLIT_GOODS');
      }

      const reserved = await getReservedExchangeQuantity(
        tx,
        value.userId,
        value.goodsId,
      );
      if (
        value.quantity < reserved ||
        value.tradableQuantity > value.quantity - reserved ||
        value.quantity > litOwned.quantity
      ) {
        throw new Error('RESERVED_TRADE_INVENTORY');
      }
    } else if (value.status === 'owned') {
      const exchangeRow = (
        await tx
          .select({ quantity: userGoods.quantity })
          .from(userGoods)
          .where(
            and(
              eq(userGoods.userId, value.userId),
              eq(userGoods.goodsId, value.goodsId),
              eq(userGoods.status, 'exchange'),
            ),
          )
          .limit(1)
          .for('update')
      )[0];

      if (exchangeRow && value.quantity < exchangeRow.quantity) {
        throw new Error('ACTIVE_EXCHANGE_STATUS');
      }
    }
    return tx
      .update(userGoods)
      .set({
        quantity: value.quantity,
        tradableQuantity: value.tradableQuantity,
        wishlistPriority: value.wishlistPriority,
        updatedAt: new Date(),
      })
      .where(eq(userGoods.id, locked.id))
      .returning({ id: userGoods.id });
  });

  return updated.length > 0;
}

async function getReservedExchangeQuantity(
  tx: DatabaseTransaction,
  userId: string,
  goodsId: string,
) {
  const [offered, requested] = await Promise.all([
    tx
      .select({
        total: sql<number>`coalesce(sum(${exchanges.offeredQuantity}), 0)::int`,
      })
      .from(exchanges)
      .where(
        and(
          eq(exchanges.initiatorId, userId),
          eq(exchanges.offeredGoodsId, goodsId),
          inArray(exchanges.status, ['accepted', 'shipping', 'received']),
          isNotNull(exchanges.inventoryReservedAt),
          isNull(exchanges.inventoryReleasedAt),
        ),
      ),
    tx
      .select({
        total: sql<number>`coalesce(sum(${exchanges.requestedQuantity}), 0)::int`,
      })
      .from(exchanges)
      .where(
        and(
          eq(exchanges.recipientId, userId),
          eq(exchanges.requestedGoodsId, goodsId),
          inArray(exchanges.status, ['accepted', 'shipping', 'received']),
          isNotNull(exchanges.inventoryReservedAt),
          isNull(exchanges.inventoryReleasedAt),
        ),
      ),
  ]);
  return (offered[0]?.total ?? 0) + (requested[0]?.total ?? 0);
}
