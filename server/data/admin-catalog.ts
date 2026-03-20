import 'server-only';

import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { characters, goods, goodsCharacters, ips, series } from '@/drizzle/schema';
import type {
  AdminCatalogEntity,
  AdminCatalogManagementFilters,
} from '@/lib/admin-catalog';
import type { AdminGoodsPublicationStatus } from '@/lib/admin-goods';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { getDb } from '@/server/db/client';

const LIST_LIMIT = 48;

export const adminCatalogQuerySchema = z.object({
  entity: z.enum(['ip', 'character', 'series']).default('ip'),
  query: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  ipId: z.string().uuid().optional(),
  recordId: z.string().uuid().optional(),
  mode: z.enum(['create']).optional(),
});

export type AdminCatalogQueryParams = z.output<typeof adminCatalogQuerySchema>;

export type AdminCatalogIpOption = {
  id: string;
  slug: string;
  name: string;
  status: AdminGoodsPublicationStatus;
};

export type AdminIpListItem = {
  id: string;
  slug: string;
  name: string;
  nameLocalized: string | null;
  status: AdminGoodsPublicationStatus;
  characterCount: number;
  seriesCount: number;
  goodsCount: number;
  updatedAt: Date;
};

export type AdminCharacterListItem = {
  id: string;
  slug: string;
  name: string;
  nameLocalized: string | null;
  status: AdminGoodsPublicationStatus;
  goodsCount: number;
  updatedAt: Date;
  ip: {
    id: string;
    slug: string;
    name: string;
  };
};

export type AdminSeriesListItem = {
  id: string;
  slug: string;
  name: string;
  seriesType: string;
  releaseDate: Date | null;
  status: AdminGoodsPublicationStatus;
  goodsCount: number;
  updatedAt: Date;
  ip: {
    id: string;
    slug: string;
    name: string;
  };
};

export type AdminIpEditableRecord = {
  id: string;
  slug: string;
  name: string;
  nameLocalized: string | null;
  description: string | null;
  coverImageUrl: string | null;
  status: AdminGoodsPublicationStatus;
};

export type AdminCharacterEditableRecord = {
  id: string;
  ipId: string;
  slug: string;
  name: string;
  nameLocalized: string | null;
  description: string | null;
  avatarImageUrl: string | null;
  status: AdminGoodsPublicationStatus;
  ip: {
    id: string;
    slug: string;
    name: string;
  };
};

export type AdminSeriesEditableRecord = {
  id: string;
  ipId: string;
  slug: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  seriesType: string;
  releaseDate: Date | null;
  status: AdminGoodsPublicationStatus;
  ip: {
    id: string;
    slug: string;
    name: string;
  };
};

export type AdminCatalogPageData = {
  mode: 'live' | 'fallback';
  statusNote: string;
  entity: AdminCatalogEntity;
  filters: AdminCatalogManagementFilters;
  editorMode: 'create' | 'edit';
  stats: {
    totalIps: number;
    totalCharacters: number;
    totalSeries: number;
    publishedIps: number;
    publishedCharacters: number;
    publishedSeries: number;
  };
  ipOptions: AdminCatalogIpOption[];
  lists: {
    ips: AdminIpListItem[];
    characters: AdminCharacterListItem[];
    series: AdminSeriesListItem[];
  };
  selected: {
    ip: AdminIpEditableRecord | null;
    character: AdminCharacterEditableRecord | null;
    series: AdminSeriesEditableRecord | null;
  };
};

type AdminCatalogSearchParams = Record<string, string | string[] | undefined>;

function buildFilters(
  filters: AdminCatalogQueryParams,
): AdminCatalogManagementFilters {
  return {
    entity: filters.entity,
    query: filters.query,
    status: filters.status,
    ipId: filters.entity === 'ip' ? undefined : filters.ipId,
  };
}

export function parseAdminCatalogSearchParams(
  searchParams: AdminCatalogSearchParams,
) {
  return adminCatalogQuerySchema.parse({
    entity: getSingleSearchParamValue(searchParams.entity),
    query: getSingleSearchParamValue(searchParams.query),
    status: getSingleSearchParamValue(searchParams.status),
    ipId: getSingleSearchParamValue(searchParams.ipId),
    recordId: getSingleSearchParamValue(searchParams.recordId),
    mode: getSingleSearchParamValue(searchParams.mode),
  });
}

function createFallbackPageData(
  filters: AdminCatalogQueryParams,
): AdminCatalogPageData {
  return {
    mode: 'fallback',
    statusNote: '当前图鉴数据暂时不可用，请稍后再试。',
    entity: filters.entity,
    filters: buildFilters(filters),
    editorMode: 'create',
    stats: {
      totalIps: 0,
      totalCharacters: 0,
      totalSeries: 0,
      publishedIps: 0,
      publishedCharacters: 0,
      publishedSeries: 0,
    },
    ipOptions: [],
    lists: {
      ips: [],
      characters: [],
      series: [],
    },
    selected: {
      ip: null,
      character: null,
      series: null,
    },
  };
}

function resolveSelectedRecordId(
  filters: AdminCatalogQueryParams,
  fallbackId: string | null,
) {
  if (filters.mode === 'create') {
    return null;
  }

  return filters.recordId ?? fallbackId;
}

async function getIpEditableRecord(recordId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: ips.id,
      slug: ips.slug,
      name: ips.name,
      nameLocalized: ips.nameLocalized,
      description: ips.description,
      coverImageUrl: ips.coverImageUrl,
      status: ips.status,
    })
    .from(ips)
    .where(eq(ips.id, recordId))
    .limit(1);

  return rows[0] ?? null;
}

async function getCharacterEditableRecord(recordId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: characters.id,
      ipId: characters.ipId,
      slug: characters.slug,
      name: characters.name,
      nameLocalized: characters.nameLocalized,
      description: characters.description,
      avatarImageUrl: characters.avatarImageUrl,
      status: characters.status,
      ipSlug: ips.slug,
      ipName: ips.name,
    })
    .from(characters)
    .innerJoin(ips, eq(characters.ipId, ips.id))
    .where(eq(characters.id, recordId))
    .limit(1);

  const detail = rows[0];

  if (!detail) {
    return null;
  }

  return {
    id: detail.id,
    ipId: detail.ipId,
    slug: detail.slug,
    name: detail.name,
    nameLocalized: detail.nameLocalized,
    description: detail.description,
    avatarImageUrl: detail.avatarImageUrl,
    status: detail.status,
    ip: {
      id: detail.ipId,
      slug: detail.ipSlug,
      name: detail.ipName,
    },
  } satisfies AdminCharacterEditableRecord;
}

async function getSeriesEditableRecord(recordId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: series.id,
      ipId: series.ipId,
      slug: series.slug,
      name: series.name,
      description: series.description,
      coverImageUrl: series.coverImageUrl,
      seriesType: series.seriesType,
      releaseDate: series.releaseDate,
      status: series.status,
      ipSlug: ips.slug,
      ipName: ips.name,
    })
    .from(series)
    .innerJoin(ips, eq(series.ipId, ips.id))
    .where(eq(series.id, recordId))
    .limit(1);

  const detail = rows[0];

  if (!detail) {
    return null;
  }

  return {
    id: detail.id,
    ipId: detail.ipId,
    slug: detail.slug,
    name: detail.name,
    description: detail.description,
    coverImageUrl: detail.coverImageUrl,
    seriesType: detail.seriesType,
    releaseDate: detail.releaseDate,
    status: detail.status,
    ip: {
      id: detail.ipId,
      slug: detail.ipSlug,
      name: detail.ipName,
    },
  } satisfies AdminSeriesEditableRecord;
}

export async function getAdminCatalogPageData(
  input?: z.input<typeof adminCatalogQuerySchema>,
) {
  const filters = adminCatalogQuerySchema.parse(input ?? {});

  try {
    const db = getDb();
    const queryPattern =
      filters.query && filters.query.length > 0 ? `%${filters.query}%` : null;
    const countDistinctGoods = sql<number>`count(distinct ${goods.id})`;
    const countDistinctCharacters = sql<number>`count(distinct ${characters.id})`;
    const countDistinctSeries = sql<number>`count(distinct ${series.id})`;

    const [ipStatsRows, characterStatsRows, seriesStatsRows, ipOptionRows, ipRows, characterRows, seriesRows] =
      await Promise.all([
        db
          .select({
            total: sql<number>`count(${ips.id})`,
            published: sql<number>`coalesce(sum(case when ${ips.status} = 'published' then 1 else 0 end), 0)`,
          })
          .from(ips),
        db
          .select({
            total: sql<number>`count(${characters.id})`,
            published: sql<number>`coalesce(sum(case when ${characters.status} = 'published' then 1 else 0 end), 0)`,
          })
          .from(characters),
        db
          .select({
            total: sql<number>`count(${series.id})`,
            published: sql<number>`coalesce(sum(case when ${series.status} = 'published' then 1 else 0 end), 0)`,
          })
          .from(series),
        db
          .select({
            id: ips.id,
            slug: ips.slug,
            name: ips.name,
            status: ips.status,
          })
          .from(ips)
          .orderBy(asc(ips.name)),
        db
          .select({
            id: ips.id,
            slug: ips.slug,
            name: ips.name,
            nameLocalized: ips.nameLocalized,
            status: ips.status,
            characterCount: countDistinctCharacters,
            seriesCount: countDistinctSeries,
            goodsCount: countDistinctGoods,
            updatedAt: ips.updatedAt,
          })
          .from(ips)
          .leftJoin(characters, eq(characters.ipId, ips.id))
          .leftJoin(series, eq(series.ipId, ips.id))
          .leftJoin(goods, eq(goods.seriesId, series.id))
          .where(
            and(
              filters.status ? eq(ips.status, filters.status) : undefined,
              queryPattern
                ? or(
                    ilike(ips.name, queryPattern),
                    ilike(ips.slug, queryPattern),
                    ilike(ips.nameLocalized, queryPattern),
                    ilike(ips.description, queryPattern),
                  )
                : undefined,
            ),
          )
          .groupBy(ips.id)
          .orderBy(desc(ips.updatedAt), asc(ips.name))
          .limit(LIST_LIMIT),
        db
          .select({
            id: characters.id,
            slug: characters.slug,
            name: characters.name,
            nameLocalized: characters.nameLocalized,
            status: characters.status,
            goodsCount: sql<number>`count(distinct ${goodsCharacters.goodsId})`,
            updatedAt: characters.updatedAt,
            ipId: ips.id,
            ipSlug: ips.slug,
            ipName: ips.name,
          })
          .from(characters)
          .innerJoin(ips, eq(characters.ipId, ips.id))
          .leftJoin(goodsCharacters, eq(goodsCharacters.characterId, characters.id))
          .where(
            and(
              filters.status ? eq(characters.status, filters.status) : undefined,
              filters.ipId ? eq(characters.ipId, filters.ipId) : undefined,
              queryPattern
                ? or(
                    ilike(characters.name, queryPattern),
                    ilike(characters.slug, queryPattern),
                    ilike(characters.nameLocalized, queryPattern),
                    ilike(characters.description, queryPattern),
                    ilike(ips.name, queryPattern),
                  )
                : undefined,
            ),
          )
          .groupBy(characters.id, ips.id)
          .orderBy(desc(characters.updatedAt), asc(characters.name))
          .limit(LIST_LIMIT),
        db
          .select({
            id: series.id,
            slug: series.slug,
            name: series.name,
            seriesType: series.seriesType,
            releaseDate: series.releaseDate,
            status: series.status,
            goodsCount: countDistinctGoods,
            updatedAt: series.updatedAt,
            ipId: ips.id,
            ipSlug: ips.slug,
            ipName: ips.name,
          })
          .from(series)
          .innerJoin(ips, eq(series.ipId, ips.id))
          .leftJoin(goods, eq(goods.seriesId, series.id))
          .where(
            and(
              filters.status ? eq(series.status, filters.status) : undefined,
              filters.ipId ? eq(series.ipId, filters.ipId) : undefined,
              queryPattern
                ? or(
                    ilike(series.name, queryPattern),
                    ilike(series.slug, queryPattern),
                    ilike(series.description, queryPattern),
                    ilike(series.seriesType, queryPattern),
                    ilike(ips.name, queryPattern),
                  )
                : undefined,
            ),
          )
          .groupBy(series.id, ips.id)
          .orderBy(desc(series.updatedAt), desc(series.releaseDate), asc(series.name))
          .limit(LIST_LIMIT),
      ]);

    const ipList = ipRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameLocalized: row.nameLocalized,
      status: row.status,
      characterCount: Number(row.characterCount),
      seriesCount: Number(row.seriesCount),
      goodsCount: Number(row.goodsCount),
      updatedAt: row.updatedAt,
    })) satisfies AdminIpListItem[];

    const characterList = characterRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameLocalized: row.nameLocalized,
      status: row.status,
      goodsCount: Number(row.goodsCount),
      updatedAt: row.updatedAt,
      ip: {
        id: row.ipId,
        slug: row.ipSlug,
        name: row.ipName,
      },
    })) satisfies AdminCharacterListItem[];

    const seriesList = seriesRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      seriesType: row.seriesType,
      releaseDate: row.releaseDate,
      status: row.status,
      goodsCount: Number(row.goodsCount),
      updatedAt: row.updatedAt,
      ip: {
        id: row.ipId,
        slug: row.ipSlug,
        name: row.ipName,
      },
    })) satisfies AdminSeriesListItem[];

    const fallbackSelectedId =
      filters.entity === 'ip'
        ? (ipList[0]?.id ?? null)
        : filters.entity === 'character'
          ? (characterList[0]?.id ?? null)
          : (seriesList[0]?.id ?? null);
    const resolvedSelectedId = resolveSelectedRecordId(filters, fallbackSelectedId);

    const [selectedIp, selectedCharacter, selectedSeries] = await Promise.all([
      filters.entity === 'ip' && resolvedSelectedId
        ? getIpEditableRecord(resolvedSelectedId)
        : Promise.resolve(null),
      filters.entity === 'character' && resolvedSelectedId
        ? getCharacterEditableRecord(resolvedSelectedId)
        : Promise.resolve(null),
      filters.entity === 'series' && resolvedSelectedId
        ? getSeriesEditableRecord(resolvedSelectedId)
        : Promise.resolve(null),
    ]);

      return {
        mode: 'live',
        statusNote: '保存后会同步更新 IP、角色与系列图鉴内容。',
      entity: filters.entity,
      filters: buildFilters(filters),
      editorMode:
        filters.mode === 'create' ||
        (filters.entity === 'ip' && !selectedIp) ||
        (filters.entity === 'character' && !selectedCharacter) ||
        (filters.entity === 'series' && !selectedSeries)
          ? 'create'
          : 'edit',
      stats: {
        totalIps: Number(ipStatsRows[0]?.total ?? 0),
        totalCharacters: Number(characterStatsRows[0]?.total ?? 0),
        totalSeries: Number(seriesStatsRows[0]?.total ?? 0),
        publishedIps: Number(ipStatsRows[0]?.published ?? 0),
        publishedCharacters: Number(characterStatsRows[0]?.published ?? 0),
        publishedSeries: Number(seriesStatsRows[0]?.published ?? 0),
      },
      ipOptions: ipOptionRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
      })),
      lists: {
        ips: ipList,
        characters: characterList,
        series: seriesList,
      },
      selected: {
        ip: selectedIp,
        character: selectedCharacter,
        series: selectedSeries,
      },
    } satisfies AdminCatalogPageData;
  } catch {
    return createFallbackPageData(filters);
  }
}
