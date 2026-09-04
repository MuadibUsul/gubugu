import { and, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { isAcceptedImageMimeType } from '@/lib/image-upload';
import { consumeServerWrite } from '@/lib/rate-limit';
import { isMobileUserAgent } from '@/lib/device';
import { recognitionUploadLimits } from '@/lib/recognition';
import { goods, userGoods, userScans } from '@/drizzle/schema';
import { getAuthUser } from '@/server/auth/session';
import { recognizeGoodsImage } from '@/server/recognition/service';
import { getDb } from '@/server/db/client';
import { normalizeAndStoreUserScan } from '@/server/user-scans/image-store';

// 自动扫描入库：拍一张 → 匹配官方谷库。高置信直接点亮对应 SKU（可公开展示）；
// 否则存为「未鉴定收藏项」（进谷柜、不公开展示）。全程无需用户挑候选、无需审核。
const AUTO_LIGHT_THRESHOLD = 0.86;

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  // 与识别流程一致：仅手机端。
  if (!isMobileUserAgent(request.headers.get('user-agent'))) {
    return new NextResponse(null, { status: 404 });
  }

  const user = await getAuthUser();
  if (!user) return fail(401, '请登录后使用扫描。');
  if (
    !consumeServerWrite(`${user.id}:recognition-scan`, {
      limit: 20,
      windowMs: 60_000,
    })
  ) {
    return fail(429, '扫描过于频繁，请稍后重试。');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(400, '请求必须是包含图片的 multipart form data。');
  }

  const image = formData.get('image');
  if (!(image instanceof File) || image.size <= 0) {
    return fail(400, '缺少图片。');
  }
  if (!isAcceptedImageMimeType(image.type)) {
    return fail(415, '仅接受 JPG、PNG 或 WebP 图片。');
  }
  if (image.size > recognitionUploadLimits.maxFileSizeBytes) {
    return fail(413, '图片不能超过 10 MB。');
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());

    const response = await recognizeGoodsImage({
      file: image,
      userId: user.id,
      source: 'camera',
    });

    const top = response.candidates[0];
    const db = getDb();

    // 高置信 + 真实特征匹配 → 自动点亮对应官方 SKU。
    if (
      response.pipeline.provider === 'embedding-search' &&
      top &&
      top.score >= AUTO_LIGHT_THRESHOLD
    ) {
      const matchedGoods = (
        await db
          .select({ id: goods.id, slug: goods.slug })
          .from(goods)
          .where(
            and(eq(goods.slug, top.goods.slug), eq(goods.status, 'published')),
          )
          .limit(1)
      )[0];

      if (matchedGoods) {
        const now = new Date();
        await db
          .insert(userGoods)
          .values({
            userId: user.id,
            goodsId: matchedGoods.id,
            status: 'owned',
            litAt: now,
          })
          .onConflictDoUpdate({
            target: [userGoods.userId, userGoods.goodsId, userGoods.status],
            set: { litAt: sql`coalesce(${userGoods.litAt}, excluded.lit_at)` },
          });

        return NextResponse.json({
          ok: true,
          matched: true,
          goodsSlug: matchedGoods.slug,
          goodsName: top.goods.name,
          score: Math.round(top.score * 100),
        });
      }
    }

    // 未匹配（或置信不足）→ 存为未鉴定收藏项：谷柜可见、公开主页不展示。
    const stored = await normalizeAndStoreUserScan(buffer);
    const inserted = (
      await db
        .insert(userScans)
        .values({
          userId: user.id,
          assetKey: stored.assetKey,
          topScore: top ? Math.round(top.score * 100) : null,
        })
        .returning({ id: userScans.id })
    )[0];

    return NextResponse.json({
      ok: true,
      matched: false,
      scanId: inserted?.id ?? null,
      score: top ? Math.round(top.score * 100) : null,
    });
  } catch (error) {
    console.error('[recognition] 自动扫描失败', error);
    return fail(500, '扫描服务暂时不可用，请稍后重试。');
  }
}
