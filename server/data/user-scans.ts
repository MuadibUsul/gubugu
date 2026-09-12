import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { goods, recognitionAttempts, userScans } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export type UserScanItem = {
  id: string;
  imageUrl: string;
  backImageUrl: string | null;
  goodsName: string | null;
  resolved: boolean;
  topScore: number | null;
  note: string | null;
  createdAt: Date;
};

/**
 * 本人的私密实拍收藏，不进公开主页，也不单独构成换谷库存。
 * 默认仅返回未鉴定项；谷柜传 includeResolved 同时展示已归属藏品的实拍正反面。
 */
export async function listUserScans(
  userId: string,
  limit = 60,
  includeResolved = false,
): Promise<UserScanItem[]> {
  const rows = await getDb()
    .select({
      id: userScans.id,
      topScore: userScans.topScore,
      note: userScans.note,
      createdAt: userScans.createdAt,
      backAssetKey: userScans.backAssetKey,
      resolvedAt: userScans.resolvedAt,
      goodsName: goods.name,
    })
    .from(userScans)
    .leftJoin(
      recognitionAttempts,
      eq(recognitionAttempts.id, userScans.recognitionAttemptId),
    )
    .leftJoin(goods, eq(goods.id, recognitionAttempts.confirmedGoodsId))
    .where(
      and(
        eq(userScans.userId, userId),
        includeResolved ? undefined : isNull(userScans.resolvedAt),
      ),
    )
    .orderBy(desc(userScans.createdAt))
    .limit(limit);

  return rows.map(({ backAssetKey, resolvedAt, ...row }) => ({
    ...row,
    // 私密资产没有公开静态 URL，只能经鉴权路由读取。
    imageUrl: `/api/user-scans/${row.id}/image`,
    backImageUrl: backAssetKey
      ? `/api/user-scans/${row.id}/image?side=back`
      : null,
    resolved: Boolean(resolvedAt),
  }));
}

const ownedScanInputSchema = z.object({
  scanId: z.string().uuid(),
  userId: z.string().uuid(),
  side: z.enum(['front', 'back']).default('front'),
});

/**
 * 取某张未鉴定扫描的私密资产键，且只在它属于该用户时返回。
 *
 * 所有权过滤留在这一层，调用方不必也不应自己拼 where。返回 null 同时表示「不存在」
 * 与「不属于你」——读取路由据此一律回 404，不透露资源是否存在。
 */
export async function getOwnedUserScanAssetKey(
  input: z.input<typeof ownedScanInputSchema>,
): Promise<string | null> {
  const { scanId, userId, side } = ownedScanInputSchema.parse(input);

  const row = (
    await getDb()
      .select({
        assetKey: side === 'back' ? userScans.backAssetKey : userScans.assetKey,
      })
      .from(userScans)
      .where(and(eq(userScans.id, scanId), eq(userScans.userId, userId)))
      .limit(1)
  )[0];

  return row?.assetKey ?? null;
}
