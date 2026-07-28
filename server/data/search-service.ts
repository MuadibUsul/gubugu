import 'server-only';

import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  characters,
  goods,
  goodsCharacters,
  goodsTags,
  ips,
  series,
  tags,
} from '@/drizzle/schema';
import { getPublishedGoodsCardsByIds } from '@/server/data/_shared';
import { getDb } from '@/server/db/client';

export const goodsSearchInputSchema = z.object({
  query: z.string().trim().max(100).optional(),
  ipSlug: z.string().trim().min(1).optional(),
  characterSlug: z.string().trim().min(1).optional(),
  seriesSlug: z.string().trim().min(1).optional(),
  goodsType: z.string().trim().min(1).optional(),
  tagSlugs: z.array(z.string().trim().min(1)).max(12).default([]),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(48).default(24),
});

export type GoodsSearchInput = z.input<typeof goodsSearchInputSchema>;
export type GoodsSearchParams = z.output<typeof goodsSearchInputSchema>;
export type GoodsSearchResult = {
  items: Awaited<ReturnType<typeof getPublishedGoodsCardsByIds>>;
  total: number;
  page: number;
  pageSize: number;
  query: string | undefined;
  filters: {
    ipSlug?: string;
    characterSlug?: string;
    seriesSlug?: string;
    goodsType?: string;
    tagSlugs: string[];
  };
};

export type GoodsSearchIpFacet = {
  id: string;
  slug: string;
  name: string;
  goodsCount: number;
};

export type GoodsSearchCharacterFacet = {
  id: string;
  slug: string;
  name: string;
  ipSlug: string;
  goodsCount: number;
};

export type GoodsSearchSeriesFacet = {
  id: string;
  slug: string;
  name: string;
  ipSlug: string;
  goodsCount: number;
};

export type GoodsSearchTagFacet = {
  id: string;
  slug: string;
  name: string;
  goodsCount: number;
};

export type GoodsSearchGoodsTypeFacet = {
  value: string;
  goodsCount: number;
};

export type GoodsSearchFilterOptions = {
  ips: GoodsSearchIpFacet[];
  characters: GoodsSearchCharacterFacet[];
  series: GoodsSearchSeriesFacet[];
  tags: GoodsSearchTagFacet[];
  goodsTypes: GoodsSearchGoodsTypeFacet[];
};

export type GoodsSearchPageData = {
  results: GoodsSearchResult;
  filterOptions: GoodsSearchFilterOptions;
};

const goodsSearchFilterOptionsInputSchema = z.object({
  selectedIpSlug: z.string().trim().min(1).optional(),
  selectedCharacterSlug: z.string().trim().min(1).optional(),
  selectedSeriesSlug: z.string().trim().min(1).optional(),
  selectedTagSlugs: z.array(z.string().trim().min(1)).max(12).default([]),
  ipLimit: z.number().int().min(1).max(36).default(18),
  characterLimit: z.number().int().min(1).max(36).default(18),
  seriesLimit: z.number().int().min(1).max(36).default(18),
  tagLimit: z.number().int().min(1).max(36).default(18),
});

export interface GoodsSearchProvider {
  searchGoods(params: GoodsSearchParams): Promise<GoodsSearchResult>;
}

class SqlGoodsSearchProvider implements GoodsSearchProvider {
  async searchGoods(params: GoodsSearchParams) {
    const db = getDb();
    const offset = (params.page - 1) * params.pageSize;
    const normalizedQuery = params.query?.trim();
    const queryPattern =
      normalizedQuery && normalizedQuery.length > 0
        ? `%${normalizedQuery}%`
        : undefined;

    const whereClause = and(
      eq(goods.status, 'published'),
      eq(series.status, 'published'),
      eq(ips.status, 'published'),
      params.ipSlug ? eq(ips.slug, params.ipSlug) : undefined,
      params.characterSlug
        ? eq(characters.slug, params.characterSlug)
        : undefined,
      params.seriesSlug ? eq(series.slug, params.seriesSlug) : undefined,
      params.goodsType ? eq(goods.goodsType, params.goodsType) : undefined,
      params.tagSlugs.length > 0
        ? inArray(tags.slug, params.tagSlugs)
        : undefined,
      queryPattern
        ? or(
            ilike(goods.name, queryPattern),
            ilike(goods.skuCode, queryPattern),
            ilike(goods.description, queryPattern),
            ilike(series.name, queryPattern),
            ilike(ips.name, queryPattern),
            ilike(ips.nameLocalized, queryPattern),
            ilike(characters.name, queryPattern),
            ilike(tags.name, queryPattern),
          )
        : undefined,
    );

    const [countRows, goodsIdRows] = await Promise.all([
      db
        .select({
          total: sql<number>`count(distinct ${goods.id})`,
        })
        .from(goods)
        .innerJoin(series, eq(goods.seriesId, series.id))
        .innerJoin(ips, eq(series.ipId, ips.id))
        .leftJoin(goodsCharacters, eq(goodsCharacters.goodsId, goods.id))
        .leftJoin(characters, eq(goodsCharacters.characterId, characters.id))
        .leftJoin(goodsTags, eq(goodsTags.goodsId, goods.id))
        .leftJoin(tags, eq(goodsTags.tagId, tags.id))
        .where(whereClause),
      db
        .selectDistinct({
          goodsId: goods.id,
          releaseDate: goods.releaseDate,
          createdAt: goods.createdAt,
          name: goods.name,
        })
        .from(goods)
        .innerJoin(series, eq(goods.seriesId, series.id))
        .innerJoin(ips, eq(series.ipId, ips.id))
        .leftJoin(goodsCharacters, eq(goodsCharacters.goodsId, goods.id))
        .leftJoin(characters, eq(goodsCharacters.characterId, characters.id))
        .leftJoin(goodsTags, eq(goodsTags.goodsId, goods.id))
        .leftJoin(tags, eq(goodsTags.tagId, tags.id))
        .where(whereClause)
        .orderBy(
          desc(goods.releaseDate),
          desc(goods.createdAt),
          asc(goods.name),
        )
        .limit(params.pageSize)
        .offset(offset),
    ]);

    const itemIds = goodsIdRows.map((row) => row.goodsId);
    const items = await getPublishedGoodsCardsByIds(itemIds);

    return {
      items,
      total: Number(countRows[0]?.total ?? 0),
      page: params.page,
      pageSize: params.pageSize,
      query: normalizedQuery || undefined,
      filters: {
        ipSlug: params.ipSlug,
        characterSlug: params.characterSlug,
        seriesSlug: params.seriesSlug,
        goodsType: params.goodsType,
        tagSlugs: params.tagSlugs,
      },
    } satisfies GoodsSearchResult;
  }
}

let goodsSearchProvider: GoodsSearchProvider = new SqlGoodsSearchProvider();

function mergeFacetRows<T extends { slug: string }>(
  selectedSlugs: string[],
  selectedRows: T[],
  topRows: T[],
) {
  const selectedMap = new Map(
    selectedRows.map((row) => [row.slug, row] satisfies [string, T]),
  );

  return [
    ...selectedSlugs
      .map((slug) => selectedMap.get(slug))
      .filter((row): row is T => Boolean(row)),
    ...topRows,
  ].filter(
    (row, index, rows) =>
      rows.findIndex((candidate) => candidate.slug === row.slug) === index,
  );
}

export function registerGoodsSearchProvider(provider: GoodsSearchProvider) {
  goodsSearchProvider = provider;
}

export async function searchGoodsCatalog(input: GoodsSearchInput) {
  const params = goodsSearchInputSchema.parse(input);

  return goodsSearchProvider.searchGoods(params);
}

export async function getGoodsSearchFilterOptions(
  input?: z.input<typeof goodsSearchFilterOptionsInputSchema>,
) {
  const db = getDb();
  const {
    selectedIpSlug,
    selectedCharacterSlug,
    selectedSeriesSlug,
    selectedTagSlugs,
    ipLimit,
    characterLimit,
    seriesLimit,
    tagLimit,
  } = goodsSearchFilterOptionsInputSchema.parse(input ?? {});
  const publishedGoodsWhereClause = and(
    eq(goods.status, 'published'),
    eq(series.status, 'published'),
    eq(ips.status, 'published'),
  );
  const countDistinctGoods = sql<number>`count(distinct ${goods.id})`;
  const selectedIpSlugs = selectedIpSlug ? [selectedIpSlug] : [];
  const selectedCharacterSlugs = selectedCharacterSlug
    ? [selectedCharacterSlug]
    : [];
  const selectedSeriesSlugs = selectedSeriesSlug ? [selectedSeriesSlug] : [];
  const characterFacetWhereClause = and(
    publishedGoodsWhereClause,
    selectedIpSlug ? eq(ips.slug, selectedIpSlug) : undefined,
  );
  const seriesFacetWhereClause = and(
    publishedGoodsWhereClause,
    selectedIpSlug ? eq(ips.slug, selectedIpSlug) : undefined,
  );

  const [
    topIpRows,
    selectedIpRows,
    topCharacterRows,
    selectedCharacterRows,
    topSeriesRows,
    selectedSeriesRows,
    topTagRows,
    selectedTagRows,
    goodsTypeRows,
  ] = await Promise.all([
    db
      .select({
        id: ips.id,
        slug: ips.slug,
        name: ips.name,
        goodsCount: countDistinctGoods,
      })
      .from(ips)
      .innerJoin(series, eq(series.ipId, ips.id))
      .innerJoin(goods, eq(goods.seriesId, series.id))
      .where(publishedGoodsWhereClause)
      .groupBy(ips.id)
      .orderBy(desc(countDistinctGoods), asc(ips.name))
      .limit(ipLimit),
    selectedIpSlugs.length > 0
      ? db
          .select({
            id: ips.id,
            slug: ips.slug,
            name: ips.name,
            goodsCount: countDistinctGoods,
          })
          .from(ips)
          .innerJoin(series, eq(series.ipId, ips.id))
          .innerJoin(goods, eq(goods.seriesId, series.id))
          .where(
            and(publishedGoodsWhereClause, inArray(ips.slug, selectedIpSlugs)),
          )
          .groupBy(ips.id)
      : Promise.resolve([]),
    db
      .select({
        id: characters.id,
        slug: characters.slug,
        name: characters.name,
        ipSlug: ips.slug,
        goodsCount: countDistinctGoods,
      })
      .from(characters)
      .innerJoin(ips, eq(characters.ipId, ips.id))
      .innerJoin(
        goodsCharacters,
        eq(goodsCharacters.characterId, characters.id),
      )
      .innerJoin(goods, eq(goodsCharacters.goodsId, goods.id))
      .innerJoin(series, eq(goods.seriesId, series.id))
      .where(characterFacetWhereClause)
      .groupBy(characters.id, ips.slug)
      .orderBy(desc(countDistinctGoods), asc(characters.name))
      .limit(characterLimit),
    selectedCharacterSlugs.length > 0
      ? db
          .select({
            id: characters.id,
            slug: characters.slug,
            name: characters.name,
            ipSlug: ips.slug,
            goodsCount: countDistinctGoods,
          })
          .from(characters)
          .innerJoin(ips, eq(characters.ipId, ips.id))
          .innerJoin(
            goodsCharacters,
            eq(goodsCharacters.characterId, characters.id),
          )
          .innerJoin(goods, eq(goodsCharacters.goodsId, goods.id))
          .innerJoin(series, eq(goods.seriesId, series.id))
          .where(
            and(
              characterFacetWhereClause,
              inArray(characters.slug, selectedCharacterSlugs),
            ),
          )
          .groupBy(characters.id, ips.slug)
      : Promise.resolve([]),
    db
      .select({
        id: series.id,
        slug: series.slug,
        name: series.name,
        ipSlug: ips.slug,
        goodsCount: countDistinctGoods,
      })
      .from(series)
      .innerJoin(ips, eq(series.ipId, ips.id))
      .innerJoin(goods, eq(goods.seriesId, series.id))
      .where(seriesFacetWhereClause)
      .groupBy(series.id, ips.slug)
      .orderBy(desc(countDistinctGoods), asc(series.name))
      .limit(seriesLimit),
    selectedSeriesSlugs.length > 0
      ? db
          .select({
            id: series.id,
            slug: series.slug,
            name: series.name,
            ipSlug: ips.slug,
            goodsCount: countDistinctGoods,
          })
          .from(series)
          .innerJoin(ips, eq(series.ipId, ips.id))
          .innerJoin(goods, eq(goods.seriesId, series.id))
          .where(
            and(
              seriesFacetWhereClause,
              inArray(series.slug, selectedSeriesSlugs),
            ),
          )
          .groupBy(series.id, ips.slug)
      : Promise.resolve([]),
    db
      .select({
        id: tags.id,
        slug: tags.slug,
        name: tags.name,
        goodsCount: countDistinctGoods,
      })
      .from(tags)
      .innerJoin(goodsTags, eq(goodsTags.tagId, tags.id))
      .innerJoin(goods, eq(goodsTags.goodsId, goods.id))
      .innerJoin(series, eq(goods.seriesId, series.id))
      .innerJoin(ips, eq(series.ipId, ips.id))
      .where(publishedGoodsWhereClause)
      .groupBy(tags.id)
      .orderBy(desc(countDistinctGoods), asc(tags.name))
      .limit(tagLimit),
    selectedTagSlugs.length > 0
      ? db
          .select({
            id: tags.id,
            slug: tags.slug,
            name: tags.name,
            goodsCount: countDistinctGoods,
          })
          .from(tags)
          .innerJoin(goodsTags, eq(goodsTags.tagId, tags.id))
          .innerJoin(goods, eq(goodsTags.goodsId, goods.id))
          .innerJoin(series, eq(goods.seriesId, series.id))
          .innerJoin(ips, eq(series.ipId, ips.id))
          .where(
            and(
              publishedGoodsWhereClause,
              inArray(tags.slug, selectedTagSlugs),
            ),
          )
          .groupBy(tags.id)
      : Promise.resolve([]),
    db
      .select({
        value: goods.goodsType,
        goodsCount: countDistinctGoods,
      })
      .from(goods)
      .innerJoin(series, eq(goods.seriesId, series.id))
      .innerJoin(ips, eq(series.ipId, ips.id))
      .where(publishedGoodsWhereClause)
      .groupBy(goods.goodsType)
      .orderBy(desc(countDistinctGoods), asc(goods.goodsType)),
  ]);

  return {
    ips: mergeFacetRows(
      selectedIpSlugs,
      selectedIpRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        goodsCount: Number(row.goodsCount),
      })),
      topIpRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        goodsCount: Number(row.goodsCount),
      })),
    ),
    characters: mergeFacetRows(
      selectedCharacterSlugs,
      selectedCharacterRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        ipSlug: row.ipSlug,
        goodsCount: Number(row.goodsCount),
      })),
      topCharacterRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        ipSlug: row.ipSlug,
        goodsCount: Number(row.goodsCount),
      })),
    ),
    series: mergeFacetRows(
      selectedSeriesSlugs,
      selectedSeriesRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        ipSlug: row.ipSlug,
        goodsCount: Number(row.goodsCount),
      })),
      topSeriesRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        ipSlug: row.ipSlug,
        goodsCount: Number(row.goodsCount),
      })),
    ),
    tags: mergeFacetRows(
      selectedTagSlugs,
      selectedTagRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        goodsCount: Number(row.goodsCount),
      })),
      topTagRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        goodsCount: Number(row.goodsCount),
      })),
    ),
    goodsTypes: goodsTypeRows.map((row) => ({
      value: row.value,
      goodsCount: Number(row.goodsCount),
    })),
  } satisfies GoodsSearchFilterOptions;
}

export async function getGoodsSearchPageData(input: GoodsSearchInput) {
  const params = goodsSearchInputSchema.parse(input);
  const [results, filterOptions] = await Promise.all([
    goodsSearchProvider.searchGoods(params),
    getGoodsSearchFilterOptions({
      selectedIpSlug: params.ipSlug,
      selectedCharacterSlug: params.characterSlug,
      selectedSeriesSlug: params.seriesSlug,
      selectedTagSlugs: params.tagSlugs,
    }),
  ]);

  return {
    results,
    filterOptions,
  } satisfies GoodsSearchPageData;
}
