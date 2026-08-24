import 'server-only';

import { createHash } from 'node:crypto';

import { and, eq, lt } from 'drizzle-orm';

import {
  crawlerCrawlProgress,
  crawlerDrafts,
  crawlerRuns,
  crawlerSources,
  type CrawlerSource,
} from '@/drizzle/schema';
import {
  parseCatalogListing,
  parseCatalogPage,
  type CatalogListing,
  type ParsedCatalogProduct,
} from '@/lib/catalog-crawler/parser';
import { slugifyText } from '@/lib/slug';
import { enrichCatalogProduct } from '@/server/catalog-crawler/enrich';
import { normalizeAndStoreCatalogImage } from '@/server/catalog-crawler/image-store';
import {
  safeFetchBuffer,
  safeFetchText,
} from '@/server/catalog-crawler/safe-fetch';
import { getDb } from '@/server/db/client';

const MAX_DETAIL_PAGES = 24;
// 列表爬取（如 neogate /products/）：跟分页的页数上限与商品总数硬上限，防止失控。
const MAX_LISTING_PAGES = 60;
const MAX_LISTING_PRODUCTS = 800;
// 单站连续请求之间的礼貌间隔：基础间隔 + 随机抖动。全量爬会打很多请求，节流保守一些，
// 避免固定节奏被小站的频率风控识别、把 IP 封掉。抖动让节奏不那么机械。
const CRAWL_POLITE_DELAY_MS = 1500;
const CRAWL_POLITE_JITTER_MS = 1500;
const MAX_IMAGES_PER_DRAFT = 4;
// 全量礼貌爬取本就慢（几百页 × 秒级间隔 + 中文化 + 存图），把陈旧接管窗口放宽到 120 分钟，
// 免得一次正常的慢速全量爬被误判成卡死而被后续任务重复触发。
const STALE_RUN_AFTER_MS = 120 * 60 * 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 基础间隔上叠加 0–JITTER 的随机抖动，节奏更像人、更不易触发频率风控。
function politeCrawlDelay() {
  return delay(
    CRAWL_POLITE_DELAY_MS + Math.floor(Math.random() * CRAWL_POLITE_JITTER_MS),
  );
}

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

function sameHostOrNull(url: string | null, host: string) {
  if (!url) return null;
  try {
    return new URL(url).hostname === host ? url : null;
  } catch {
    return null;
  }
}

type CrawlTally = {
  discovered: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

type DraftOutcome = 'created' | 'updated' | 'skipped' | 'failed';

function emptyTally(): CrawlTally {
  return { discovered: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
}

// ── 断点续爬检查点 ────────────────────────────────────────────
// 一行 = 本轮会话已抓完并落好草稿的一个详情页 URL。进程中途终止时这些行留存，重启后跳过
// 它们、只补未完成的；整轮跑到底再整体删除，让下一次全量爬重新检查更新。

async function loadProcessedDetailUrls(sourceId: string) {
  const db = getDb();
  const rows = await db
    .select({ url: crawlerCrawlProgress.detailUrl })
    .from(crawlerCrawlProgress)
    .where(eq(crawlerCrawlProgress.sourceId, sourceId));
  return new Set(rows.map((row) => row.url));
}

async function markDetailUrlProcessed(sourceId: string, detailUrl: string) {
  const db = getDb();
  await db
    .insert(crawlerCrawlProgress)
    .values({ sourceId, detailUrl })
    .onConflictDoNothing();
}

async function clearProcessedDetailUrls(sourceId: string) {
  const db = getDb();
  await db
    .delete(crawlerCrawlProgress)
    .where(eq(crawlerCrawlProgress.sourceId, sourceId));
}

// 落一个产品草稿：按来源商品键去重，已发布 / 已拒绝或内容未变的跳过，否则新建或更新待审草稿。
async function upsertProductDraft(
  source: CrawlerSource,
  product: ParsedCatalogProduct,
): Promise<DraftOutcome> {
  const db = getDb();
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
    return 'skipped';
  }

  try {
    const now = new Date();
    const payload = await buildDraftPayload(source, product, now, [
      new URL(source.entryUrl).hostname,
      ...source.allowedImageHosts,
    ]);
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
      return 'updated';
    }

    await db.insert(crawlerDrafts).values({
      id: crypto.randomUUID(),
      sourceId: source.id,
      sourceKey,
      ...values,
    });
    return 'created';
  } catch {
    return 'failed';
  }
}

async function crawlSourceIntoDrafts(source: CrawlerSource): Promise<CrawlTally> {
  const sourceHost = new URL(source.entryUrl).hostname;
  const entry = await safeFetchText(source.entryUrl, {
    allowedHosts: [sourceHost],
  });

  // 入口页是商品列表页（有站点列表适配器且发现了商品卡）→ 走可断点续爬的列表爬取。
  const entryListing = parseCatalogListing(entry.text, entry.url);
  if (entryListing) {
    return crawlListingIntoDrafts(source, sourceHost, entryListing);
  }
  return crawlEntryIntoDrafts(source, sourceHost, entry);
}

// 回退路径：入口页即详情 / 靠 detailPathPattern 发现少量详情页的旧行为。目录小，不做断点。
async function crawlEntryIntoDrafts(
  source: CrawlerSource,
  sourceHost: string,
  entry: { text: string; url: string },
): Promise<CrawlTally> {
  const entryPage = parseCatalogPage(entry.text, entry.url, {
    detailPathPattern: source.detailPathPattern,
  });
  const products = [...entryPage.products];
  const tally = emptyTally();

  for (const detailUrl of entryPage.detailUrls.slice(0, MAX_DETAIL_PAGES)) {
    if (detailUrl === entry.url) continue;
    await politeCrawlDelay();

    try {
      const detail = await safeFetchText(detailUrl, {
        allowedHosts: [sourceHost],
      });
      products.push(...parseCatalogPage(detail.text, detail.url).products);
    } catch {
      tally.failed += 1;
    }
  }

  const unique = new Map<string, ParsedCatalogProduct>();
  for (const product of products) unique.set(sourceKeyFor(product), product);
  const deduped = [...unique.values()];
  tally.discovered = deduped.length;

  for (const product of deduped) {
    tally[await upsertProductDraft(source, product)] += 1;
  }

  return tally;
}

/**
 * 列表爬取（可断点续爬）：从入口列表页跟「下一页」翻完所有分页收集商品卡链接，再逐个
 * 「抓详情 → 解析 → 落草稿 → 记检查点」。发现只认商品卡链接、详情只认适配器解得出的
 * 结构化产品，页面脏数据不会成为草稿。已在早前会话完成的 URL 直接跳过；整轮跑到底就清空
 * 检查点，让下一次全量爬重新检查更新——进程若被中途终止，检查点留存，下次从断点继续。
 */
async function crawlListingIntoDrafts(
  source: CrawlerSource,
  sourceHost: string,
  firstListing: CatalogListing,
): Promise<CrawlTally> {
  const tally = emptyTally();

  // 1. 跟分页收集全部详情页 URL。
  const detailUrls = new Set(firstListing.productUrls);
  let nextUrl = sameHostOrNull(firstListing.nextPageUrl, sourceHost);
  let listingPages = 1;
  let listingWalkFailed = false;

  while (
    nextUrl &&
    listingPages < MAX_LISTING_PAGES &&
    detailUrls.size < MAX_LISTING_PRODUCTS
  ) {
    await politeCrawlDelay();

    let listing: CatalogListing | null = null;
    try {
      const page = await safeFetchText(nextUrl, { allowedHosts: [sourceHost] });
      listing = parseCatalogListing(page.text, page.url);
    } catch {
      tally.failed += 1;
      listingWalkFailed = true;
      break;
    }
    if (!listing) break;

    listingPages += 1;
    for (const url of listing.productUrls) detailUrls.add(url);
    nextUrl = sameHostOrNull(listing.nextPageUrl, sourceHost);
  }

  const allUrls = [...detailUrls].slice(0, MAX_LISTING_PRODUCTS);
  tally.discovered = allUrls.length;

  // 2. 载入检查点，跳过早前（被中断的）会话里已完成的 URL。
  const processed = await loadProcessedDetailUrls(source.id);

  // 3. 逐 URL：抓详情 → 解析 → 落草稿 → 成功即记检查点（失败留待下次重试，不记）。
  for (const detailUrl of allUrls) {
    if (processed.has(detailUrl)) {
      tally.skipped += 1;
      continue;
    }

    await politeCrawlDelay();

    let products: ParsedCatalogProduct[];
    try {
      const detail = await safeFetchText(detailUrl, {
        allowedHosts: [sourceHost],
      });
      products = parseCatalogPage(detail.text, detail.url).products;
    } catch {
      tally.failed += 1;
      continue;
    }

    let urlFailed = false;
    for (const product of products) {
      const outcome = await upsertProductDraft(source, product);
      tally[outcome] += 1;
      if (outcome === 'failed') urlFailed = true;
    }

    if (!urlFailed) await markDetailUrlProcessed(source.id, detailUrl);
  }

  // 4. 走到这里说明整轮跑完了（进程没被中途终止）。列表翻页未出错时清空检查点，让下一次
  //    全量爬重新检查更新；进程若在上面的循环里被杀，这行到不了，留下的检查点供下次续爬。
  if (!listingWalkFailed) await clearProcessedDetailUrls(source.id);

  return tally;
}

async function buildDraftPayload(
  source: CrawlerSource,
  product: ParsedCatalogProduct,
  fetchedAt: Date,
  imageHosts: readonly string[],
): Promise<DraftPayload> {
  const sourceKey = sourceKeyFor(product);
  const fallbackCode = `CRAWL-${sourceKey.slice(0, 12).toUpperCase()}`;
  const skuCode = trimText(product.skuCode, 128) ?? fallbackCode;

  // 代码基线已就绪；LLM 尽力做进一步中文化/校对/拆分。缺 key 或失败都回退到基线，
  // 并把状态写进草稿，供人工审核时判断。
  const enrichment = await enrichCatalogProduct(product);
  const enriched = enrichment.status === 'enriched' ? enrichment.data : null;

  const name = trimText(enriched?.name ?? product.name, 255) ?? fallbackCode;
  const slug =
    slugifyText(`${skuCode}-${name}`) || `crawl-${sourceKey.slice(0, 16)}`;
  const allowedImageHosts = Array.from(new Set(imageHosts));
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
      description: trimText(enriched?.description ?? product.description, 4000),
      goodsType: inferGoodsType(enriched?.goodsType ?? product.goodsType),
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
        // 人工审核依据：LLM 是否跑过、抽出的 IP/系列/角色建议、以及原文。
        enrichment:
          enrichment.status === 'enriched'
            ? {
                status: 'enriched',
                model: enrichment.model,
                originalName: product.name,
                ipName: enriched?.ipName ?? null,
                seriesName: enriched?.seriesName ?? null,
                characterNames: enriched?.characterNames ?? [],
              }
            : {
                status: enrichment.status,
                reason: enrichment.reason,
                originalName: product.name,
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
    // 抓取直接落草稿（列表来源可断点续爬），返回本轮统计。
    const tally = await crawlSourceIntoDrafts(source);
    discoveredCount = tally.discovered;
    createdCount = tally.created;
    updatedCount = tally.updated;
    skippedCount = tally.skipped;
    failedCount = tally.failed;

    if (discoveredCount === 0) {
      throw new Error(
        '页面中没有可识别的 Product 结构化数据；该站点可能需要专用适配器。',
      );
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

// 手动录入用的固定来源。entryUrl 必须满足 ^https?:// 约束，用占位主机；enabled=false
// 所以它不参与定时扫描。所有手动单条录入的草稿都挂在它下面。
export const MANUAL_SOURCE_ENTRY = 'https://manual-ingest.local/';
const MANUAL_SOURCE_NAME = '手动录入';

async function ensureManualSource(createdBy: string): Promise<CrawlerSource> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(crawlerSources)
    .where(eq(crawlerSources.entryUrl, MANUAL_SOURCE_ENTRY))
    .limit(1);
  if (existing) return existing;

  await db
    .insert(crawlerSources)
    .values({
      name: MANUAL_SOURCE_NAME,
      entryUrl: MANUAL_SOURCE_ENTRY,
      detailPathPattern: null,
      allowedImageHosts: [],
      enabled: false,
      createdBy,
    })
    .onConflictDoNothing({ target: crawlerSources.entryUrl });

  const [row] = await db
    .select()
    .from(crawlerSources)
    .where(eq(crawlerSources.entryUrl, MANUAL_SOURCE_ENTRY))
    .limit(1);
  return row;
}

export type ManualIngestResult =
  | { status: 'created' | 'updated'; draftId: string; title: string }
  | { status: 'empty' };

/**
 * 手动单条录入：抓取一个商品链接，走与爬虫相同的解析（含站点适配器）+ LLM 中文化，
 * 落成一条待审草稿。逐条人工策展，不发现其它链接、不参与定时扫描。
 * 找不到可识别商品返回 `empty`；抓取失败（如 WAF 403）会抛错，交由调用方提示。
 */
export async function ingestManualUrl(
  rawUrl: string,
  createdBy: string,
): Promise<ManualIngestResult> {
  const db = getDb();
  const target = new URL(rawUrl);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error('只支持 HTTP / HTTPS 链接。');
  }
  const pageHost = target.hostname;

  const page = await safeFetchText(target.toString(), {
    allowedHosts: [pageHost],
  });
  const product = parseCatalogPage(page.text, page.url).products[0];
  if (!product) {
    return { status: 'empty' };
  }

  const source = await ensureManualSource(createdBy);
  const now = new Date();
  // 允许下载本页引用的图片主机；safe-fetch 仍做私网 / 大小 / 类型校验。
  const imageHosts = [
    pageHost,
    ...product.imageUrls.flatMap((value) => {
      try {
        return [new URL(value).hostname];
      } catch {
        return [];
      }
    }),
  ];
  const payload = await buildDraftPayload(source, product, now, imageHosts);

  const sourceKey = sourceKeyFor(product);
  const contentHash = contentHashFor(product);
  const values = {
    sourceUrl: product.sourceUrl,
    contentHash,
    title: payload.goods.name,
    payload,
    updatedAt: now,
  };

  const [existing] = await db
    .select({ id: crawlerDrafts.id, status: crawlerDrafts.status })
    .from(crawlerDrafts)
    .where(
      and(
        eq(crawlerDrafts.sourceId, source.id),
        eq(crawlerDrafts.sourceKey, sourceKey),
      ),
    )
    .limit(1);

  if (existing) {
    // 已发布 / 已拒绝的不覆盖；待审的用最新解析更新。
    if (existing.status === 'pending') {
      await db
        .update(crawlerDrafts)
        .set(values)
        .where(eq(crawlerDrafts.id, existing.id));
    }
    return {
      status: 'updated',
      draftId: existing.id,
      title: payload.goods.name,
    };
  }

  const id = crypto.randomUUID();
  await db
    .insert(crawlerDrafts)
    .values({ id, sourceId: source.id, sourceKey, ...values });
  return { status: 'created', draftId: id, title: payload.goods.name };
}
