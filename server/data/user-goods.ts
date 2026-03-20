import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { userGoods } from '@/drizzle/schema';
import {
  sortUserGoodsStatuses,
  userGoodsStatusSchema,
  type UserGoodsStatus,
} from '@/lib/user-goods-status';
import { getDb } from '@/server/db/client';

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

export type UserGoodsStateSnapshot = {
  goodsId: string;
  statuses: Array<{
    status: UserGoodsStatus;
    note: string | null;
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
  return {
    isOwned: snapshot.statuses.some(({ status }) => status === 'owned'),
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
      note: userGoods.note,
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
      note: row.note,
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

  const existingRows = await db
    .select({
      id: userGoods.id,
    })
    .from(userGoods)
    .where(
      and(
        eq(userGoods.userId, userId),
        eq(userGoods.goodsId, goodsId),
        eq(userGoods.status, status),
      ),
    )
    .limit(1);

  const existing = existingRows[0];

  if (existing) {
    await db.delete(userGoods).where(eq(userGoods.id, existing.id));
  } else {
    await db.insert(userGoods).values({
      userId,
      goodsId,
      status,
    });
  }

  return (
    (await getUserGoodsStateForGood({
      userId,
      goodsId,
    })) ?? createEmptyUserGoodsStateSnapshot(goodsId)
  );
}
