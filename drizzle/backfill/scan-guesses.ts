/**
 * 一次性回填：给「未鉴定收藏」里还没有备注的旧扫描补上角色猜测。
 *
 * 新扫描已在 /api/recognition/scan 里即时写入「疑似：<角色> · <IP>」；旧扫描当时没存，
 * 这里重新对其私图跑一遍 CLIP 向量检索，取最接近候选的角色/IP 写进 note（仅当为空时）。
 * 在 migrate 容器里跑（有 tsx + 模型缓存），需另外挂上 user_scan_assets 卷 + USER_SCAN_ASSET_DIR。
 *
 * 运行（VPS ~/gubugu）：
 *   docker compose run --rm \
 *     -v gubugu_user_scan_assets:/app/.data/user-scans \
 *     -e USER_SCAN_ASSET_DIR=/app/.data/user-scans \
 *     migrate pnpm db:backfill-scans
 */
import { and, eq, isNull } from 'drizzle-orm';

import { userScans } from '@/drizzle/schema';
import { findRecognitionCandidates } from '@/server/data/recognition-search';
import { getDb } from '@/server/db/client';
import { embedImage } from '@/server/recognition/embedding';
import { userScanAssetPath } from '@/server/user-scans/image-store';

async function main() {
  const db = getDb();
  const rows = await db
    .select({ id: userScans.id, assetKey: userScans.assetKey })
    .from(userScans)
    .where(and(isNull(userScans.note), isNull(userScans.resolvedAt)));

  console.log(`待回填(无备注)扫描: ${rows.length}`);
  let filled = 0;

  for (const row of rows) {
    try {
      const vector = await embedImage(userScanAssetPath(row.assetKey));
      const candidates = await findRecognitionCandidates(vector);
      const top = candidates[0];
      const names = top?.goods.characterNames ?? [];
      if (top && names.length > 0) {
        const note = `疑似：${names.join('、')}${
          top.goods.ipName ? ` · ${top.goods.ipName}` : ''
        }`;
        await db.update(userScans).set({ note }).where(eq(userScans.id, row.id));
        filled += 1;
        console.log(`  ${row.id} → ${note}`);
      } else {
        console.log(`  ${row.id} → 无角色候选，跳过`);
      }
    } catch (error) {
      console.error(
        `  ${row.id} 失败:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(`完成：回填 ${filled}/${rows.length}`);
  process.exit(0);
}

void main();
