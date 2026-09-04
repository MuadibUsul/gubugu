import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { formatGoodsTypeLabel } from '@/lib/catalog-labels';
import { toSafeShareImageUrl } from '@/lib/goods-image';
import { catalogAssetPath } from '@/server/catalog-crawler/image-store';
import { getGoodsDetailPageData } from '@/server/data';
import { renderShareCard } from '@/server/share-card/render-card';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
// 卡面只随谷子元数据和评分变化，两者都很少动。原来是 300 秒，等于每张卡每五分钟
// 重算一次整图；渲染再快也没必要，一天一次足够。
export const revalidate = 86400;

const paramsSchema = z.object({
  goodsSlug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

/**
 * 取主图原始字节：本地 catalog-assets 直接读盘，其余走 SSRF 白名单后 fetch。
 * 解码交给渲染层的 sharp，这里不做格式转换。取不到就回退占位版式。
 */
async function loadShareImageBytes(
  rawUrl: string | null | undefined,
): Promise<Buffer | null> {
  if (!rawUrl) return null;

  try {
    const localMatch = rawUrl.match(/\/catalog-assets\/([^/?#]+)$/);

    if (localMatch) {
      return await readFile(
        catalogAssetPath(decodeURIComponent(localMatch[1])),
      );
    }

    const safeUrl = toSafeShareImageUrl(rawUrl);
    if (!safeUrl) return null;

    const response = await fetch(safeUrl);
    if (!response.ok) return null;

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ goodsSlug: string }> },
) {
  const parsed = paramsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return new Response('Invalid SKU', { status: 400 });
  }

  const goods = await getGoodsDetailPageData({
    goodsSlug: parsed.data.goodsSlug,
  });

  if (!goods) {
    return new Response('SKU not found', { status: 404 });
  }

  const primaryImage =
    goods.images.find((image) => image.isPrimary) ?? goods.images[0];
  const primaryCharacter =
    goods.characters.find((character) => character.isPrimary) ??
    goods.characters[0];

  const png = await renderShareCard({
    photo: await loadShareImageBytes(primaryImage?.imageUrl),
    title: goods.name,
    seriesLine: `${goods.ip.name} · ${goods.series.name}`,
    tags: [
      formatGoodsTypeLabel(goods.goodsType),
      goods.edition,
      primaryCharacter?.name,
    ].filter((label): label is string => Boolean(label)),
    ratingLabel: goods.summary.ratingAverage
      ? `评分 ${goods.summary.ratingAverage.toFixed(1)} · ${goods.summary.ratingCount} 人评分`
      : '标准 SKU 收藏图鉴',
    skuCode: goods.skuCode,
  });

  return new Response(new Uint8Array(png), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'Content-Type': 'image/png',
    },
  });
}
