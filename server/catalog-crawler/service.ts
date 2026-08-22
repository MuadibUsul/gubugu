import 'server-only';

import { createHash } from 'node:crypto';

import { and, eq, lt } from 'drizzle-orm';

import {
  crawlerDrafts,
  crawlerRuns,
  crawlerSources,
  type CrawlerSource,
} from '@/drizzle/schema';
import {
  parseCatalogPage,
  type ParsedCatalogProduct,
} from '@/lib/catalog-crawler/parser';
import { slugifyText } from '@/lib/slug';
import { normalizeAndStoreCatalogImage } from '@/server/catalog-crawler/image-store';
import {
  safeFetchBuffer,
  safeFetchText,
} from '@/server/catalog-crawler/safe-fetch';
import { getDb } from '@/server/db/client';

const MAX_DETAIL_PAGES = 24;
const MAX_IMAGES_PER_DRAFT = 4;
const STALE_RUN_AFTER_MS = 30 * 60 * 1000;

export type CrawlerRunOptions = {
  trigger: 'scheduled' | 'manual';
  scheduledFor: Date | null;
};

type DraftPayload = {
  version: 1;
  source: {
    sourceName: string;
    url: string;
    fetchedAt: string;
  };
  goods: {
    skuCode: string;
    slug: string;
    name: string;
    description: string | null;
    goodsType: string;
    material: string | null;
    sizeLabel: string | null;
    edition: string | null;
    releaseDate: string | null;
    msrpAmount: string | null;
    currencyCode: string | null;
    manufacturer: string | null;
    metadata: Record<string, unknown>;
  };
  images: Array<{
    sourceUrl: string;
    imageUrl: string;
    altText: string;
    sortOrder: number;
  }>;
  tags: Array<{ name: string; slug: string }>;
};

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

function trimText(value: string | null, maxLength: number) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function inferGoodsType(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? '';
  const mappings: Array<[RegExp, string]> = [
    [
      /acrylic.*(?:stand|figure)|亚克力.*(?:立牌|台座)|アクリルスタンド/,
      'acrylic-stand',
    ],
    [
      /acrylic.*(?:charm|key)|亚克力.*(?:挂件|钥匙)|アクリルキーホルダー/,
      'acrylic-charm',
    ],
    [/(?:can|tin).*badge|徽章|缶バッジ/, 'can-badge'],
    [/shikishi|色纸|色紙/, 'mini-shikishi'],
    [/clear.*card|透卡|クリアカード/, 'clear-card'],
    [/trading.*card|收藏卡|トレーディングカード/, 'trading-card'],
    [/plush|玩偶|毛绒|ぬいぐるみ/, 'plush'],
    [/tapestry|挂画|タペストリー/, 'tapestry'],
    [/poster|海报|ポスター/, 'poster'],
  ];

  return mappings.find(([pattern]) => pattern.test(normalized))?.[1] ?? 'other';
}

function sourceKeyFor(product: ParsedCatalogProduct) {
  return sha256(product.externalId ?? product.skuCode ?? product.sourceUrl);
}

function buildProductSnapshot(product: ParsedCatalogProduct) {
  return {
    sourceUrl: product.sourceUrl,
    externalId: trimText(product.externalId, 255),
    skuCode: trimText(product.skuCode, 128),
    name: trimText(product.name, 255),
    description: trimText(product.description, 4000),
    goodsType: trimText(product.goodsType, 128),
    material: trimText(product.material, 128),
    sizeLabel: trimText(product.sizeLabel, 128),
    edition: trimText(product.edition, 128),
    releaseDate: product.releaseDate,
    msrpAmount: product.msrpAmount,
    currencyCode: product.currencyCode,
    manufacturer: trimText(product.manufacturer, 128),
    imageUrls: product.imageUrls.slice(0, MAX_IMAGES_PER_DRAFT),
  };
}

function contentHashFor(product: ParsedCatalogProduct) {
  return sha256(JSON.stringify(buildProductSnapshot(product)));
}

function isUniqueConflict(error: unknown, indexName: string) {
  return (
    error instanceof Error &&
    (error.message.includes(indexName) ||
      (error as Error & { cause?: { code?: string } }).cause?.code === '23505')
  );
}

async function loadProducts(source: CrawlerSource) {
  const sourceHost = new URL(source.entryUrl).hostname;
  const entry = await safeFetchText(source.entryUrl, {
    allowedHosts: [sourceHost],
  });
  const entryPage = parseCatalogPage(entry.text, entry.url, {
    detailPathPattern: source.detailPathPattern,
  });
  const products = [...entryPage.products];
  let failedPages = 0;

  for (const detailUrl of entryPage.detailUrls.slice(0, MAX_DETAIL_PAGES)) {
    if (detailUrl === entry.url) continue;

    try {
      const detail = await safeFetchText(detailUrl, {
        allowedHosts: [sourceHost],
      });
      products.push(...parseCatalogPage(detail.text, detail.url).products);
    } catch {
      failedPages += 1;
    }
  }

  const unique = new Map<string, ParsedCatalogProduct>();
  for (const product of products) {
    unique.set(sourceKeyFor(product), product);
  }

  return { products: [...unique.values()], failedPages };
}

async function buildDraftPayload(
  source: CrawlerSource,
  product: ParsedCatalogProduct,
  fetchedAt: Date,
): Promise<DraftPayload> {
  const sourceKey = sourceKeyFor(product);
  const fallbackCode = `CRAWL-${sourceKey.slice(0, 12).toUpperCase()}`;
  const skuCode = trimText(product.skuCode, 128) ?? fallbackCode;
  const name = trimText(product.name, 255) ?? fallbackCode;
  const slug =
    slugifyText(`${skuCode}-${name}`) || `crawl-${sourceKey.slice(0, 16)}`;
  const allowedImageHosts = Array.from(
    new Set([new URL(source.entryUrl).hostname, ...source.allowedImageHosts]),
  );
  const images: DraftPayload['images'] = [];

  for (const imageUrl of product.imageUrls.slice(0, MAX_IMAGES_PER_DRAFT)) {
    try {
      const response = await safeFetchBuffer(imageUrl, {
        allowedHosts: allowedImageHosts,
      });
      const stored = await normalizeAndStoreCatalogImage(response.buffer, {
        appUrl:
          process.env.APP_URL ??
          process.env.NEXT_PUBLIC_APP_URL ??
          'http://127.0.0.1:3000',
        directory: process.env.CATALOG_ASSET_DIR,
      });
      images.push({
        sourceUrl: response.url,
        imageUrl: stored.imageUrl,
        altText: `${name} 官图 ${images.length + 1}`,
        sortOrder: images.length,
      });
    } catch {
      // A broken or disallowed image must not discard otherwise useful SKU data.
    }
  }

  return {
    version: 1,
    source: {
      sourceName: source.name,
      url: product.sourceUrl,
      fetchedAt: fetchedAt.toISOString(),
    },
    goods: {
      skuCode,
      slug: slug.slice(0, 160),
      name,
      description: trimText(product.description, 4000),
      goodsType: inferGoodsType(product.goodsType),
      material: trimText(product.material, 128),
      sizeLabel: trimText(product.sizeLabel, 128),
      edition: trimText(product.edition, 128),
      releaseDate: product.releaseDate,
      msrpAmount: product.msrpAmount,
      currencyCode: product.currencyCode,
      manufacturer: trimText(product.manufacturer, 128),
      metadata: {
        crawler: {
          sourceName: source.name,
          sourceUrl: product.sourceUrl,
          externalId: trimText(product.externalId, 255),
          fetchedAt: fetchedAt.toISOString(),
          manufacturer: trimText(product.manufacturer, 128),
        },
      },
    },
    images,
    tags: [],
  };
}

async function claimRun(sourceId: string, options: CrawlerRunOptions) {
  const db = getDb();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_RUN_AFTER_MS);

  await db
    .update(crawlerRuns)
    .set({
      status: 'failed',
      error: '扫描进程超过 30 分钟未结束，已由后续任务接管。',
      failedCount: 1,
      finishedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(crawlerRuns.sourceId, sourceId),
        eq(crawlerRuns.status, 'running'),
        lt(crawlerRuns.startedAt, staleBefore),
      ),
    );

  const runId = crypto.randomUUID();

  try {
    await db.insert(crawlerRuns).values({
      id: runId,
      sourceId,
      trigger: options.trigger,
      scheduledFor: options.scheduledFor,
    });
    return runId;
  } catch (error) {
    if (
      isUniqueConflict(error, 'crawler_runs_scheduled_slot_unique') ||
      isUniqueConflict(error, 'crawler_runs_source_running_unique')
    ) {
      return null;
    }
    throw error;
  }
}

export async function runCrawlerSourceById(
  sourceId: string,
  options: CrawlerRunOptions,
) {
  const db = getDb();
  const sourceRows = await db
    .select()
    .from(crawlerSources)
    .where(eq(crawlerSources.id, sourceId))
    .limit(1);
  const source = sourceRows[0];

  if (!source) return { status: 'missing' as const };

  const runId = await claimRun(source.id, options);
  if (!runId) return { status: 'skipped' as const };

  const startedAt = new Date();
  await db
    .update(crawlerSources)
    .set({ lastScannedAt: startedAt, updatedAt: startedAt })
    .where(eq(crawlerSources.id, source.id));

  let discoveredCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    const loaded = await loadProducts(source);
    failedCount += loaded.failedPages;
    discoveredCount = loaded.products.length;

    if (discoveredCount === 0) {
      throw new Error(
        '页面中没有可识别的 Product 结构化数据；该站点可能需要专用适配器。',
      );
    }

    for (const product of loaded.products) {
      const sourceKey = sourceKeyFor(product);
      const contentHash = contentHashFor(product);
      const existingRows = await db
        .select({
          id: crawlerDrafts.id,
          contentHash: crawlerDrafts.contentHash,
          status: crawlerDrafts.status,
        })
        .from(crawlerDrafts)
        .where(
          and(
            eq(crawlerDrafts.sourceId, source.id),
            eq(crawlerDrafts.sourceKey, sourceKey),
          ),
        )
        .limit(1);
      const existing = existingRows[0];

      if (
        existing &&
        (existing.status !== 'pending' || existing.contentHash === contentHash)
      ) {
        skippedCount += 1;
        continue;
      }

      try {
        const now = new Date();
        const payload = await buildDraftPayload(source, product, now);
        const values = {
          sourceUrl: product.sourceUrl,
          contentHash,
          title: payload.goods.name,
          payload,
          updatedAt: now,
        };

        if (existing) {
          await db
            .update(crawlerDrafts)
            .set(values)
            .where(
              and(
                eq(crawlerDrafts.id, existing.id),
                eq(crawlerDrafts.status, 'pending'),
              ),
            );
          updatedCount += 1;
        } else {
          await db.insert(crawlerDrafts).values({
            id: crypto.randomUUID(),
            sourceId: source.id,
            sourceKey,
            ...values,
          });
          createdCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    const finishedAt = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(crawlerRuns)
        .set({
          status: 'succeeded',
          discoveredCount,
          createdCount,
          updatedCount,
          skippedCount,
          failedCount,
          finishedAt,
          updatedAt: finishedAt,
        })
        .where(eq(crawlerRuns.id, runId));
      await tx
        .update(crawlerSources)
        .set({
          lastSucceededAt: finishedAt,
          lastError: null,
          updatedAt: finishedAt,
        })
        .where(eq(crawlerSources.id, source.id));
    });

    return { status: 'succeeded' as const, runId };
  } catch (error) {
    const finishedAt = new Date();
    const message =
      error instanceof Error ? error.message.slice(0, 2000) : '未知扫描错误';
    await db.transaction(async (tx) => {
      await tx
        .update(crawlerRuns)
        .set({
          status: 'failed',
          discoveredCount,
          createdCount,
          updatedCount,
          skippedCount,
          failedCount: Math.max(1, failedCount),
          error: message,
          finishedAt,
          updatedAt: finishedAt,
        })
        .where(eq(crawlerRuns.id, runId));
      await tx
        .update(crawlerSources)
        .set({ lastError: message, updatedAt: finishedAt })
        .where(eq(crawlerSources.id, source.id));
    });

    return { status: 'failed' as const, runId, error: message };
  }
}

async function enabledSourceIds() {
  const db = getDb();
  return db
    .select({ id: crawlerSources.id })
    .from(crawlerSources)
    .where(eq(crawlerSources.enabled, true));
}

export async function runScheduledCrawlerSweep(scheduledFor: Date) {
  const sources = await enabledSourceIds();
  const results = [];

  for (const source of sources) {
    results.push(
      await runCrawlerSourceById(source.id, {
        trigger: 'scheduled',
        scheduledFor,
      }),
    );
  }

  return results;
}

export async function runManualCrawlerSweep() {
  const sources = await enabledSourceIds();
  const results = [];

  for (const source of sources) {
    results.push(
      await runCrawlerSourceById(source.id, {
        trigger: 'manual',
        scheduledFor: null,
      }),
    );
  }

  return results;
}
