import 'server-only';

import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  characters,
  exchangeListings,
  goods,
  goodsCharacters,
  goodsImages,
  goodsTags,
  ips,
  posts,
  ratings,
  series,
  tags,
} from '@/drizzle/schema';
import { getDb } from '@/server/db/client';
import { getPublishedGoodsCardsByIds } from '@/server/data/_shared';
import {
  getUserGoodsStateMap,
  type UserGoodsStateSnapshot,
} from '@/server/data/user-goods';

const listHotIpsInputSchema = z.object({
  limit: z.number().int().min(1).max(24).default(6),
});

const characterPageInputSchema = z.object({
  characterSlug: z.string().trim().min(1),
  ipSlug: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(48).default(24),
});

const goodsDetailInputSchema = z.object({
  goodsSlug: z.string().trim().min(1),
});

const characterViewInputSchema = z.object({
  ipSlug: z.string().trim().min(1),
  characterSlug: z.string().trim().min(1),
  userId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(48).default(48),
});

export type HomeHotIp = {
  id: string;
  slug: string;
  name: string;
  nameLocalized: string | null;
  coverImageUrl: string | null;
  characterCount: number;
  seriesCount: number;
  goodsCount: number;
};

export type CharacterEncyclopediaPageData = {
  character: {
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
    description: string | null;
    avatarImageUrl: string | null;
  };
  ip: {
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
  };
  summary: {
    goodsCount: number;
    seriesCount: number;
  };
  seriesHighlights: Array<{
    id: string;
    slug: string;
    name: string;
    goodsCount: number;
  }>;
  goods: Awaited<ReturnType<typeof getPublishedGoodsCardsByIds>>;
};

export type CharacterCollectionGoodsCard = Awaited<
  ReturnType<typeof getPublishedGoodsCardsByIds>
>[number] & {
  viewerState: UserGoodsStateSnapshot['statuses'];
  isOwned: boolean;
  isWanted: boolean;
  isExchange: boolean;
};

export type CharacterCompletionSummary = {
  totalGoods: number;
  ownedGoods: number;
  remainingGoods: number;
  progressPercentage: number;
  completedSeriesCount: number;
  totalSeriesCount: number;
  litGoodsIds: string[];
};

export type CharacterSeriesCompletion = {
  id: string;
  slug: string;
  name: string;
  totalGoods: number;
  ownedGoods: number;
  progressPercentage: number;
  isComplete: boolean;
};

export type CharacterFilterOptions = {
  tags: Array<{
    id: string;
    slug: string;
    name: string;
    goodsCount: number;
  }>;
  goodsTypes: Array<{
    value: string;
    goodsCount: number;
  }>;
  series: Array<{
    id: string;
    slug: string;
    name: string;
    goodsCount: number;
  }>;
};

export type CharacterEncyclopediaViewData = Omit<
  CharacterEncyclopediaPageData,
  'goods'
> & {
  goods: CharacterCollectionGoodsCard[];
  viewer: {
    userId: string | null;
    ownedGoodsIds: string[];
  };
  completion: {
    character: CharacterCompletionSummary;
    series: CharacterSeriesCompletion[];
    ip: {
      id: string;
      slug: string;
      status: 'reserved';
      totalGoods: null;
      ownedGoods: null;
      progressPercentage: null;
    };
  };
  filters: CharacterFilterOptions;
};

export type GoodsDetailPageData = {
  id: string;
  slug: string;
  skuCode: string;
  name: string;
  description: string | null;
  goodsType: string;
  material: string | null;
  sizeLabel: string | null;
  edition: string | null;
  releaseDate: Date | null;
  msrpAmount: string | null;
  currencyCode: string | null;
  metadata: Record<string, unknown> | null;
  series: {
    id: string;
    slug: string;
    name: string;
    seriesType: string;
    releaseDate: Date | null;
  };
  ip: {
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
  };
  images: Array<{
    id: string;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  tags: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  characters: Array<{
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
    avatarImageUrl: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  summary: {
    ratingAverage: number | null;
    ratingCount: number;
    postCount: number;
    openExchangeCount: number;
  };
};

export async function listHotIps(
  input?: z.input<typeof listHotIpsInputSchema>,
) {
  const db = getDb();
  const { limit } = listHotIpsInputSchema.parse(input ?? {});

  const goodsCountSql = sql<number>`count(distinct ${goods.id})`;
  const seriesCountSql = sql<number>`count(distinct ${series.id})`;
  const characterCountSql = sql<number>`count(distinct ${characters.id})`;

  const rows = await db
    .select({
      id: ips.id,
      slug: ips.slug,
      name: ips.name,
      nameLocalized: ips.nameLocalized,
      coverImageUrl: ips.coverImageUrl,
      goodsCount: goodsCountSql,
      seriesCount: seriesCountSql,
      characterCount: characterCountSql,
    })
    .from(ips)
    .leftJoin(
      characters,
      and(eq(characters.ipId, ips.id), eq(characters.status, 'published')),
    )
    .leftJoin(
      series,
      and(eq(series.ipId, ips.id), eq(series.status, 'published')),
    )
    .leftJoin(
      goods,
      and(eq(goods.seriesId, series.id), eq(goods.status, 'published')),
    )
    .where(eq(ips.status, 'published'))
    .groupBy(ips.id)
    .orderBy(desc(goodsCountSql), asc(ips.name))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    goodsCount: Number(row.goodsCount),
    seriesCount: Number(row.seriesCount),
    characterCount: Number(row.characterCount),
  })) satisfies HomeHotIp[];
}

export async function getCharacterEncyclopediaPageData(
  input: z.input<typeof characterPageInputSchema>,
) {
  const db = getDb();
  const { characterSlug, ipSlug, limit } =
    characterPageInputSchema.parse(input);

  const characterRows = await db
    .select({
      id: characters.id,
      slug: characters.slug,
      name: characters.name,
      nameLocalized: characters.nameLocalized,
      description: characters.description,
      avatarImageUrl: characters.avatarImageUrl,
      ipId: ips.id,
      ipSlug: ips.slug,
      ipName: ips.name,
      ipNameLocalized: ips.nameLocalized,
    })
    .from(characters)
    .innerJoin(ips, eq(characters.ipId, ips.id))
    .where(
      and(
        eq(characters.slug, characterSlug),
        eq(characters.status, 'published'),
        eq(ips.status, 'published'),
        ipSlug ? eq(ips.slug, ipSlug) : undefined,
      ),
    )
    .limit(1);

  const character = characterRows[0];

  if (!character) {
    return null;
  }

  const [goodsIdRows, seriesHighlightsRows, summaryRows] = await Promise.all([
    db
      .selectDistinct({
        goodsId: goods.id,
        releaseDate: goods.releaseDate,
        createdAt: goods.createdAt,
        name: goods.name,
      })
      .from(goodsCharacters)
      .innerJoin(goods, eq(goodsCharacters.goodsId, goods.id))
      .innerJoin(
        series,
        and(eq(goods.seriesId, series.id), eq(series.status, 'published')),
      )
      .innerJoin(ips, and(eq(series.ipId, ips.id), eq(ips.status, 'published')))
      .where(
        and(
          eq(goodsCharacters.characterId, character.id),
          eq(goods.status, 'published'),
        ),
      )
      .orderBy(desc(goods.releaseDate), desc(goods.createdAt), asc(goods.name))
      .limit(limit),
    db
      .select({
        id: series.id,
        slug: series.slug,
        name: series.name,
        goodsCount: sql<number>`count(distinct ${goods.id})`,
      })
      .from(goodsCharacters)
      .innerJoin(goods, eq(goodsCharacters.goodsId, goods.id))
      .innerJoin(
        series,
        and(eq(goods.seriesId, series.id), eq(series.status, 'published')),
      )
      .where(
        and(
          eq(goodsCharacters.characterId, character.id),
          eq(goods.status, 'published'),
        ),
      )
      .groupBy(series.id)
      .orderBy(
        desc(sql<number>`count(distinct ${goods.id})`),
        asc(series.name),
      ),
    db
      .select({
        goodsCount: sql<number>`count(distinct ${goods.id})`,
        seriesCount: sql<number>`count(distinct ${series.id})`,
      })
      .from(goodsCharacters)
      .innerJoin(goods, eq(goodsCharacters.goodsId, goods.id))
      .innerJoin(
        series,
        and(eq(goods.seriesId, series.id), eq(series.status, 'published')),
      )
      .where(
        and(
          eq(goodsCharacters.characterId, character.id),
          eq(goods.status, 'published'),
        ),
      ),
  ]);

  const goodsCards = await getPublishedGoodsCardsByIds(
    goodsIdRows.map((row) => row.goodsId),
  );

  const summaryRow = summaryRows[0];

  return {
    character: {
      id: character.id,
      slug: character.slug,
      name: character.name,
      nameLocalized: character.nameLocalized,
      description: character.description,
      avatarImageUrl: character.avatarImageUrl,
    },
    ip: {
      id: character.ipId,
      slug: character.ipSlug,
      name: character.ipName,
      nameLocalized: character.ipNameLocalized,
    },
    summary: {
      goodsCount: Number(summaryRow?.goodsCount ?? 0),
      seriesCount: Number(summaryRow?.seriesCount ?? 0),
    },
    seriesHighlights: seriesHighlightsRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      goodsCount: Number(row.goodsCount),
    })),
    goods: goodsCards,
  } satisfies CharacterEncyclopediaPageData;
}

export async function getGoodsDetailPageData(
  input: z.input<typeof goodsDetailInputSchema>,
) {
  const db = getDb();
  const { goodsSlug } = goodsDetailInputSchema.parse(input);

  const goodsRows = await db
    .select({
      id: goods.id,
      slug: goods.slug,
      skuCode: goods.skuCode,
      name: goods.name,
      description: goods.description,
      goodsType: goods.goodsType,
      material: goods.material,
      sizeLabel: goods.sizeLabel,
      edition: goods.edition,
      releaseDate: goods.releaseDate,
      msrpAmount: goods.msrpAmount,
      currencyCode: goods.currencyCode,
      metadata: goods.metadata,
      seriesId: series.id,
      seriesSlug: series.slug,
      seriesName: series.name,
      seriesType: series.seriesType,
      seriesReleaseDate: series.releaseDate,
      ipId: ips.id,
      ipSlug: ips.slug,
      ipName: ips.name,
      ipNameLocalized: ips.nameLocalized,
    })
    .from(goods)
    .innerJoin(
      series,
      and(eq(goods.seriesId, series.id), eq(series.status, 'published')),
    )
    .innerJoin(ips, and(eq(series.ipId, ips.id), eq(ips.status, 'published')))
    .where(and(eq(goods.slug, goodsSlug), eq(goods.status, 'published')))
    .limit(1);

  const detail = goodsRows[0];

  if (!detail) {
    return null;
  }

  const [
    imageRows,
    tagRows,
    characterRows,
    ratingRows,
    postRows,
    exchangeRows,
  ] = await Promise.all([
    db
      .select({
        id: goodsImages.id,
        imageUrl: goodsImages.imageUrl,
        altText: goodsImages.altText,
        sortOrder: goodsImages.sortOrder,
        isPrimary: goodsImages.isPrimary,
      })
      .from(goodsImages)
      .where(eq(goodsImages.goodsId, detail.id))
      .orderBy(desc(goodsImages.isPrimary), asc(goodsImages.sortOrder)),
    db
      .select({
        id: tags.id,
        slug: tags.slug,
        name: tags.name,
      })
      .from(goodsTags)
      .innerJoin(tags, eq(goodsTags.tagId, tags.id))
      .where(eq(goodsTags.goodsId, detail.id))
      .orderBy(asc(tags.name)),
    db
      .select({
        id: characters.id,
        slug: characters.slug,
        name: characters.name,
        nameLocalized: characters.nameLocalized,
        avatarImageUrl: characters.avatarImageUrl,
        sortOrder: goodsCharacters.sortOrder,
        isPrimary: goodsCharacters.isPrimary,
      })
      .from(goodsCharacters)
      .innerJoin(characters, eq(goodsCharacters.characterId, characters.id))
      .where(eq(goodsCharacters.goodsId, detail.id))
      .orderBy(
        asc(goodsCharacters.sortOrder),
        desc(goodsCharacters.isPrimary),
        asc(characters.name),
      ),
    db
      .select({
        averageScore: sql<string | null>`avg(${ratings.score})`,
        ratingCount: sql<number>`count(${ratings.id})`,
      })
      .from(ratings)
      .where(eq(ratings.goodsId, detail.id)),
    db
      .select({
        postCount: sql<number>`count(${posts.id})`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.goodsId, detail.id),
          eq(posts.status, 'visible'),
          eq(posts.moderationStatus, 'approved'),
        ),
      ),
    db
      .select({
        openExchangeCount: sql<number>`count(${exchangeListings.id})`,
      })
      .from(exchangeListings)
      .where(
        and(
          eq(exchangeListings.goodsId, detail.id),
          eq(exchangeListings.status, 'open'),
          eq(exchangeListings.moderationStatus, 'approved'),
        ),
      ),
  ]);

  const ratingSummary = ratingRows[0];
  const postSummary = postRows[0];
  const exchangeSummary = exchangeRows[0];

  return {
    id: detail.id,
    slug: detail.slug,
    skuCode: detail.skuCode,
    name: detail.name,
    description: detail.description,
    goodsType: detail.goodsType,
    material: detail.material,
    sizeLabel: detail.sizeLabel,
    edition: detail.edition,
    releaseDate: detail.releaseDate,
    msrpAmount: detail.msrpAmount,
    currencyCode: detail.currencyCode,
    metadata: detail.metadata ?? null,
    series: {
      id: detail.seriesId,
      slug: detail.seriesSlug,
      name: detail.seriesName,
      seriesType: detail.seriesType,
      releaseDate: detail.seriesReleaseDate,
    },
    ip: {
      id: detail.ipId,
      slug: detail.ipSlug,
      name: detail.ipName,
      nameLocalized: detail.ipNameLocalized,
    },
    images: imageRows,
    tags: tagRows,
    characters: characterRows,
    summary: {
      ratingAverage: ratingSummary?.averageScore
        ? Number(ratingSummary.averageScore)
        : null,
      ratingCount: Number(ratingSummary?.ratingCount ?? 0),
      postCount: Number(postSummary?.postCount ?? 0),
      openExchangeCount: Number(exchangeSummary?.openExchangeCount ?? 0),
    },
  } satisfies GoodsDetailPageData;
}

export async function getCharacterEncyclopediaViewData(
  input: z.input<typeof characterViewInputSchema>,
) {
  const { ipSlug, characterSlug, userId, limit } =
    characterViewInputSchema.parse(input);
  const pageData = await getCharacterEncyclopediaPageData({
    ipSlug,
    characterSlug,
    limit,
  });

  if (!pageData) {
    return null;
  }

  const goodsIds = pageData.goods.map((item) => item.id);
  const stateMap =
    userId && goodsIds.length > 0
      ? await getUserGoodsStateMap({
          userId,
          goodsIds,
        })
      : Object.fromEntries(
          goodsIds.map((goodsId) => [
            goodsId,
            {
              goodsId,
              statuses: [],
            } satisfies UserGoodsStateSnapshot,
          ]),
        );

  const goods = pageData.goods.map((item) => {
    const snapshot = stateMap[item.id] ?? {
      goodsId: item.id,
      statuses: [],
    };
    const isOwned = snapshot.statuses.some(({ status }) => status === 'owned');
    const isWanted = snapshot.statuses.some(
      ({ status }) => status === 'wanted',
    );
    const isExchange = snapshot.statuses.some(
      ({ status }) => status === 'exchange',
    );

    return {
      ...item,
      viewerState: snapshot.statuses,
      isOwned,
      isWanted,
      isExchange,
    } satisfies CharacterCollectionGoodsCard;
  });

  const tagsMap = new Map<string, CharacterFilterOptions['tags'][number]>();
  const goodsTypeMap = new Map<
    string,
    CharacterFilterOptions['goodsTypes'][number]
  >();
  const seriesMap = new Map<string, CharacterSeriesCompletion>();

  for (const item of goods) {
    const existingGoodsType = goodsTypeMap.get(item.goodsType);

    goodsTypeMap.set(item.goodsType, {
      value: item.goodsType,
      goodsCount: (existingGoodsType?.goodsCount ?? 0) + 1,
    });

    const existingSeries = seriesMap.get(item.series.id);
    const ownedGoods =
      (existingSeries?.ownedGoods ?? 0) + (item.isOwned ? 1 : 0);
    const totalGoods = (existingSeries?.totalGoods ?? 0) + 1;

    seriesMap.set(item.series.id, {
      id: item.series.id,
      slug: item.series.slug,
      name: item.series.name,
      totalGoods,
      ownedGoods,
      progressPercentage: Math.round((ownedGoods / totalGoods) * 100),
      isComplete: ownedGoods === totalGoods,
    });

    for (const tag of item.tags) {
      const existingTag = tagsMap.get(tag.id);

      tagsMap.set(tag.id, {
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        goodsCount: (existingTag?.goodsCount ?? 0) + 1,
      });
    }
  }

  const ownedGoodsIds = goods
    .filter((item) => item.isOwned)
    .map((item) => item.id);
  const totalGoods = goods.length;
  const ownedGoods = ownedGoodsIds.length;
  const seriesCompletion = Array.from(seriesMap.values()).sort(
    (left, right) =>
      right.totalGoods - left.totalGoods || left.name.localeCompare(right.name),
  );

  return {
    ...pageData,
    goods,
    viewer: {
      userId: userId ?? null,
      ownedGoodsIds,
    },
    completion: {
      character: {
        totalGoods,
        ownedGoods,
        remainingGoods: Math.max(totalGoods - ownedGoods, 0),
        progressPercentage:
          totalGoods > 0 ? Math.round((ownedGoods / totalGoods) * 100) : 0,
        completedSeriesCount: seriesCompletion.filter((item) => item.isComplete)
          .length,
        totalSeriesCount: seriesCompletion.length,
        litGoodsIds: ownedGoodsIds,
      },
      series: seriesCompletion,
      ip: {
        id: pageData.ip.id,
        slug: pageData.ip.slug,
        status: 'reserved',
        totalGoods: null,
        ownedGoods: null,
        progressPercentage: null,
      },
    },
    filters: {
      tags: Array.from(tagsMap.values()).sort(
        (left, right) =>
          right.goodsCount - left.goodsCount ||
          left.name.localeCompare(right.name),
      ),
      goodsTypes: Array.from(goodsTypeMap.values()).sort(
        (left, right) =>
          right.goodsCount - left.goodsCount ||
          left.value.localeCompare(right.value),
      ),
      series: seriesCompletion.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        goodsCount: item.totalGoods,
      })),
    },
  } satisfies CharacterEncyclopediaViewData;
}
