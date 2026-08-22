import 'server-only';

import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  goods,
  goodsImages,
  goodsTags,
  ips,
  series,
  tags,
} from '@/drizzle/schema';
import {
  type AdminGoodsManagementFilters,
  type AdminGoodsPublicationStatus,
} from '@/lib/admin-goods';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { getDb, isDatabaseAccessConfigurationError } from '@/server/db/client';

const GOODS_LIST_LIMIT = 48;
const TAG_LIBRARY_LIMIT = 96;

export const adminGoodsManagementQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  seriesId: z.string().uuid().optional(),
  goodsId: z.string().uuid().optional(),
  mode: z.enum(['create']).optional(),
});

export type AdminGoodsManagementQueryParams = z.output<
  typeof adminGoodsManagementQuerySchema
>;

export type AdminGoodsListItem = {
  id: string;
  skuCode: string;
  slug: string;
  name: string;
  goodsType: string;
  status: AdminGoodsPublicationStatus;
  releaseDate: Date | null;
  updatedAt: Date;
  series: {
    id: string;
    name: string;
    slug: string;
    seriesType: string;
  };
  ip: {
    id: string;
    name: string;
    slug: string;
  };
  imageCount: number;
  tagCount: number;
  primaryImageUrl: string | null;
  tagNames: string[];
};

export type AdminGoodsSeriesOption = {
  id: string;
  name: string;
  slug: string;
  seriesType: string;
  status: AdminGoodsPublicationStatus;
  ip: {
    id: string;
    name: string;
    slug: string;
  };
};

export type AdminGoodsTagLibraryItem = {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
};

export type AdminGoodsEditableRecord = {
  id: string;
  seriesId: string;
  skuCode: string;
  slug: string;
  name: string;
  description: string | null;
  goodsType: string;
  material: string | null;
  sizeLabel: string | null;
  edition: string | null;
  releaseDate: Date | null;
  msrpAmount: string | null;
  currencyCode: string | null;
  manufacturer: string | null;
  region: string | null;
  officialType:
    | 'official'
    | 'official_bonus'
    | 'official_limited'
    | 'licensed'
    | 'doujin'
    | 'self_made'
    | 'unknown';
  verificationStatus: 'verified' | 'unverified';
  metadata: Record<string, unknown> | null;
  status: AdminGoodsPublicationStatus;
  series: {
    id: string;
    name: string;
    slug: string;
    seriesType: string;
  };
  ip: {
    id: string;
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: string;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
};

export type AdminGoodsManagementPageData = {
  mode: 'live' | 'fallback';
  statusNote: string;
  filters: AdminGoodsManagementFilters;
  editorMode: 'create' | 'edit';
  stats: {
    totalGoods: number;
    publishedGoods: number;
    draftGoods: number;
    archivedGoods: number;
    goodsWithoutTags: number;
    goodsWithoutImages: number;
  };
  goodsList: AdminGoodsListItem[];
  seriesOptions: AdminGoodsSeriesOption[];
  tagLibrary: AdminGoodsTagLibraryItem[];
  selectedGoods: AdminGoodsEditableRecord | null;
};

type AdminGoodsSearchParams = Record<string, string | string[] | undefined>;

type AdminGoodsListImageRow = {
  goodsId: string;
  imageUrl: string;
};

type AdminGoodsListTagRow = {
  goodsId: string;
  name: string;
};

function buildAdminGoodsManagementFilters(
  filters: AdminGoodsManagementQueryParams,
): AdminGoodsManagementFilters {
  return {
    query: filters.query,
    status: filters.status,
    seriesId: filters.seriesId,
  };
}

function buildImageSummaryByGoodsId(rows: AdminGoodsListImageRow[]) {
  const summaryByGoodsId = new Map<
    string,
    {
      count: number;
      primaryImageUrl: string | null;
    }
  >();

  for (const row of rows) {
    const existing = summaryByGoodsId.get(row.goodsId);

    if (existing) {
      existing.count += 1;

      if (!existing.primaryImageUrl) {
        existing.primaryImageUrl = row.imageUrl;
      }

      continue;
    }

    summaryByGoodsId.set(row.goodsId, {
      count: 1,
      primaryImageUrl: row.imageUrl,
    });
  }

  return summaryByGoodsId;
}

function buildTagNamesByGoodsId(rows: AdminGoodsListTagRow[]) {
  const tagNamesByGoodsId = new Map<string, string[]>();

  for (const row of rows) {
    const existing = tagNamesByGoodsId.get(row.goodsId) ?? [];
    existing.push(row.name);
    tagNamesByGoodsId.set(row.goodsId, existing);
  }

  return tagNamesByGoodsId;
}

function resolveSelectedGoodsId(
  filters: AdminGoodsManagementQueryParams,
  goodsIds: string[],
) {
  if (filters.mode === 'create') {
    return null;
  }

  return filters.goodsId ?? goodsIds[0] ?? null;
}

export function parseAdminGoodsManagementSearchParams(
  searchParams: AdminGoodsSearchParams,
) {
  return adminGoodsManagementQuerySchema.parse({
    query: getSingleSearchParamValue(searchParams.query),
    status: getSingleSearchParamValue(searchParams.status),
    seriesId: getSingleSearchParamValue(searchParams.seriesId),
    goodsId: getSingleSearchParamValue(searchParams.goodsId),
    mode: getSingleSearchParamValue(searchParams.mode),
  });
}

function createFallbackPageData(
  filters: AdminGoodsManagementQueryParams,
): AdminGoodsManagementPageData {
  return {
    mode: 'fallback',
    statusNote: '当前商品数据暂时不可用，请稍后再试。',
    filters: buildAdminGoodsManagementFilters(filters),
    editorMode: 'create',
    stats: {
      totalGoods: 0,
      publishedGoods: 0,
      draftGoods: 0,
      archivedGoods: 0,
      goodsWithoutTags: 0,
      goodsWithoutImages: 0,
    },
    goodsList: [],
    seriesOptions: [],
    tagLibrary: [],
    selectedGoods: null,
  };
}

export async function getAdminGoodsManagementPageData(
  input?: z.input<typeof adminGoodsManagementQuerySchema>,
) {
  const filters = adminGoodsManagementQuerySchema.parse(input ?? {});

  try {
    const db = getDb();
    const queryPattern =
      filters.query && filters.query.length > 0 ? `%${filters.query}%` : null;
    const goodsWhereClause = and(
      filters.status ? eq(goods.status, filters.status) : undefined,
      filters.seriesId ? eq(goods.seriesId, filters.seriesId) : undefined,
      queryPattern
        ? or(
            ilike(goods.name, queryPattern),
            ilike(goods.skuCode, queryPattern),
            ilike(goods.slug, queryPattern),
            ilike(goods.description, queryPattern),
            ilike(series.name, queryPattern),
            ilike(ips.name, queryPattern),
          )
        : undefined,
    );
    const tagUsageCountSql = sql<number>`count(distinct ${goodsTags.goodsId})`;

    const [statsRows, seriesRows, tagRows, baseGoodsRows] = await Promise.all([
      db
        .select({
          totalGoods: sql<number>`count(distinct ${goods.id})`,
          publishedGoods: sql<number>`count(distinct case when ${goods.status} = 'published' then ${goods.id} end)`,
          draftGoods: sql<number>`count(distinct case when ${goods.status} = 'draft' then ${goods.id} end)`,
          archivedGoods: sql<number>`count(distinct case when ${goods.status} = 'archived' then ${goods.id} end)`,
          goodsWithoutTags: sql<number>`count(distinct case when ${goodsTags.goodsId} is null then ${goods.id} end)`,
          goodsWithoutImages: sql<number>`count(distinct case when ${goodsImages.id} is null then ${goods.id} end)`,
        })
        .from(goods)
        .leftJoin(goodsTags, eq(goodsTags.goodsId, goods.id))
        .leftJoin(goodsImages, eq(goodsImages.goodsId, goods.id)),
      db
        .select({
          id: series.id,
          name: series.name,
          slug: series.slug,
          seriesType: series.seriesType,
          status: series.status,
          ipId: ips.id,
          ipName: ips.name,
          ipSlug: ips.slug,
        })
        .from(series)
        .innerJoin(ips, eq(series.ipId, ips.id))
        .orderBy(asc(ips.name), desc(series.releaseDate), asc(series.name)),
      db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          usageCount: tagUsageCountSql,
        })
        .from(tags)
        .leftJoin(goodsTags, eq(goodsTags.tagId, tags.id))
        .groupBy(tags.id)
        .orderBy(desc(tagUsageCountSql), asc(tags.name))
        .limit(TAG_LIBRARY_LIMIT),
      db
        .select({
          id: goods.id,
          skuCode: goods.skuCode,
          slug: goods.slug,
          name: goods.name,
          goodsType: goods.goodsType,
          status: goods.status,
          releaseDate: goods.releaseDate,
          updatedAt: goods.updatedAt,
          seriesId: series.id,
          seriesName: series.name,
          seriesSlug: series.slug,
          seriesType: series.seriesType,
          ipId: ips.id,
          ipName: ips.name,
          ipSlug: ips.slug,
        })
        .from(goods)
        .innerJoin(series, eq(goods.seriesId, series.id))
        .innerJoin(ips, eq(series.ipId, ips.id))
        .where(goodsWhereClause)
        .orderBy(
          desc(goods.updatedAt),
          desc(goods.releaseDate),
          asc(goods.name),
        )
        .limit(GOODS_LIST_LIMIT),
    ]);

    const goodsIds = baseGoodsRows.map((row) => row.id);
    const [listImageRows, listTagRows] =
      goodsIds.length > 0
        ? await Promise.all([
            db
              .select({
                goodsId: goodsImages.goodsId,
                imageUrl: goodsImages.imageUrl,
                sortOrder: goodsImages.sortOrder,
                isPrimary: goodsImages.isPrimary,
              })
              .from(goodsImages)
              .where(inArray(goodsImages.goodsId, goodsIds))
              .orderBy(
                asc(goodsImages.goodsId),
                desc(goodsImages.isPrimary),
                asc(goodsImages.sortOrder),
                asc(goodsImages.createdAt),
              ),
            db
              .select({
                goodsId: goodsTags.goodsId,
                name: tags.name,
              })
              .from(goodsTags)
              .innerJoin(tags, eq(goodsTags.tagId, tags.id))
              .where(inArray(goodsTags.goodsId, goodsIds))
              .orderBy(asc(goodsTags.goodsId), asc(tags.name)),
          ])
        : [[], []];

    const imageSummaryByGoodsId = buildImageSummaryByGoodsId(listImageRows);
    const tagNamesByGoodsId = buildTagNamesByGoodsId(listTagRows);
    const resolvedSelectedGoodsId = resolveSelectedGoodsId(filters, goodsIds);

    const selectedGoods =
      resolvedSelectedGoodsId === null
        ? null
        : await getAdminGoodsEditableRecord(resolvedSelectedGoodsId);
    const fallbackSelectedGoods =
      !selectedGoods &&
      filters.mode !== 'create' &&
      goodsIds.length > 0 &&
      goodsIds[0] !== resolvedSelectedGoodsId
        ? await getAdminGoodsEditableRecord(goodsIds[0])
        : null;
    const activeSelectedGoods = selectedGoods ?? fallbackSelectedGoods;

    const stats = statsRows[0];

    return {
      mode: 'live',
      statusNote: '保存后会同步更新商品图鉴、标签与图片内容。',
      filters: buildAdminGoodsManagementFilters(filters),
      editorMode:
        filters.mode === 'create' || !activeSelectedGoods ? 'create' : 'edit',
      stats: {
        totalGoods: Number(stats?.totalGoods ?? 0),
        publishedGoods: Number(stats?.publishedGoods ?? 0),
        draftGoods: Number(stats?.draftGoods ?? 0),
        archivedGoods: Number(stats?.archivedGoods ?? 0),
        goodsWithoutTags: Number(stats?.goodsWithoutTags ?? 0),
        goodsWithoutImages: Number(stats?.goodsWithoutImages ?? 0),
      },
      goodsList: baseGoodsRows.map((row) => {
        const imageSummary = imageSummaryByGoodsId.get(row.id);
        const tagNames = tagNamesByGoodsId.get(row.id) ?? [];

        return {
          id: row.id,
          skuCode: row.skuCode,
          slug: row.slug,
          name: row.name,
          goodsType: row.goodsType,
          status: row.status,
          releaseDate: row.releaseDate,
          updatedAt: row.updatedAt,
          series: {
            id: row.seriesId,
            name: row.seriesName,
            slug: row.seriesSlug,
            seriesType: row.seriesType,
          },
          ip: {
            id: row.ipId,
            name: row.ipName,
            slug: row.ipSlug,
          },
          imageCount: imageSummary?.count ?? 0,
          tagCount: tagNames.length,
          primaryImageUrl: imageSummary?.primaryImageUrl ?? null,
          tagNames: tagNames.slice(0, 4),
        } satisfies AdminGoodsListItem;
      }),
      seriesOptions: seriesRows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        seriesType: row.seriesType,
        status: row.status,
        ip: {
          id: row.ipId,
          name: row.ipName,
          slug: row.ipSlug,
        },
      })),
      tagLibrary: tagRows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        usageCount: Number(row.usageCount),
      })),
      selectedGoods: activeSelectedGoods,
    } satisfies AdminGoodsManagementPageData;
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      throw error;
    }

    return createFallbackPageData(filters);
  }
}

async function getAdminGoodsEditableRecord(goodsId: string) {
  const db = getDb();
  const detailRows = await db
    .select({
      id: goods.id,
      seriesId: goods.seriesId,
      skuCode: goods.skuCode,
      slug: goods.slug,
      name: goods.name,
      description: goods.description,
      goodsType: goods.goodsType,
      material: goods.material,
      sizeLabel: goods.sizeLabel,
      edition: goods.edition,
      releaseDate: goods.releaseDate,
      msrpAmount: goods.msrpAmount,
      currencyCode: goods.currencyCode,
      manufacturer: goods.manufacturer,
      region: goods.region,
      officialType: goods.officialType,
      verificationStatus: goods.verificationStatus,
      metadata: goods.metadata,
      status: goods.status,
      seriesName: series.name,
      seriesSlug: series.slug,
      seriesType: series.seriesType,
      ipId: ips.id,
      ipName: ips.name,
      ipSlug: ips.slug,
    })
    .from(goods)
    .innerJoin(series, eq(goods.seriesId, series.id))
    .innerJoin(ips, eq(series.ipId, ips.id))
    .where(eq(goods.id, goodsId))
    .limit(1);

  const detail = detailRows[0];

  if (!detail) {
    return null;
  }

  const [tagRows, imageRows] = await Promise.all([
    db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(goodsTags)
      .innerJoin(tags, eq(goodsTags.tagId, tags.id))
      .where(eq(goodsTags.goodsId, detail.id))
      .orderBy(asc(tags.name)),
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
      .orderBy(asc(goodsImages.sortOrder), desc(goodsImages.isPrimary)),
  ]);

  return {
    id: detail.id,
    seriesId: detail.seriesId,
    skuCode: detail.skuCode,
    slug: detail.slug,
    name: detail.name,
    description: detail.description,
    goodsType: detail.goodsType,
    material: detail.material,
    sizeLabel: detail.sizeLabel,
    edition: detail.edition,
    releaseDate: detail.releaseDate,
    msrpAmount: detail.msrpAmount,
    currencyCode: detail.currencyCode,
    manufacturer: detail.manufacturer,
    region: detail.region,
    officialType: detail.officialType,
    verificationStatus: detail.verificationStatus,
    metadata: detail.metadata ?? null,
    status: detail.status,
    series: {
      id: detail.seriesId,
      name: detail.seriesName,
      slug: detail.seriesSlug,
      seriesType: detail.seriesType,
    },
    ip: {
      id: detail.ipId,
      name: detail.ipName,
      slug: detail.ipSlug,
    },
    tags: tagRows,
    images: imageRows,
  } satisfies AdminGoodsEditableRecord;
}
