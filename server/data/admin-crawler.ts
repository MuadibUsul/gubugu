import 'server-only';

import { asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  crawlerDrafts,
  crawlerRuns,
  crawlerSources,
  goodsTags,
  ips,
  series,
  tags,
} from '@/drizzle/schema';
import type {
  AdminGoodsEditableRecord,
  AdminGoodsSeriesOption,
  AdminGoodsTagLibraryItem,
} from '@/server/data/admin-goods';
import { getDb } from '@/server/db/client';

const crawlerViewSchema = z.enum(['sources', 'drafts', 'runs']);

export type AdminCrawlerPageData = {
  view: z.infer<typeof crawlerViewSchema>;
  stats: {
    enabledSources: number;
    pendingDrafts: number;
    publishedDrafts: number;
    failedRuns: number;
  };
  sources: Array<{
    id: string;
    name: string;
    entryUrl: string;
    detailPathPattern: string | null;
    allowedImageHosts: string[];
    enabled: boolean;
    lastScannedAt: Date | null;
    lastSucceededAt: Date | null;
    lastError: string | null;
    pendingDraftCount: number;
  }>;
  drafts: Array<{
    id: string;
    title: string;
    sourceUrl: string;
    status: 'pending' | 'published' | 'rejected';
    sourceName: string;
    primaryImageUrl: string | null;
    skuCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  runs: Array<{
    id: string;
    sourceName: string;
    trigger: 'scheduled' | 'manual';
    status: 'running' | 'succeeded' | 'failed';
    discoveredCount: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    error: string | null;
    startedAt: Date;
    finishedAt: Date | null;
  }>;
};

export type CrawlerDraftReviewData = {
  draft: {
    id: string;
    title: string;
    sourceUrl: string;
    sourceName: string;
    createdAt: Date;
    payload: Record<string, unknown>;
    reviewNote: string | null;
  };
  initialGoods: AdminGoodsEditableRecord;
  seriesOptions: AdminGoodsSeriesOption[];
  tagLibrary: AdminGoodsTagLibraryItem[];
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function payloadSummary(payload: Record<string, unknown>) {
  const goods = record(payload.goods);
  const images = Array.isArray(payload.images) ? payload.images : [];
  const primaryImage = record(images[0]);

  return {
    skuCode: stringValue(goods.skuCode),
    primaryImageUrl: stringValue(primaryImage.imageUrl),
  };
}

export async function getAdminCrawlerPageData(input?: {
  view?: string;
}): Promise<AdminCrawlerPageData> {
  const view = crawlerViewSchema.catch('sources').parse(input?.view);
  const db = getDb();
  const pendingDraftCount = sql<number>`count(${crawlerDrafts.id}) filter (where ${crawlerDrafts.status} = 'pending')`;

  const [statsRows, sourceRows, draftRows, runRows] = await Promise.all([
    db
      .select({
        enabledSources: sql<number>`count(*) filter (where ${crawlerSources.enabled})`,
        pendingDrafts: sql<number>`(select count(*) from ${crawlerDrafts} where ${crawlerDrafts.status} = 'pending')`,
        publishedDrafts: sql<number>`(select count(*) from ${crawlerDrafts} where ${crawlerDrafts.status} = 'published')`,
        failedRuns: sql<number>`(select count(*) from ${crawlerRuns} where ${crawlerRuns.status} = 'failed')`,
      })
      .from(crawlerSources),
    db
      .select({
        id: crawlerSources.id,
        name: crawlerSources.name,
        entryUrl: crawlerSources.entryUrl,
        detailPathPattern: crawlerSources.detailPathPattern,
        allowedImageHosts: crawlerSources.allowedImageHosts,
        enabled: crawlerSources.enabled,
        lastScannedAt: crawlerSources.lastScannedAt,
        lastSucceededAt: crawlerSources.lastSucceededAt,
        lastError: crawlerSources.lastError,
        pendingDraftCount,
      })
      .from(crawlerSources)
      .leftJoin(crawlerDrafts, eq(crawlerDrafts.sourceId, crawlerSources.id))
      .groupBy(crawlerSources.id)
      .orderBy(desc(crawlerSources.enabled), asc(crawlerSources.name)),
    db
      .select({
        id: crawlerDrafts.id,
        title: crawlerDrafts.title,
        sourceUrl: crawlerDrafts.sourceUrl,
        status: crawlerDrafts.status,
        payload: crawlerDrafts.payload,
        sourceName: crawlerSources.name,
        createdAt: crawlerDrafts.createdAt,
        updatedAt: crawlerDrafts.updatedAt,
      })
      .from(crawlerDrafts)
      .innerJoin(crawlerSources, eq(crawlerDrafts.sourceId, crawlerSources.id))
      .orderBy(
        sql`case when ${crawlerDrafts.status} = 'pending' then 0 else 1 end`,
        desc(crawlerDrafts.updatedAt),
      )
      .limit(80),
    db
      .select({
        id: crawlerRuns.id,
        sourceName: crawlerSources.name,
        trigger: crawlerRuns.trigger,
        status: crawlerRuns.status,
        discoveredCount: crawlerRuns.discoveredCount,
        createdCount: crawlerRuns.createdCount,
        updatedCount: crawlerRuns.updatedCount,
        skippedCount: crawlerRuns.skippedCount,
        failedCount: crawlerRuns.failedCount,
        error: crawlerRuns.error,
        startedAt: crawlerRuns.startedAt,
        finishedAt: crawlerRuns.finishedAt,
      })
      .from(crawlerRuns)
      .innerJoin(crawlerSources, eq(crawlerRuns.sourceId, crawlerSources.id))
      .orderBy(desc(crawlerRuns.startedAt))
      .limit(80),
  ]);

  const stats = statsRows[0];

  return {
    view,
    stats: {
      enabledSources: Number(stats?.enabledSources ?? 0),
      pendingDrafts: Number(stats?.pendingDrafts ?? 0),
      publishedDrafts: Number(stats?.publishedDrafts ?? 0),
      failedRuns: Number(stats?.failedRuns ?? 0),
    },
    sources: sourceRows.map((row) => ({
      ...row,
      pendingDraftCount: Number(row.pendingDraftCount),
    })),
    drafts: draftRows.map(({ payload, ...row }) => ({
      ...row,
      ...payloadSummary(payload),
    })),
    runs: runRows,
  };
}

async function getGoodsEditorLibraries() {
  const db = getDb();
  const usageCount = sql<number>`count(distinct ${goodsTags.goodsId})`;
  const [seriesRows, tagRows] = await Promise.all([
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
      .orderBy(asc(ips.name), asc(series.name)),
    db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        usageCount,
      })
      .from(tags)
      .leftJoin(goodsTags, eq(goodsTags.tagId, tags.id))
      .groupBy(tags.id)
      .orderBy(desc(usageCount), asc(tags.name))
      .limit(96),
  ]);

  return {
    seriesOptions: seriesRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      seriesType: row.seriesType,
      status: row.status,
      ip: { id: row.ipId, name: row.ipName, slug: row.ipSlug },
    })) satisfies AdminGoodsSeriesOption[],
    tagLibrary: tagRows.map((row) => ({
      ...row,
      usageCount: Number(row.usageCount),
    })) satisfies AdminGoodsTagLibraryItem[],
  };
}

export async function getCrawlerDraftReviewData(
  draftId: string,
): Promise<CrawlerDraftReviewData | null> {
  const parsedId = z.string().uuid().safeParse(draftId);

  if (!parsedId.success) return null;

  const db = getDb();
  const [draftRows, libraries] = await Promise.all([
    db
      .select({
        id: crawlerDrafts.id,
        title: crawlerDrafts.title,
        sourceUrl: crawlerDrafts.sourceUrl,
        sourceName: crawlerSources.name,
        status: crawlerDrafts.status,
        payload: crawlerDrafts.payload,
        reviewNote: crawlerDrafts.reviewNote,
        createdAt: crawlerDrafts.createdAt,
      })
      .from(crawlerDrafts)
      .innerJoin(crawlerSources, eq(crawlerDrafts.sourceId, crawlerSources.id))
      .where(eq(crawlerDrafts.id, parsedId.data))
      .limit(1),
    getGoodsEditorLibraries(),
  ]);
  const draft = draftRows[0];

  if (!draft || draft.status !== 'pending') return null;

  const payload = draft.payload;
  const goods = record(payload.goods);
  const payloadTags = Array.isArray(payload.tags) ? payload.tags : [];
  const payloadImages = Array.isArray(payload.images) ? payload.images : [];
  const releaseDateText = stringValue(goods.releaseDate);
  const releaseDate = releaseDateText
    ? new Date(`${releaseDateText}T00:00:00.000Z`)
    : null;

  const initialGoods: AdminGoodsEditableRecord = {
    id: '',
    seriesId: '',
    skuCode: stringValue(goods.skuCode) ?? '',
    slug: stringValue(goods.slug) ?? '',
    name: stringValue(goods.name) ?? draft.title,
    description: stringValue(goods.description),
    goodsType: stringValue(goods.goodsType) ?? 'other',
    material: stringValue(goods.material),
    sizeLabel: stringValue(goods.sizeLabel),
    edition: stringValue(goods.edition),
    releaseDate:
      releaseDate && !Number.isNaN(releaseDate.getTime()) ? releaseDate : null,
    msrpAmount: stringValue(goods.msrpAmount),
    currencyCode: stringValue(goods.currencyCode),
    manufacturer: stringValue(goods.manufacturer),
    region: stringValue(goods.region),
    officialType: 'unknown',
    verificationStatus: 'unverified',
    metadata: record(goods.metadata),
    status: 'published',
    series: {
      id: '',
      name: '待选择系列',
      slug: '',
      seriesType: '',
    },
    ip: { id: '', name: '待选择 IP', slug: '' },
    tags: payloadTags.flatMap((value, index) => {
      const item = record(value);
      const name = stringValue(item.name);
      const slug = stringValue(item.slug);
      return name && slug ? [{ id: `draft-tag-${index}`, name, slug }] : [];
    }),
    images: payloadImages.flatMap((value, index) => {
      const item = record(value);
      const imageUrl = stringValue(item.imageUrl);
      return imageUrl
        ? [
            {
              id: '',
              imageUrl,
              altText: stringValue(item.altText),
              sortOrder: index,
              isPrimary: index === 0,
            },
          ]
        : [];
    }),
  };

  return {
    draft: {
      id: draft.id,
      title: draft.title,
      sourceUrl: draft.sourceUrl,
      sourceName: draft.sourceName,
      createdAt: draft.createdAt,
      payload,
      reviewNote: draft.reviewNote,
    },
    initialGoods,
    ...libraries,
  };
}
