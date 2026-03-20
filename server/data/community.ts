import 'server-only';

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { GoodsRatingVerdict } from '@/lib/goods-rating';
import { postImages, posts, ratings } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

const goodsRatingSummaryInputSchema = z.object({
  goodsId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

const goodsPostsInputSchema = z.object({
  goodsId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

const goodsCommunityInputSchema = goodsPostsInputSchema.extend({
  userId: z.string().uuid().optional(),
});

export type GoodsRatingSummary = {
  averageScore: number | null;
  ratingCount: number;
  worthBuyingCount: number;
  worthBuyingRate: number | null;
  verdictCounts: Record<GoodsRatingVerdict, number>;
  dimensionAverages: {
    artworkScore: number | null;
    craftsmanshipScore: number | null;
    valueScore: number | null;
    rarityScore: number | null;
    satisfactionScore: number | null;
  };
  userRating: {
    overallScore: number;
    artworkScore: number;
    craftsmanshipScore: number;
    valueScore: number;
    rarityScore: number;
    satisfactionScore: number;
    worthBuying: boolean;
    overallTag: GoodsRatingVerdict;
  } | null;
};

export type GoodsPostListItem = {
  id: string;
  goodsId: string;
  userId: string;
  body: string;
  status: 'visible' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    id: string;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
  }>;
};

export async function getGoodsRatingSummary(
  input: z.input<typeof goodsRatingSummaryInputSchema>,
) {
  const db = getDb();
  const { goodsId, userId } = goodsRatingSummaryInputSchema.parse(input);

  const [aggregateRows, userRows] = await Promise.all([
    db
      .select({
        averageScore: sql<string | null>`avg(${ratings.score})`,
        ratingCount: sql<number>`count(${ratings.id})`,
        worthBuyingCount: sql<number>`coalesce(sum(case when ${ratings.worthBuying} then 1 else 0 end), 0)`,
        positiveCount: sql<number>`coalesce(sum(case when ${ratings.overallTag} = 'positive' then 1 else 0 end), 0)`,
        neutralCount: sql<number>`coalesce(sum(case when ${ratings.overallTag} = 'neutral' then 1 else 0 end), 0)`,
        negativeCount: sql<number>`coalesce(sum(case when ${ratings.overallTag} = 'negative' then 1 else 0 end), 0)`,
        artworkAverage: sql<string | null>`avg(${ratings.artworkScore})`,
        craftsmanshipAverage: sql<
          string | null
        >`avg(${ratings.craftsmanshipScore})`,
        valueAverage: sql<string | null>`avg(${ratings.valueScore})`,
        rarityAverage: sql<string | null>`avg(${ratings.rarityScore})`,
        satisfactionAverage: sql<
          string | null
        >`avg(${ratings.satisfactionScore})`,
      })
      .from(ratings)
      .where(eq(ratings.goodsId, goodsId)),
    userId
      ? db
          .select({
            overallScore: ratings.score,
            artworkScore: ratings.artworkScore,
            craftsmanshipScore: ratings.craftsmanshipScore,
            valueScore: ratings.valueScore,
            rarityScore: ratings.rarityScore,
            satisfactionScore: ratings.satisfactionScore,
            worthBuying: ratings.worthBuying,
            overallTag: ratings.overallTag,
          })
          .from(ratings)
          .where(and(eq(ratings.goodsId, goodsId), eq(ratings.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const aggregate = aggregateRows[0];
  const userRating = userRows[0];
  const ratingCount = Number(aggregate?.ratingCount ?? 0);
  const worthBuyingCount = Number(aggregate?.worthBuyingCount ?? 0);

  return {
    averageScore: aggregate?.averageScore
      ? Number(aggregate.averageScore)
      : null,
    ratingCount,
    worthBuyingCount,
    worthBuyingRate:
      ratingCount > 0
        ? Math.round((worthBuyingCount / ratingCount) * 100)
        : null,
    verdictCounts: {
      positive: Number(aggregate?.positiveCount ?? 0),
      neutral: Number(aggregate?.neutralCount ?? 0),
      negative: Number(aggregate?.negativeCount ?? 0),
    },
    dimensionAverages: {
      artworkScore: aggregate?.artworkAverage
        ? Number(aggregate.artworkAverage)
        : null,
      craftsmanshipScore: aggregate?.craftsmanshipAverage
        ? Number(aggregate.craftsmanshipAverage)
        : null,
      valueScore: aggregate?.valueAverage
        ? Number(aggregate.valueAverage)
        : null,
      rarityScore: aggregate?.rarityAverage
        ? Number(aggregate.rarityAverage)
        : null,
      satisfactionScore: aggregate?.satisfactionAverage
        ? Number(aggregate.satisfactionAverage)
        : null,
    },
    userRating: userRating
      ? {
          overallScore: Number(userRating.overallScore),
          artworkScore: userRating.artworkScore,
          craftsmanshipScore: userRating.craftsmanshipScore,
          valueScore: userRating.valueScore,
          rarityScore: userRating.rarityScore,
          satisfactionScore: userRating.satisfactionScore,
          worthBuying: userRating.worthBuying,
          overallTag: userRating.overallTag,
        }
      : null,
  } satisfies GoodsRatingSummary;
}

export async function listGoodsPosts(
  input: z.input<typeof goodsPostsInputSchema>,
) {
  const db = getDb();
  const { goodsId, page, pageSize } = goodsPostsInputSchema.parse(input);
  const offset = (page - 1) * pageSize;

  const [postRows, countRows] = await Promise.all([
    db
      .select({
        id: posts.id,
        goodsId: posts.goodsId,
        userId: posts.userId,
        body: posts.body,
        status: posts.status,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(
        and(
          eq(posts.goodsId, goodsId),
          eq(posts.status, 'visible'),
          eq(posts.moderationStatus, 'approved'),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({
        total: sql<number>`count(${posts.id})`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.goodsId, goodsId),
          eq(posts.status, 'visible'),
          eq(posts.moderationStatus, 'approved'),
        ),
      ),
  ]);

  const postIds = postRows.map((row) => row.id);

  const imageRows =
    postIds.length === 0
      ? []
      : await db
          .select({
            id: postImages.id,
            postId: postImages.postId,
            imageUrl: postImages.imageUrl,
            altText: postImages.altText,
            sortOrder: postImages.sortOrder,
          })
          .from(postImages)
          .where(
            and(
              inArray(postImages.postId, postIds),
              eq(postImages.status, 'visible'),
              eq(postImages.moderationStatus, 'approved'),
            ),
          )
          .orderBy(asc(postImages.postId), asc(postImages.sortOrder));

  const imagesByPostId = new Map<string, GoodsPostListItem['images']>();

  for (const row of imageRows) {
    const existing = imagesByPostId.get(row.postId) ?? [];

    existing.push({
      id: row.id,
      imageUrl: row.imageUrl,
      altText: row.altText,
      sortOrder: row.sortOrder,
    });

    imagesByPostId.set(row.postId, existing);
  }

  return {
    items: postRows.map((row) => ({
      ...row,
      images: imagesByPostId.get(row.id) ?? [],
    })) satisfies GoodsPostListItem[],
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function getGoodsCommunityData(
  input: z.input<typeof goodsCommunityInputSchema>,
) {
  const { goodsId, userId, page, pageSize } =
    goodsCommunityInputSchema.parse(input);

  const [ratingSummary, postList] = await Promise.all([
    getGoodsRatingSummary({ goodsId, userId }),
    listGoodsPosts({ goodsId, page, pageSize }),
  ]);

  return {
    ratingSummary,
    posts: postList,
  };
}
