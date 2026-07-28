import 'server-only';

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import {
  characters,
  exchangeListings,
  goods,
  goodsCharacters,
  goodsImages,
  ips,
  postImages,
  posts,
  series,
} from '@/drizzle/schema';
import { getDb, isDatabaseAccessConfigurationError } from '@/server/db/client';

const GOODS_LIMIT = 8;
const REVIEW_LIMIT = 5;

export type AdminDashboardMode = 'live' | 'fallback';

export type AdminStatisticCard = {
  key: string;
  label: string;
  value: string;
  description: string;
  tone: 'default' | 'accent' | 'warning' | 'quiet';
};

export type AdminGoodsRecord = {
  id: string;
  slug: string;
  skuCode: string;
  name: string;
  goodsType: string;
  status: 'draft' | 'published' | 'archived';
  seriesName: string;
  ipName: string;
  characterNames: string[];
  updatedAt: Date;
};

export type AdminSubmissionRecord = {
  id: string;
  goodsSlug: string;
  goodsName: string;
  excerpt: string;
  imageCount: number;
  status: 'visible' | 'hidden';
  createdAt: Date;
};

export type AdminCommentRecord = {
  id: string;
  goodsSlug: string;
  goodsName: string;
  excerpt: string;
  status: 'visible' | 'hidden';
  createdAt: Date;
};

export type AdminExchangeRecord = {
  id: string;
  goodsSlug: string;
  goodsName: string;
  wantedGoodsName: string | null;
  description: string;
  status: 'open' | 'paused' | 'closed';
  fulfillmentMethod: 'shipping' | 'meetup' | 'either';
  createdAt: Date;
};

export type AdminDashboardData = {
  mode: AdminDashboardMode;
  generatedAt: Date;
  statusNote: string;
  statistics: AdminStatisticCard[];
  goodsManagement: {
    totalGoods: number;
    publishedGoods: number;
    draftGoods: number;
    archivedGoods: number;
    items: AdminGoodsRecord[];
  };
  userSubmissions: {
    pendingCount: number;
    liveVisiblePhotoCount: number;
    items: AdminSubmissionRecord[];
    note: string;
  };
  commentModeration: {
    pendingCount: number;
    visibleCount: number;
    hiddenCount: number;
    items: AdminCommentRecord[];
    note: string;
  };
  exchangeModeration: {
    pendingCount: number;
    openCount: number;
    pausedCount: number;
    closedCount: number;
    items: AdminExchangeRecord[];
    note: string;
  };
};

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function createFallbackDashboardData(): AdminDashboardData {
  return {
    mode: 'fallback',
    generatedAt: new Date(),
    statusNote: '当前无法访问数据库，因此管理后台正在展示一份兜底快照。',
    statistics: [
      {
        key: 'sku-records',
        label: 'SKU 记录',
        value: '3',
        description: '用于手动录入演示的兜底基线。',
        tone: 'accent',
      },
      {
        key: 'official-images',
        label: '官图数量',
        value: '7',
        description: '当前商品集合已挂载的演示图库图片。',
        tone: 'default',
      },
      {
        key: 'community-items',
        label: '社区内容',
        value: '6',
        description: '后续将进入审核流程的笔记与上传内容。',
        tone: 'quiet',
      },
      {
        key: 'open-exchanges',
        label: '开放交换',
        value: '1',
        description: 'V1 中轻量交换仍停留在意向单层级。',
        tone: 'warning',
      },
    ],
    goodsManagement: {
      totalGoods: 3,
      publishedGoods: 3,
      draftGoods: 0,
      archivedGoods: 0,
      items: [
        {
          id: 'fallback-goods-1',
          slug: 'aoi-tsukishiro-spring-bloom-acrylic-stand',
          skuCode: 'NR-SBF-2026-001',
          name: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
          goodsType: 'acrylic-stand',
          status: 'published',
          seriesName: '2026 Spring Bloom Fair',
          ipName: 'Neon Requiem',
          characterNames: ['Aoi Tsukishiro'],
          updatedAt: new Date('2026-03-14T08:30:00.000Z'),
        },
        {
          id: 'fallback-goods-2',
          slug: 'ren-kagetsu-spring-bloom-glitter-can-badge',
          skuCode: 'NR-SBF-2026-002',
          name: 'Ren Kagetsu Glitter Can Badge - Spring Bloom Ver.',
          goodsType: 'can-badge',
          status: 'published',
          seriesName: '2026 Spring Bloom Fair',
          ipName: 'Neon Requiem',
          characterNames: ['Ren Kagetsu'],
          updatedAt: new Date('2026-03-14T09:10:00.000Z'),
        },
        {
          id: 'fallback-goods-3',
          slug: 'aoi-ren-spring-bloom-foil-mini-shikishi',
          skuCode: 'NR-SBF-2026-003',
          name: 'Aoi and Ren Foil Mini Shikishi - Spring Bloom Ver.',
          goodsType: 'mini-shikishi',
          status: 'published',
          seriesName: '2026 Spring Bloom Fair',
          ipName: 'Neon Requiem',
          characterNames: ['Aoi Tsukishiro', 'Ren Kagetsu'],
          updatedAt: new Date('2026-03-14T09:45:00.000Z'),
        },
      ],
    },
    userSubmissions: {
      pendingCount: 0,
      liveVisiblePhotoCount: 3,
      items: [
        {
          id: 'fallback-submission-1',
          goodsSlug: 'aoi-tsukishiro-spring-bloom-acrylic-stand',
          goodsName: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
          excerpt:
            'Desk setup photo with warm lamp light and layered acrylic edge detail.',
          imageCount: 2,
          status: 'visible',
          createdAt: new Date('2026-03-17T10:00:00.000Z'),
        },
        {
          id: 'fallback-submission-2',
          goodsSlug: 'ren-kagetsu-spring-bloom-glitter-can-badge',
          goodsName: 'Ren Kagetsu Glitter Can Badge - Spring Bloom Ver.',
          excerpt:
            'Close-up of the glitter finish for collectors comparing blind-pack quality.',
          imageCount: 1,
          status: 'visible',
          createdAt: new Date('2026-03-16T13:20:00.000Z'),
        },
      ],
      note: '专门的投稿审核状态尚未完全实现，这个模块当前仅预览带图的公开投稿。',
    },
    commentModeration: {
      pendingCount: 0,
      visibleCount: 3,
      hiddenCount: 0,
      items: [
        {
          id: 'fallback-comment-1',
          goodsSlug: 'aoi-ren-spring-bloom-foil-mini-shikishi',
          goodsName: 'Aoi and Ren Foil Mini Shikishi - Spring Bloom Ver.',
          excerpt:
            'Foil effect is strong in person, but binder storage still feels practical.',
          status: 'visible',
          createdAt: new Date('2026-03-17T11:10:00.000Z'),
        },
        {
          id: 'fallback-comment-2',
          goodsSlug: 'aoi-tsukishiro-spring-bloom-acrylic-stand',
          goodsName: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
          excerpt:
            'Base print quality is clean, though the package edge arrived slightly bent.',
          status: 'visible',
          createdAt: new Date('2026-03-16T18:40:00.000Z'),
        },
      ],
      note: '评论会在审核通过后显示在对应商品页中。',
    },
    exchangeModeration: {
      pendingCount: 0,
      openCount: 1,
      pausedCount: 1,
      closedCount: 0,
      items: [
        {
          id: 'fallback-exchange-1',
          goodsSlug: 'ren-kagetsu-spring-bloom-glitter-can-badge',
          goodsName: 'Ren Kagetsu Glitter Can Badge - Spring Bloom Ver.',
          wantedGoodsName: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
          description:
            'Have an extra badge. Prefer a direct swap for Aoi or similar event acrylic.',
          status: 'open',
          fulfillmentMethod: 'either',
          createdAt: new Date('2026-03-18T09:05:00.000Z'),
        },
        {
          id: 'fallback-exchange-2',
          goodsSlug: 'aoi-tsukishiro-spring-bloom-acrylic-stand',
          goodsName: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
          wantedGoodsName: null,
          description:
            'Temporarily paused while checking local meetup options.',
          status: 'paused',
          fulfillmentMethod: 'meetup',
          createdAt: new Date('2026-03-15T20:15:00.000Z'),
        },
      ],
      note: '交换审核当前仍只停留在意向单层级，不包含支付、托管、仲裁或议价流程。',
    },
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const db = getDb();
    const [
      goodsSummaryRows,
      goodsImageSummaryRows,
      postSummaryRows,
      postImageSummaryRows,
      exchangeSummaryRows,
      goodsRows,
      submissionSourceRows,
      commentRows,
      exchangeRows,
    ] = await Promise.all([
      db
        .select({
          totalGoods: sql<number>`count(${goods.id})`,
          publishedGoods: sql<number>`coalesce(sum(case when ${goods.status} = 'published' then 1 else 0 end), 0)`,
          draftGoods: sql<number>`coalesce(sum(case when ${goods.status} = 'draft' then 1 else 0 end), 0)`,
          archivedGoods: sql<number>`coalesce(sum(case when ${goods.status} = 'archived' then 1 else 0 end), 0)`,
        })
        .from(goods),
      db
        .select({
          totalGoodsImages: sql<number>`count(${goodsImages.id})`,
        })
        .from(goodsImages),
      db
        .select({
          totalPosts: sql<number>`count(${posts.id})`,
          hiddenPosts: sql<number>`coalesce(sum(case when ${posts.status} = 'hidden' then 1 else 0 end), 0)`,
        })
        .from(posts),
      db
        .select({
          totalPostImages: sql<number>`count(${postImages.id})`,
        })
        .from(postImages)
        .where(eq(postImages.status, 'visible')),
      db
        .select({
          openCount: sql<number>`coalesce(sum(case when ${exchangeListings.status} = 'open' then 1 else 0 end), 0)`,
          pausedCount: sql<number>`coalesce(sum(case when ${exchangeListings.status} = 'paused' then 1 else 0 end), 0)`,
          closedCount: sql<number>`coalesce(sum(case when ${exchangeListings.status} = 'closed' then 1 else 0 end), 0)`,
        })
        .from(exchangeListings),
      db
        .select({
          id: goods.id,
          slug: goods.slug,
          skuCode: goods.skuCode,
          name: goods.name,
          goodsType: goods.goodsType,
          status: goods.status,
          updatedAt: goods.updatedAt,
          seriesName: series.name,
          ipName: ips.name,
        })
        .from(goods)
        .innerJoin(series, eq(goods.seriesId, series.id))
        .innerJoin(ips, eq(series.ipId, ips.id))
        .orderBy(desc(goods.updatedAt), asc(goods.name))
        .limit(GOODS_LIMIT),
      db
        .select({
          id: posts.id,
          goodsSlug: goods.slug,
          goodsName: goods.name,
          body: posts.body,
          status: posts.status,
          createdAt: posts.createdAt,
          imageCount: sql<number>`count(${postImages.id})`,
        })
        .from(posts)
        .innerJoin(goods, eq(posts.goodsId, goods.id))
        .leftJoin(
          postImages,
          and(
            eq(postImages.postId, posts.id),
            eq(postImages.status, 'visible'),
          ),
        )
        .groupBy(
          posts.id,
          goods.slug,
          goods.name,
          posts.body,
          posts.status,
          posts.createdAt,
        )
        .orderBy(desc(posts.createdAt))
        .limit(12),
      db
        .select({
          id: posts.id,
          goodsSlug: goods.slug,
          goodsName: goods.name,
          body: posts.body,
          status: posts.status,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .innerJoin(goods, eq(posts.goodsId, goods.id))
        .orderBy(desc(posts.createdAt))
        .limit(REVIEW_LIMIT),
      db
        .select({
          id: exchangeListings.id,
          goodsSlug: goods.slug,
          goodsName: goods.name,
          wantedGoodsId: exchangeListings.wantedGoodsId,
          description: exchangeListings.description,
          status: exchangeListings.status,
          fulfillmentMethod: exchangeListings.fulfillmentMethod,
          createdAt: exchangeListings.createdAt,
        })
        .from(exchangeListings)
        .innerJoin(goods, eq(exchangeListings.goodsId, goods.id))
        .orderBy(desc(exchangeListings.createdAt))
        .limit(REVIEW_LIMIT),
    ]);

    const goodsIds = goodsRows.map((row) => row.id);
    const goodsCharacterRows =
      goodsIds.length === 0
        ? []
        : await db
            .select({
              goodsId: goodsCharacters.goodsId,
              characterName: characters.name,
              sortOrder: goodsCharacters.sortOrder,
            })
            .from(goodsCharacters)
            .innerJoin(
              characters,
              eq(goodsCharacters.characterId, characters.id),
            )
            .where(inArray(goodsCharacters.goodsId, goodsIds))
            .orderBy(
              asc(goodsCharacters.goodsId),
              asc(goodsCharacters.sortOrder),
              asc(characters.name),
            );

    const characterNamesByGoodsId = new Map<string, string[]>();

    for (const row of goodsCharacterRows) {
      const current = characterNamesByGoodsId.get(row.goodsId) ?? [];
      current.push(row.characterName);
      characterNamesByGoodsId.set(row.goodsId, current);
    }

    const wantedGoodsIds = Array.from(
      new Set(
        exchangeRows
          .map((row) => row.wantedGoodsId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const wantedGoodsNameRows =
      wantedGoodsIds.length === 0
        ? []
        : await db
            .select({
              id: goods.id,
              name: goods.name,
            })
            .from(goods)
            .where(inArray(goods.id, wantedGoodsIds));
    const wantedGoodsNames = new Map(
      wantedGoodsNameRows.map((row) => [row.id, row.name]),
    );

    const goodsSummary = goodsSummaryRows[0];
    const goodsImageSummary = goodsImageSummaryRows[0];
    const postSummary = postSummaryRows[0];
    const postImageSummary = postImageSummaryRows[0];
    const exchangeSummary = exchangeSummaryRows[0];

    const totalGoods = Number(goodsSummary?.totalGoods ?? 0);
    const publishedGoods = Number(goodsSummary?.publishedGoods ?? 0);
    const draftGoods = Number(goodsSummary?.draftGoods ?? 0);
    const archivedGoods = Number(goodsSummary?.archivedGoods ?? 0);
    const totalGoodsImages = Number(goodsImageSummary?.totalGoodsImages ?? 0);
    const totalPosts = Number(postSummary?.totalPosts ?? 0);
    const hiddenPosts = Number(postSummary?.hiddenPosts ?? 0);
    const totalPostImages = Number(postImageSummary?.totalPostImages ?? 0);
    const openExchangeCount = Number(exchangeSummary?.openCount ?? 0);
    const pausedExchangeCount = Number(exchangeSummary?.pausedCount ?? 0);
    const closedExchangeCount = Number(exchangeSummary?.closedCount ?? 0);

    return {
      mode: 'live',
      generatedAt: new Date(),
      statusNote:
        '当前为数据库实时快照。管理权限已按角色控制，审核队列现在会把通过/驳回决定直接写回底层记录。',
      statistics: [
        {
          key: 'sku-records',
          label: 'SKU 记录',
          value: formatCount(totalGoods),
          description: `已发布 ${formatCount(publishedGoods)}，草稿 ${formatCount(draftGoods)}。`,
          tone: 'accent',
        },
        {
          key: 'official-images',
          label: '官图数量',
          value: formatCount(totalGoodsImages),
          description: '图库资源可直接用于详情页与后续识别索引。',
          tone: 'default',
        },
        {
          key: 'community-items',
          label: '社区内容',
          value: formatCount(totalPosts + totalPostImages),
          description: `${formatCount(totalPosts)} 条笔记，${formatCount(totalPostImages)} 张可见图片。`,
          tone: 'quiet',
        },
        {
          key: 'open-exchanges',
          label: '开放交换',
          value: formatCount(openExchangeCount),
          description: `暂停 ${formatCount(pausedExchangeCount)}，关闭 ${formatCount(closedExchangeCount)}。`,
          tone: 'warning',
        },
      ],
      goodsManagement: {
        totalGoods,
        publishedGoods,
        draftGoods,
        archivedGoods,
        items: goodsRows.map((row) => ({
          id: row.id,
          slug: row.slug,
          skuCode: row.skuCode,
          name: row.name,
          goodsType: row.goodsType,
          status: row.status,
          seriesName: row.seriesName,
          ipName: row.ipName,
          characterNames: characterNamesByGoodsId.get(row.id) ?? [],
          updatedAt: row.updatedAt,
        })),
      },
      userSubmissions: {
        pendingCount: 0,
        liveVisiblePhotoCount: totalPostImages,
        items: submissionSourceRows
          .filter((row) => Number(row.imageCount) > 0)
          .slice(0, REVIEW_LIMIT)
          .map((row) => ({
            id: row.id,
            goodsSlug: row.goodsSlug,
            goodsName: row.goodsName,
            excerpt: truncateText(row.body, 100),
            imageCount: Number(row.imageCount),
            status: row.status,
            createdAt: row.createdAt,
          })),
        note: '投稿记录现在会流入专门的审核队列，由审核人明确决定通过或驳回。',
      },
      commentModeration: {
        pendingCount: 0,
        visibleCount: totalPosts - hiddenPosts,
        hiddenCount: hiddenPosts,
        items: commentRows.map((row) => ({
          id: row.id,
          goodsSlug: row.goodsSlug,
          goodsName: row.goodsName,
          excerpt: truncateText(row.body, 100),
          status: row.status,
          createdAt: row.createdAt,
        })),
        note: '评论审核决定现在会进入专门队列，并在写回后刷新公开商品页与用户页。',
      },
      exchangeModeration: {
        pendingCount: 0,
        openCount: openExchangeCount,
        pausedCount: pausedExchangeCount,
        closedCount: closedExchangeCount,
        items: exchangeRows.map((row) => ({
          id: row.id,
          goodsSlug: row.goodsSlug,
          goodsName: row.goodsName,
          wantedGoodsName: row.wantedGoodsId
            ? (wantedGoodsNames.get(row.wantedGoodsId) ?? null)
            : null,
          description: truncateText(row.description, 100),
          status: row.status,
          fulfillmentMethod: row.fulfillmentMethod,
          createdAt: row.createdAt,
        })),
        note: '交换审核仍停留在意向层，不引入资金、托管或仲裁行为。',
      },
    };
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      throw error;
    }

    return createFallbackDashboardData();
  }
}
