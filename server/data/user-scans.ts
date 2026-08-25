import 'server-only';

import { desc, eq } from 'drizzle-orm';

import { userScans } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export type UserScanItem = {
  id: string;
  imageUrl: string;
  topScore: number | null;
  createdAt: Date;
};

// 某用户的未鉴定收藏项（扫描未匹配官方 SKU 的实物）。仅本人可见，不进公开主页。
export async function listUserScans(
  userId: string,
  limit = 60,
): Promise<UserScanItem[]> {
  return getDb()
    .select({
      id: userScans.id,
      imageUrl: userScans.imageUrl,
      topScore: userScans.topScore,
      createdAt: userScans.createdAt,
    })
    .from(userScans)
    .where(eq(userScans.userId, userId))
    .orderBy(desc(userScans.createdAt))
    .limit(limit);
}
