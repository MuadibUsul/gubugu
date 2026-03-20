import 'server-only';

import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { goods, postImages, posts, ratings, userGoods } from '@/drizzle/schema';
import { getPublishedGoodsCardsByIds } from '@/server/data/_shared';
import {
  listUserExchangeListings,
  type ExchangeListingViewItem,
} from '@/server/data/exchange';
import { getDb } from '@/server/db/client';

const userProfilePageInputSchema = z.object({
  userId: z.string().uuid(),
  postsLimit: z.number().int().min(1).max(12).default(4),
  viewerMode: z.enum(['demo', 'self']).default('demo'),
});

type UserGoodsStatus = 'owned' | 'wanted' | 'exchange';

export type UserProfileGoodsCard = Awaited<
  ReturnType<typeof getPublishedGoodsCardsByIds>
>[number] & {
  status: UserGoodsStatus;
  note: string | null;
  updatedAt: Date;
};

export type UserPhotoEntry = {
  postId: string;
  goodsId: string;
  goodsSlug: string;
  goodsName: string;
  body: string;
  createdAt: Date;
  images: Array<{
    id: string;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
  }>;
};

export type UserProfilePageData = {
  summary: {
    trackedGoodsCount: number;
    ownedCount: number;
    wantedCount: number;
    exchangeCount: number;
    litProgressPercentage: number;
    visiblePostCount: number;
    visiblePhotoCount: number;
    ratingCount: number;
  };
  goods: {
    owned: UserProfileGoodsCard[];
    wanted: UserProfileGoodsCard[];
    exchange: UserProfileGoodsCard[];
  };
  exchangeListings: ExchangeListingViewItem[];
  recentPhotoEntries: UserPhotoEntry[];
  privacy: {
    currentMode: 'public-demo' | 'self';
    reservedModes: Array<'public' | 'followers' | 'private'>;
  };
};

function createFallbackUserProfilePageData(
  viewerMode: z.output<typeof userProfilePageInputSchema>['viewerMode'],
) {
  return {
    summary: {
      trackedGoodsCount: 0,
      ownedCount: 0,
      wantedCount: 0,
      exchangeCount: 0,
      litProgressPercentage: 0,
      visiblePostCount: 0,
      visiblePhotoCount: 0,
      ratingCount: 0,
    },
    goods: {
      owned: [],
      wanted: [],
      exchange: [],
    },
    exchangeListings: [],
    recentPhotoEntries: [],
    privacy: {
      currentMode: viewerMode === 'self' ? 'self' : 'public-demo',
      reservedModes: ['public', 'followers', 'private'],
    },
  } satisfies UserProfilePageData;
}

function mapGoodsCardsById(
  items: Awaited<ReturnType<typeof getPublishedGoodsCardsByIds>>,
) {
  return new Map(items.map((item) => [item.id, item]));
}

function buildStatusCards({
  rows,
  cardsByGoodsId,
}: {
  rows: Array<{
    goodsId: string;
    status: UserGoodsStatus;
    note: string | null;
    updatedAt: Date;
  }>;
  cardsByGoodsId: Map<
    string,
    Awaited<ReturnType<typeof getPublishedGoodsCardsByIds>>[number]
  >;
}) {
  return rows
    .map((row) => {
      const card = cardsByGoodsId.get(row.goodsId);

      if (!card) {
        return null;
      }

      return {
        ...card,
        status: row.status,
        note: row.note,
        updatedAt: row.updatedAt,
      } satisfies UserProfileGoodsCard;
    })
    .filter((item): item is UserProfileGoodsCard => Boolean(item));
}

export async function getUserProfilePageData(
  input: z.input<typeof userProfilePageInputSchema>,
) {
  const { userId, postsLimit, viewerMode } =
    userProfilePageInputSchema.parse(input);

  try {
    const db = getDb();
    const [statusRows, postRows, postCountRows, photoCountRows, ratingRows] =
      await Promise.all([
        db
          .select({
            goodsId: userGoods.goodsId,
            status: userGoods.status,
            note: userGoods.note,
            updatedAt: userGoods.updatedAt,
          })
          .from(userGoods)
          .innerJoin(goods, eq(userGoods.goodsId, goods.id))
          .where(
            and(eq(userGoods.userId, userId), eq(goods.status, 'published')),
          )
          .orderBy(desc(userGoods.updatedAt)),
        db
          .select({
            postId: posts.id,
            goodsId: posts.goodsId,
            goodsSlug: goods.slug,
            goodsName: goods.name,
            body: posts.body,
            createdAt: posts.createdAt,
          })
          .from(posts)
          .innerJoin(goods, eq(posts.goodsId, goods.id))
          .where(
            and(
              eq(posts.userId, userId),
              eq(posts.status, 'visible'),
              eq(posts.moderationStatus, 'approved'),
              eq(goods.status, 'published'),
            ),
          )
          .orderBy(desc(posts.createdAt))
          .limit(postsLimit),
        db
          .select({
            total: posts.id,
          })
          .from(posts)
          .innerJoin(goods, eq(posts.goodsId, goods.id))
          .where(
            and(
              eq(posts.userId, userId),
              eq(posts.status, 'visible'),
              eq(posts.moderationStatus, 'approved'),
              eq(goods.status, 'published'),
            ),
          ),
        db
          .select({
            id: postImages.id,
          })
          .from(postImages)
          .innerJoin(posts, eq(postImages.postId, posts.id))
          .innerJoin(goods, eq(posts.goodsId, goods.id))
          .where(
            and(
              eq(posts.userId, userId),
              eq(posts.status, 'visible'),
              eq(posts.moderationStatus, 'approved'),
              eq(postImages.status, 'visible'),
              eq(postImages.moderationStatus, 'approved'),
              eq(goods.status, 'published'),
            ),
          ),
        db
          .select({
            id: ratings.id,
          })
          .from(ratings)
          .innerJoin(goods, eq(ratings.goodsId, goods.id))
          .where(
            and(eq(ratings.userId, userId), eq(goods.status, 'published')),
          ),
      ]);

    const goodsIds = Array.from(new Set(statusRows.map((row) => row.goodsId)));
    const [goodsCards, exchangeListingsData] = await Promise.all([
      getPublishedGoodsCardsByIds(goodsIds),
      listUserExchangeListings({
        userId,
        limit: 8,
      }),
    ]);
    const cardsByGoodsId = mapGoodsCardsById(goodsCards);

    const ownedRows = statusRows.filter((row) => row.status === 'owned');
    const wantedRows = statusRows.filter((row) => row.status === 'wanted');
    const exchangeRows = statusRows.filter((row) => row.status === 'exchange');

    const visiblePostIds = postRows.map((row) => row.postId);
    const photoRows =
      visiblePostIds.length > 0
        ? await db
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
                inArray(postImages.postId, visiblePostIds),
                eq(postImages.status, 'visible'),
                eq(postImages.moderationStatus, 'approved'),
              ),
            )
            .orderBy(desc(postImages.postId), postImages.sortOrder)
        : [];

    const imagesByPostId = new Map<string, UserPhotoEntry['images']>();

    for (const row of photoRows) {
      const existing = imagesByPostId.get(row.postId) ?? [];

      existing.push({
        id: row.id,
        imageUrl: row.imageUrl,
        altText: row.altText,
        sortOrder: row.sortOrder,
      });

      imagesByPostId.set(row.postId, existing);
    }

    const ownedCount = ownedRows.length;
    const wantedCount = wantedRows.length;
    const exchangeCount = exchangeRows.length;

    return {
      summary: {
        trackedGoodsCount: goodsIds.length,
        ownedCount,
        wantedCount,
        exchangeCount,
        litProgressPercentage:
          goodsIds.length > 0
            ? Math.round((ownedCount / goodsIds.length) * 100)
            : 0,
        visiblePostCount: postCountRows.length,
        visiblePhotoCount: photoCountRows.length,
        ratingCount: ratingRows.length,
      },
      goods: {
        owned: buildStatusCards({
          rows: ownedRows,
          cardsByGoodsId,
        }),
        wanted: buildStatusCards({
          rows: wantedRows,
          cardsByGoodsId,
        }),
        exchange: buildStatusCards({
          rows: exchangeRows,
          cardsByGoodsId,
        }),
      },
      exchangeListings: exchangeListingsData,
      recentPhotoEntries: postRows.map((row) => ({
        postId: row.postId,
        goodsId: row.goodsId,
        goodsSlug: row.goodsSlug,
        goodsName: row.goodsName,
        body: row.body,
        createdAt: row.createdAt,
        images: imagesByPostId.get(row.postId) ?? [],
      })),
      privacy: {
        currentMode: viewerMode === 'self' ? 'self' : 'public-demo',
        reservedModes: ['public', 'followers', 'private'],
      },
    } satisfies UserProfilePageData;
  } catch {
    return createFallbackUserProfilePageData(viewerMode);
  }
}
