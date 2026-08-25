import 'server-only';

import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  characters,
  goods,
  goodsCharacters,
  ips,
  series,
} from '@/drizzle/schema';
import { getPublishedGoodsCardsByIds } from '@/server/data/_shared';
import { descNullsLast } from '@/server/data/ordering';
import { unstable_cache } from 'next/cache';

import { catalogCacheTag, ipCacheTag, seriesCacheTag } from '@/lib/cache-tags';
import { getDb } from '@/server/db/client';

// Mirrors server/data/catalog.ts: tags drive invalidation, the window is a
// backstop for writes that bypass the app.
const CATALOG_REVALIDATE_SECONDS = 300;

const ipEncyclopediaInputSchema = z.object({
  ipSlug: z.string().trim().min(1),
  limit: z.number().int().min(1).max(48).default(24),
});

const seriesEncyclopediaInputSchema = z.object({
  ipSlug: z.string().trim().min(1),
  seriesSlug: z.string().trim().min(1),
  limit: z.number().int().min(1).max(48).default(24),
});

export type IpEncyclopediaPageData = {
  ip: {
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
    description: string | null;
    coverImageUrl: string | null;
  };
  summary: {
    goodsCount: number;
    characterCount: number;
    seriesCount: number;
  };
  characters: Array<{
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
    goodsCount: number;
  }>;
  series: Array<{
    id: string;
    slug: string;
    name: string;
    seriesType: string;
    releaseDate: Date | null;
    goodsCount: number;
  }>;
  goods: Awaited<ReturnType<typeof getPublishedGoodsCardsByIds>>;
};

export type SeriesEncyclopediaPageData = {
  ip: {
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
  };
  series: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    seriesType: string;
    releaseDate: Date | null;
  };
  summary: {
    goodsCount: number;
    characterCount: number;
  };
  characters: Array<{
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
    goodsCount: number;
  }>;
  goods: Awaited<ReturnType<typeof getPublishedGoodsCardsByIds>>;
};

export async function getIpEncyclopediaPageData(
  input: z.input<typeof ipEncyclopediaInputSchema>,
) {
  const { ipSlug, limit } = ipEncyclopediaInputSchema.parse(input);

  return unstable_cache(
    () => getIpEncyclopediaPageDataUncached(ipSlug, limit),
    ['ip-page', ipSlug, `${limit}`],
    {
      tags: [catalogCacheTag, ipCacheTag(ipSlug)],
      revalidate: CATALOG_REVALIDATE_SECONDS,
    },
  )();
}

async function getIpEncyclopediaPageDataUncached(
  ipSlug: string,
  limit: number,
) {
  const db = getDb();

  const ipRows = await db
    .select({
      id: ips.id,
      slug: ips.slug,
      name: ips.name,
      nameLocalized: ips.nameLocalized,
      description: ips.description,
      coverImageUrl: ips.coverImageUrl,
    })
    .from(ips)
    .where(and(eq(ips.slug, ipSlug), eq(ips.status, 'published')))
    .limit(1);

  const ipRecord = ipRows[0];

  if (!ipRecord) {
    return null;
  }

  const characterGoodsCountSql = sql<number>`count(distinct case when ${series.id} is not null then ${goods.id} end)`;
  const seriesGoodsCountSql = sql<number>`count(distinct ${goods.id})`;

  const [summaryRows, characterRows, seriesRows, goodsRows] = await Promise.all(
    [
      db
        .select({
          characterCount: sql<number>`count(distinct ${characters.id})`,
          seriesCount: sql<number>`count(distinct ${series.id})`,
          goodsCount: sql<number>`count(distinct ${goods.id})`,
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
        .where(eq(ips.id, ipRecord.id)),
      db
        .select({
          id: characters.id,
          slug: characters.slug,
          name: characters.name,
          nameLocalized: characters.nameLocalized,
          goodsCount: characterGoodsCountSql,
        })
        .from(characters)
        .leftJoin(
          goodsCharacters,
          eq(goodsCharacters.characterId, characters.id),
        )
        .leftJoin(
          goods,
          and(
            eq(goodsCharacters.goodsId, goods.id),
            eq(goods.status, 'published'),
          ),
        )
        .leftJoin(
          series,
          and(
            eq(goods.seriesId, series.id),
            eq(series.status, 'published'),
            eq(series.ipId, ipRecord.id),
          ),
        )
        .where(
          and(
            eq(characters.ipId, ipRecord.id),
            eq(characters.status, 'published'),
          ),
        )
        .groupBy(characters.id)
        .orderBy(desc(characterGoodsCountSql), asc(characters.name)),
      db
        .select({
          id: series.id,
          slug: series.slug,
          name: series.name,
          seriesType: series.seriesType,
          releaseDate: series.releaseDate,
          goodsCount: seriesGoodsCountSql,
        })
        .from(series)
        .leftJoin(
          goods,
          and(eq(goods.seriesId, series.id), eq(goods.status, 'published')),
        )
        .where(
          and(eq(series.ipId, ipRecord.id), eq(series.status, 'published')),
        )
        .groupBy(series.id)
        .orderBy(
          descNullsLast(series.releaseDate),
          desc(seriesGoodsCountSql),
          asc(series.name),
        ),
      db
        .selectDistinct({
          goodsId: goods.id,
          releaseDate: goods.releaseDate,
          createdAt: goods.createdAt,
          name: goods.name,
        })
        .from(goods)
        .innerJoin(
          series,
          and(
            eq(goods.seriesId, series.id),
            eq(series.ipId, ipRecord.id),
            eq(series.status, 'published'),
          ),
        )
        .where(eq(goods.status, 'published'))
        .orderBy(
          descNullsLast(goods.releaseDate),
          desc(goods.createdAt),
          asc(goods.name),
        )
        .limit(limit),
    ],
  );

  const goodsCards = await getPublishedGoodsCardsByIds(
    goodsRows.map((row) => row.goodsId),
  );
  const summary = summaryRows[0];

  return {
    ip: ipRecord,
    summary: {
      goodsCount: Number(summary?.goodsCount ?? 0),
      characterCount: Number(summary?.characterCount ?? 0),
      seriesCount: Number(summary?.seriesCount ?? 0),
    },
    characters: characterRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameLocalized: row.nameLocalized,
      goodsCount: Number(row.goodsCount),
    })),
    series: seriesRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      seriesType: row.seriesType,
      releaseDate: row.releaseDate,
      goodsCount: Number(row.goodsCount),
    })),
    goods: goodsCards,
  } satisfies IpEncyclopediaPageData;
}

export async function getSeriesEncyclopediaPageData(
  input: z.input<typeof seriesEncyclopediaInputSchema>,
) {
  const { ipSlug, seriesSlug, limit } =
    seriesEncyclopediaInputSchema.parse(input);

  return unstable_cache(
    () => getSeriesEncyclopediaPageDataUncached(ipSlug, seriesSlug, limit),
    ['series-page', ipSlug, seriesSlug, `${limit}`],
    {
      tags: [catalogCacheTag, seriesCacheTag(ipSlug, seriesSlug)],
      revalidate: CATALOG_REVALIDATE_SECONDS,
    },
  )();
}

async function getSeriesEncyclopediaPageDataUncached(
  ipSlug: string,
  seriesSlug: string,
  limit: number,
) {
  const db = getDb();

  const seriesRows = await db
    .select({
      ipId: ips.id,
      ipSlug: ips.slug,
      ipName: ips.name,
      ipNameLocalized: ips.nameLocalized,
      seriesId: series.id,
      seriesActualSlug: series.slug,
      seriesName: series.name,
      seriesDescription: series.description,
      seriesCoverImageUrl: series.coverImageUrl,
      seriesType: series.seriesType,
      seriesReleaseDate: series.releaseDate,
    })
    .from(series)
    .innerJoin(ips, eq(series.ipId, ips.id))
    .where(
      and(
        eq(ips.slug, ipSlug),
        eq(ips.status, 'published'),
        eq(series.slug, seriesSlug),
        eq(series.status, 'published'),
      ),
    )
    .limit(1);

  const seriesRecord = seriesRows[0];

  if (!seriesRecord) {
    return null;
  }

  const characterGoodsCountSql = sql<number>`count(distinct ${goods.id})`;

  const [summaryRows, characterRows, goodsRows] = await Promise.all([
    db
      .select({
        goodsCount: sql<number>`count(distinct ${goods.id})`,
        characterCount: sql<number>`count(distinct ${characters.id})`,
      })
      .from(goods)
      .leftJoin(goodsCharacters, eq(goodsCharacters.goodsId, goods.id))
      .leftJoin(
        characters,
        and(
          eq(goodsCharacters.characterId, characters.id),
          eq(characters.status, 'published'),
        ),
      )
      .where(
        and(
          eq(goods.seriesId, seriesRecord.seriesId),
          eq(goods.status, 'published'),
        ),
      ),
    db
      .select({
        id: characters.id,
        slug: characters.slug,
        name: characters.name,
        nameLocalized: characters.nameLocalized,
        goodsCount: characterGoodsCountSql,
      })
      .from(goodsCharacters)
      .innerJoin(goods, eq(goodsCharacters.goodsId, goods.id))
      .innerJoin(
        characters,
        and(
          eq(goodsCharacters.characterId, characters.id),
          eq(characters.status, 'published'),
        ),
      )
      .where(
        and(
          eq(goods.seriesId, seriesRecord.seriesId),
          eq(goods.status, 'published'),
        ),
      )
      .groupBy(characters.id)
      .orderBy(desc(characterGoodsCountSql), asc(characters.name)),
    db
      .selectDistinct({
        goodsId: goods.id,
        releaseDate: goods.releaseDate,
        createdAt: goods.createdAt,
        name: goods.name,
      })
      .from(goods)
      .where(
        and(
          eq(goods.seriesId, seriesRecord.seriesId),
          eq(goods.status, 'published'),
        ),
      )
      .orderBy(
        descNullsLast(goods.releaseDate),
        desc(goods.createdAt),
        asc(goods.name),
      )
      .limit(limit),
  ]);

  const goodsCards = await getPublishedGoodsCardsByIds(
    goodsRows.map((row) => row.goodsId),
  );
  const summary = summaryRows[0];

  return {
    ip: {
      id: seriesRecord.ipId,
      slug: seriesRecord.ipSlug,
      name: seriesRecord.ipName,
      nameLocalized: seriesRecord.ipNameLocalized,
    },
    series: {
      id: seriesRecord.seriesId,
      slug: seriesRecord.seriesActualSlug,
      name: seriesRecord.seriesName,
      description: seriesRecord.seriesDescription,
      coverImageUrl: seriesRecord.seriesCoverImageUrl,
      seriesType: seriesRecord.seriesType,
      releaseDate: seriesRecord.seriesReleaseDate,
    },
    summary: {
      goodsCount: Number(summary?.goodsCount ?? 0),
      characterCount: Number(summary?.characterCount ?? 0),
    },
    characters: characterRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameLocalized: row.nameLocalized,
      goodsCount: Number(row.goodsCount),
    })),
    goods: goodsCards,
  } satisfies SeriesEncyclopediaPageData;
}
