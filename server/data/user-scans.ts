import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { userScans } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export type UserScanItem = {
  id: string;
  imageUrl: string;
  topScore: number | null;
  note: string | null;
  createdAt: Date;
};

/**
 * 某用户尚未归属的未鉴定收藏项（扫到实物但没匹配上官方 SKU）。仅本人可见，不进
 * 公开主页，也不构成换谷库存。
 *
 * 已经通过候选确认归属到 SKU 的扫描（`resolved_at` 非空）不再出现在这里：那张原图
 * 仍保留作识别审计，但它已经变成一件正常的已点亮藏品，再列进「待鉴定」只会让人
 * 以为还需要处理。
 */
export async function listUserScans(
  userId: string,
  limit = 60,
): Promise<UserScanItem[]> {
  const rows = await getDb()
    .select({
      id: userScans.id,
      topScore: userScans.topScore,
      note: userScans.note,
      createdAt: userScans.createdAt,
    })
    .from(userScans)
    .where(and(eq(userScans.userId, userId), isNull(userScans.resolvedAt)))
    .orderBy(desc(userScans.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    // 私密资产没有公开静态 URL，只能经鉴权路由读取。
    imageUrl: `/api/user-scans/${row.id}/image`,
  }));
}

const ownedScanInputSchema = z.object({
  scanId: z.string().uuid(),
  userId: z.string().uuid(),
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
  const { scanId, userId } = ownedScanInputSchema.parse(input);

  const row = (
    await getDb()
      .select({ assetKey: userScans.assetKey })
      .from(userScans)
      .where(and(eq(userScans.id, scanId), eq(userScans.userId, userId)))
      .limit(1)
  )[0];

  return row?.assetKey ?? null;
}
