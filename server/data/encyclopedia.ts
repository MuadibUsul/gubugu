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
import { getPublishedGoodsCardsByIds, type GoodsCardData } from '@/server/data/_shared';
import { getDb } from '@/server/db/client';

const ipPageInputSchema = z.object({
  ipSlug: z.string().trim().min(1),
});

const seriesPageInputSchema = z.object({
  ipSlug: z.string().trim().min(1),
  seriesSlug: z.string().trim().min(1),
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
    characterCount: number;
    seriesCount: number;
    goodsCount: number;
  };
  characters: Array<{
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
    avatarImageUrl: string | null;
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
  goods: GoodsCardData[];
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
    avatarImageUrl: string | null;
    goodsCount: number;
  }>;
  goods: GoodsCardData[];
};

export async function getIpEncyclopediaPageData(
  input: z.input<typeof ipPageInputSchema>,
) {
  const db = getDb();
  const { ipSlug } = ipPageInputSchema.parse(input);

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

  const ip = ipRows[0];

  if (!ip) {
    return null;
  }

  const [summaryRows, characterRows, seriesRows, goodsRows] = await Promise.all([
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
      .leftJoin(goods, and(eq(goods.seriesId, series.id), eq(goods.status, 'published')))
      .where(eq(ips.id, ip.id)),
    db
      .select({
        id: characters.id,
        slug: characters.slug,
        name: characters.name,
        nameLocalized: characters.nameLocalized,
        avatarImageUrl: characters.avatarImageUrl,
        goodsCount: sql<number>`count(distinct ${goodsCharacters.goodsId})`,
      })
      .from(characters)
      .leftJoin(goodsCharacters, eq(goodsCharacters.characterId, characters.id))
      .leftJoin(goods, eq(goods.id, goodsCharacters.goodsId))
      .where(and(eq(characters.ipId, ip.id), eq(characters.status, 'published')))
      .groupBy(characters.id)
      .orderBy(desc(sql<number>`count(distinct ${goodsCharacters.goodsId})`), asc(characters.name)),
    db
      .select({
        id: series.id,
        slug: series.slug,
        name: series.name,
        seriesType: series.seriesType,
        releaseDate: series.releaseDate,
        goodsCount: sql<number>`count(distinct ${goods.id})`,
      })
      .from(series)
      .leftJoin(goods, eq(goods.seriesId, series.id))
      .where(and(eq(series.ipId, ip.id), eq(series.status, 'published')))
      .groupBy(series.id)
      .orderBy(desc(series.releaseDate), asc(series.name)),
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
        and(eq(goods.seriesId, series.id), eq(series.status, 'published')),
      )
      .where(and(eq(series.ipId, ip.id), eq(goods.status, 'published')))
      .orderBy(desc(goods.releaseDate), desc(goods.createdAt), asc(goods.name))
      .limit(8),
  ]);

  const summary = summaryRows[0];
  const goodsCards = await getPublishedGoodsCardsByIds(
    goodsRows.map((row) => row.goodsId),
  );

  return {
    ip,
    summary: {
      characterCount: Number(summary?.characterCount ?? 0),
      seriesCount: Number(summary?.seriesCount ?? 0),
      goodsCount: Number(summary?.goodsCount ?? 0),
    },
    characters: characterRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameLocalized: row.nameLocalized,
      avatarImageUrl: row.avatarImageUrl,
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
  input: z.input<typeof seriesPageInputSchema>,
) {
  const db = getDb();
  const { ipSlug, seriesSlug } = seriesPageInputSchema.parse(input);

  const seriesRows = await db
    .select({
      id: series.id,
      slug: series.slug,
      name: series.name,
      description: series.description,
      coverImageUrl: series.coverImageUrl,
      seriesType: series.seriesType,
      releaseDate: series.releaseDate,
      ipId: ips.id,
      ipSlug: ips.slug,
      ipName: ips.name,
      ipNameLocalized: ips.nameLocalized,
    })
    .from(series)
    .innerJoin(ips, eq(series.ipId, ips.id))
    .where(
      and(
        eq(series.slug, seriesSlug),
        eq(series.status, 'published'),
        eq(ips.slug, ipSlug),
        eq(ips.status, 'published'),
      ),
    )
    .limit(1);

  const seriesDetail = seriesRows[0];

  if (!seriesDetail) {
    return null;
  }

  const [summaryRows, characterRows, goodsRows] = await Promise.all([
    db
      .select({
        goodsCount: sql<number>`count(distinct ${goods.id})`,
        characterCount: sql<number>`count(distinct ${characters.id})`,
      })
      .from(series)
      .leftJoin(goods, and(eq(goods.seriesId, series.id), eq(goods.status, 'published')))
      .leftJoin(goodsCharacters, eq(goodsCharacters.goodsId, goods.id))
      .leftJoin(
        characters,
        and(eq(goodsCharacters.characterId, characters.id), eq(characters.status, 'published')),
      )
      .where(eq(series.id, seriesDetail.id)),
    db
      .select({
        id: characters.id,
        slug: characters.slug,
        name: characters.name,
        nameLocalized: characters.nameLocalized,
        avatarImageUrl: characters.avatarImageUrl,
        goodsCount: sql<number>`count(distinct ${goods.id})`,
      })
      .from(goodsCharacters)
      .innerJoin(goods, eq(goodsCharacters.goodsId, goods.id))
      .innerJoin(
        characters,
        and(eq(goodsCharacters.characterId, characters.id), eq(characters.status, 'published')),
      )
      .where(and(eq(goods.seriesId, seriesDetail.id), eq(goods.status, 'published')))
      .groupBy(characters.id)
      .orderBy(desc(sql<number>`count(distinct ${goods.id})`), asc(characters.name)),
    db
      .selectDistinct({
        goodsId: goods.id,
        releaseDate: goods.releaseDate,
        createdAt: goods.createdAt,
        name: goods.name,
      })
      .from(goods)
      .where(and(eq(goods.seriesId, seriesDetail.id), eq(goods.status, 'published')))
      .orderBy(desc(goods.releaseDate), desc(goods.createdAt), asc(goods.name)),
  ]);

  const summary = summaryRows[0];
  const goodsCards = await getPublishedGoodsCardsByIds(
    goodsRows.map((row) => row.goodsId),
  );

  return {
    ip: {
      id: seriesDetail.ipId,
      slug: seriesDetail.ipSlug,
      name: seriesDetail.ipName,
      nameLocalized: seriesDetail.ipNameLocalized,
    },
    series: {
      id: seriesDetail.id,
      slug: seriesDetail.slug,
      name: seriesDetail.name,
      description: seriesDetail.description,
      coverImageUrl: seriesDetail.coverImageUrl,
      seriesType: seriesDetail.seriesType,
      releaseDate: seriesDetail.releaseDate,
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
      avatarImageUrl: row.avatarImageUrl,
      goodsCount: Number(row.goodsCount),
    })),
    goods: goodsCards,
  } satisfies SeriesEncyclopediaPageData;
}
