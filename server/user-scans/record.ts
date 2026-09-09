import 'server-only';

import { userScans } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';
import { normalizeAndStoreUserScan } from '@/server/user-scans/image-store';

/**
 * 把一次没能确认到官方 SKU 的扫描存为未鉴定收藏项。
 *
 * 图片落到私密资产区（不是公开目录区），行里记下与识别记录的关联，日后可据此重新
 * 匹配。这段原本写在 /api/recognition/scan 的 Route Handler 里，属于领域写入，不该
 * 由路由自己编排。
 */
export async function recordUnidentifiedScan({
  userId,
  image,
  recognitionAttemptId,
  topScore,
  note,
}: {
  userId: string;
  image: Buffer;
  recognitionAttemptId: string;
  /** 最接近的官方匹配分（0–100），没有候选时为 null。 */
  topScore: number | null;
  /** 识别到的角色/IP 猜测，作为初始备注写入（用户可改）。没有候选时为 null。 */
  note?: string | null;
}): Promise<{ scanId: string | null }> {
  const stored = await normalizeAndStoreUserScan(image);

  const inserted = (
    await getDb()
      .insert(userScans)
      .values({
        userId,
        assetKey: stored.assetKey,
        recognitionAttemptId,
        topScore,
        note: note ?? null,
      })
      .returning({ id: userScans.id })
  )[0];

  return { scanId: inserted?.id ?? null };
}
