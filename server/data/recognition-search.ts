import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import {
  recognitionCandidateDisplayLimit,
  recognitionWeakMatchThreshold,
  type RecognitionCandidate,
} from '@/lib/recognition';
import { toAbsoluteImageUrl } from '@/lib/goods-image';
import { rankByCosineSimilarity } from '@/lib/vector-similarity';
import {
  characters,
  goods,
  goodsCharacters,
  goodsImageEmbeddings,
  goodsImages,
  ips,
  series,
} from '@/drizzle/schema';
import { getDb } from '@/server/db/client';
import {
  embeddingModel,
  embeddingProvider,
} from '@/server/recognition/embedding';

/**
 * Ranks catalogue images against a query vector.
 *
 * embedding_payload is jsonb rather than a pgvector column, so there is no ANN
 * index to query through and every ready embedding is loaded and scored here.
 * That is fine at this catalogue size and is the documented trade — see
 * docs/recognition-options.md for the migration path when it stops being.
 */
export async function findRecognitionCandidates(queryVector: number[]) {
  const db = getDb();

  const rows = await db
    .select({
      embeddingId: goodsImageEmbeddings.id,
      payload: goodsImageEmbeddings.embeddingPayload,
      dimensions: goodsImageEmbeddings.dimensions,
      modelVersion: goodsImageEmbeddings.modelVersion,
      indexedAt: goodsImageEmbeddings.indexedAt,
      goodsImageId: goodsImages.id,
      imageUrl: goodsImages.imageUrl,
      goodsId: goods.id,
      slug: goods.slug,
      skuCode: goods.skuCode,
      name: goods.name,
      goodsType: goods.goodsType,
      material: goods.material,
      sizeLabel: goods.sizeLabel,
      edition: goods.edition,
      seriesName: series.name,
      ipName: ips.name,
    })
    .from(goodsImageEmbeddings)
    .innerJoin(
      goodsImages,
      eq(goodsImages.id, goodsImageEmbeddings.goodsImageId),
    )
    .innerJoin(goods, eq(goods.id, goodsImages.goodsId))
    .innerJoin(series, eq(series.id, goods.seriesId))
    .innerJoin(ips, eq(ips.id, series.ipId))
    .where(
      and(
        eq(goodsImageEmbeddings.status, 'ready'),
        eq(goodsImageEmbeddings.provider, embeddingProvider),
        eq(goodsImageEmbeddings.model, embeddingModel),
        // Never suggest a SKU the browser could not open.
        eq(goods.status, 'published'),
      ),
    );

  const scored = rankByCosineSimilarity(
    queryVector,
    rows
      .filter(
        (row): row is typeof row & { payload: number[] } =>
          Array.isArray(row.payload) && row.payload.length > 0,
      )
      .map((row) => ({ item: row, vector: row.payload })),
    {
      minScore: recognitionWeakMatchThreshold,
      // One row per image, so a SKU with several images can occupy several
      // slots. Over-fetch, then collapse to one row per SKU below.
      limit: recognitionCandidateDisplayLimit * 4,
    },
  );

  // Keep only each SKU's best-matching image. The list is already sorted, so
  // the first time a SKU appears is its strongest match.
  const bestPerGoods = new Map<string, (typeof scored)[number]>();

  for (const entry of scored) {
    if (!bestPerGoods.has(entry.item.goodsId)) {
      bestPerGoods.set(entry.item.goodsId, entry);
    }
  }

  const top = [...bestPerGoods.values()].slice(
    0,
    recognitionCandidateDisplayLimit,
  );

  if (top.length === 0) {
    return [];
  }

  const characterNamesByGoodsId = await loadCharacterNames(
    db,
    top.map((entry) => entry.item.goodsId),
  );

  return top.map((entry, index) => {
    const row = entry.item;
    const score = Number(entry.score.toFixed(4));
    // The response schema requires absolute URLs, but seeded rows store
    // same-origin paths.
    const imageUrl = toAbsoluteImageUrl(row.imageUrl);

    return {
      id: row.embeddingId,
      rank: index + 1,
      score,
      matchReason:
        index === 0
          ? '整体视觉特征与该商品的图鉴图片最接近。'
          : '视觉特征接近，可结合材质、尺寸与版本信息进一步确认。',
      goods: {
        slug: row.slug,
        skuCode: row.skuCode,
        name: row.name,
        goodsType: row.goodsType,
        seriesName: row.seriesName,
        ipName: row.ipName,
        characterNames: characterNamesByGoodsId.get(row.goodsId) ?? [],
        material: row.material,
        sizeLabel: row.sizeLabel,
        edition: row.edition,
        primaryImageUrl: imageUrl,
      },
      similarity: {
        matchedGoodsImageId: row.goodsImageId,
        matchedImageUrl: imageUrl,
        score,
        // Cosine distance, the complement of the similarity.
        distance: Number((1 - score).toFixed(4)),
        metric: 'cosine' as const,
        embedding: {
          status: 'ready' as const,
          provider: embeddingProvider,
          model: embeddingModel,
          modelVersion: row.modelVersion,
          dimensions: row.dimensions,
          indexedAt: row.indexedAt?.toISOString() ?? null,
        },
      },
    } satisfies RecognitionCandidate;
  });
}

async function loadCharacterNames(
  db: ReturnType<typeof getDb>,
  goodsIds: string[],
) {
  const rows = await db
    .select({
      goodsId: goodsCharacters.goodsId,
      name: characters.name,
    })
    .from(goodsCharacters)
    .innerJoin(characters, eq(characters.id, goodsCharacters.characterId))
    .where(
      and(
        eq(characters.status, 'published'),
        inArray(goodsCharacters.goodsId, goodsIds),
      ),
    );

  const byGoodsId = new Map<string, string[]>();

  for (const row of rows) {
    const names = byGoodsId.get(row.goodsId);

    if (names) {
      names.push(row.name);
    } else {
      byGoodsId.set(row.goodsId, [row.name]);
    }
  }

  return byGoodsId;
}

/** True when at least one catalogue image has a usable embedding. */
export async function hasReadyEmbeddings() {
  const db = getDb();

  const rows = await db
    .select({ id: goodsImageEmbeddings.id })
    .from(goodsImageEmbeddings)
    .where(
      and(
        eq(goodsImageEmbeddings.status, 'ready'),
        eq(goodsImageEmbeddings.provider, embeddingProvider),
        eq(goodsImageEmbeddings.model, embeddingModel),
      ),
    )
    .limit(1);

  return rows.length > 0;
}
