import 'server-only';

import { eq } from 'drizzle-orm';

import { goods, goodsWatches, notifications } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

/** 为一次新的公开/可换供给生成站内提醒，不通知供给者本人。 */
export async function notifyGoodsWatchers(goodsId: string, actorId: string) {
  const db = getDb();
  const [watchers, goodsRows] = await Promise.all([
    db
      .select({ userId: goodsWatches.userId })
      .from(goodsWatches)
      .where(eq(goodsWatches.goodsId, goodsId)),
    db
      .select({ slug: goods.slug })
      .from(goods)
      .where(eq(goods.id, goodsId))
      .limit(1),
  ]);
  const rows = watchers
    .filter((watcher) => watcher.userId !== actorId)
    .map((watcher) => ({
      recipientId: watcher.userId,
      actorId,
      type: 'watch_available' as const,
      payload: { goodsId, goodsSlug: goodsRows[0]?.slug ?? null },
    }));

  if (rows.length > 0) await db.insert(notifications).values(rows);
}
