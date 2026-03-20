import 'server-only';

import { desc, eq, inArray, sql } from 'drizzle-orm';

import {
  catalogSubmissions,
  exchangeListings,
  goods,
  postImages,
  posts,
} from '@/drizzle/schema';
import { getDemoViewerByUserId } from '@/lib/config/demo-viewers';
import { buildDemoAssetUrl } from '@/lib/demo-assets';
import type {
  CatalogSubmissionTargetType,
  CatalogSubmissionType,
  ModerationStatus,
} from '@/lib/moderation';
import { getDb } from '@/server/db/client';

const REVIEW_LIMIT = 5;

type ModerationCounts = Record<ModerationStatus, number>;

export type ModerationModuleSummary = {
  key:
    | 'catalog-submissions'
    | 'photo-uploads'
    | 'comments'
    | 'exchange-intents';
  label: string;
  description: string;
  counts: ModerationCounts;
  reservedNote: string;
};

export type CatalogSubmissionQueueItem = {
  id: string;
  title: string;
  body: string;
  submissionType: CatalogSubmissionType;
  targetEntityType: CatalogSubmissionTargetType;
  targetEntityId: string | null;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  submitterLabel: string;
  createdAt: Date;
};

export type PhotoModerationQueueItem = {
  id: string;
  imageUrl: string;
  altText: string | null;
  goodsSlug: string;
  goodsName: string;
  noteExcerpt: string;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  submitterLabel: string;
  createdAt: Date;
};

export type CommentModerationQueueItem = {
  id: string;
  goodsSlug: string;
  goodsName: string;
  body: string;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  submitterLabel: string;
  createdAt: Date;
};

export type ExchangeModerationQueueItem = {
  id: string;
  goodsSlug: string;
  goodsName: string;
  wantedGoodsName: string | null;
  description: string;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  submitterLabel: string;
  createdAt: Date;
};

export type ModerationQueueData = {
  mode: 'live' | 'fallback';
  generatedAt: Date;
  statusNote: string;
  modules: ModerationModuleSummary[];
  catalogSubmissions: {
    items: CatalogSubmissionQueueItem[];
    note: string;
  };
  photoUploads: {
    items: PhotoModerationQueueItem[];
    note: string;
  };
  comments: {
    items: CommentModerationQueueItem[];
    note: string;
  };
  exchangeIntents: {
    items: ExchangeModerationQueueItem[];
    note: string;
  };
};

function toCollectorLabel(userId: string) {
  return (
    getDemoViewerByUserId(userId)?.displayName ??
    `收藏者 ${userId.slice(0, 8)}`
  );
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function createFallbackData(): ModerationQueueData {
  const catalogSubmissionCounts: ModerationCounts = {
    pending: 2,
    approved: 1,
    rejected: 1,
  };
  const photoCounts: ModerationCounts = {
    pending: 1,
    approved: 3,
    rejected: 1,
  };
  const commentCounts: ModerationCounts = {
    pending: 2,
    approved: 4,
    rejected: 1,
  };
  const exchangeCounts: ModerationCounts = {
    pending: 1,
    approved: 2,
    rejected: 1,
  };

  return {
    mode: 'fallback',
    generatedAt: new Date(),
    statusNote:
      '当前无法访问数据库，或最新 migration 尚未应用，因此审核页正在渲染兜底壳层。',
    modules: [
      {
        key: 'catalog-submissions',
        label: '用户投稿',
        description:
          '面向新条目与元数据修正的结构化图鉴提案。',
        counts: catalogSubmissionCounts,
        reservedNote:
          '后续可补：payload diff 对比、审核人绑定，以及已通过内容并入真实图鉴记录。',
      },
      {
        key: 'photo-uploads',
        label: '图片投稿',
        description:
          '收藏者上传并挂载到 SKU 社区笔记下的实拍图片。',
        counts: photoCounts,
        reservedNote:
          '后续可补：图片安全审核、重复检测，以及驳回文件的存储清理。',
      },
      {
        key: 'comments',
        label: '评论',
        description:
          '围绕 SKU 的短评内容，只有审核通过后才会公开。',
        counts: commentCounts,
        reservedNote:
          '后续可补：审核备注、批量处理，以及辱骂/垃圾内容的升级标签。',
      },
      {
        key: 'exchange-intents',
        label: '交换意向',
        description:
          '轻量 have/want 记录，保持在支付与托管之外。',
        counts: exchangeCounts,
        reservedNote:
          '后续可补：审核决策、联系政策检查，以及手动暂停/关闭处理。',
      },
    ],
    catalogSubmissions: {
      items: [
        {
          id: 'fallback-submission-1',
          title: '补充会场抽选版亚克力挂件变体',
          body: '用户提议在 2026 Spring Bloom Fair 线下新增一条 SKU，补充会场限定发售信息和不同包装细节。',
          submissionType: 'create',
          targetEntityType: 'goods',
          targetEntityId: null,
          moderationStatus: 'pending',
          reviewNote: null,
          submitterLabel: 'Mika Archive',
          createdAt: new Date('2026-03-18T09:10:00.000Z'),
        },
        {
          id: 'fallback-submission-2',
          title: '修正双人色纸的工艺备注',
          body: '用户反馈当前烫金说明应写成压印签名，而不是整面满版烫金。',
          submissionType: 'update',
          targetEntityType: 'goods',
          targetEntityId: '10000000-0000-4000-8000-000000000033',
          moderationStatus: 'approved',
          reviewNote: '核对活动场刊扫描件后已通过。',
          submitterLabel: 'Aster Shelf Notes',
          createdAt: new Date('2026-03-17T14:30:00.000Z'),
        },
      ],
      note: '图鉴投稿现在可以在这里直接通过或驳回。通过只会更新审核状态，暂时不会自动并入图鉴数据。',
    },
    photoUploads: {
      items: [
        {
          id: 'fallback-photo-1',
          imageUrl: buildDemoAssetUrl(
            'neon-requiem/community/aoi-stand-desk-1.svg',
          ),
          altText: '葵亚克力立牌的桌面展示图。',
          goodsSlug: 'aoi-tsukishiro-spring-bloom-acrylic-stand',
          goodsName: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
          noteExcerpt:
            '一张暖光桌面展示图，随附简短质感说明。',
          moderationStatus: 'pending',
          reviewNote: null,
          submitterLabel: 'Mika Archive',
          createdAt: new Date('2026-03-18T11:20:00.000Z'),
        },
      ],
      note: '图片审核与评论审核相互独立，后续可以只驳回图片而不删除整条笔记。',
    },
    comments: {
      items: [
        {
          id: 'fallback-comment-1',
          goodsSlug: 'aoi-ren-spring-bloom-foil-mini-shikishi',
          goodsName: 'Aoi and Ren Foil Mini Shikishi - Spring Bloom Ver.',
          body: '实物的烫金效果比官图里更明显。',
          moderationStatus: 'pending',
          reviewNote: null,
          submitterLabel: 'Aster Shelf Notes',
          createdAt: new Date('2026-03-18T12:05:00.000Z'),
        },
      ],
      note: '评论现在单独维护待审、通过、驳回状态，与 visible/hidden 展示状态分离。',
    },
    exchangeIntents: {
      items: [
        {
          id: 'fallback-exchange-1',
          goodsSlug: 'ren-kagetsu-spring-bloom-glitter-can-badge',
          goodsName: 'Ren Kagetsu Glitter Can Badge - Spring Bloom Ver.',
          wantedGoodsName: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
          description:
            '抽到重复，希望直接换到葵的立牌，不接受补差价。',
          moderationStatus: 'pending',
          reviewNote: null,
          submitterLabel: 'Ren Swap Desk',
          createdAt: new Date('2026-03-18T08:50:00.000Z'),
        },
      ],
      note: '交换审核仍停留在意向层，不引入金钱处理、托管或仲裁能力。',
    },
  };
}

export async function getModerationQueueData(): Promise<ModerationQueueData> {
  try {
    const db = getDb();
    const [
      catalogCountsRows,
      photoCountsRows,
      commentCountsRows,
      exchangeCountsRows,
      catalogRows,
      photoRows,
      commentRows,
      exchangeRows,
    ] = await Promise.all([
      db
        .select({
          pendingCount: sql<number>`coalesce(sum(case when ${catalogSubmissions.moderationStatus} = 'pending' then 1 else 0 end), 0)`,
          approvedCount: sql<number>`coalesce(sum(case when ${catalogSubmissions.moderationStatus} = 'approved' then 1 else 0 end), 0)`,
          rejectedCount: sql<number>`coalesce(sum(case when ${catalogSubmissions.moderationStatus} = 'rejected' then 1 else 0 end), 0)`,
        })
        .from(catalogSubmissions),
      db
        .select({
          pendingCount: sql<number>`coalesce(sum(case when ${postImages.moderationStatus} = 'pending' then 1 else 0 end), 0)`,
          approvedCount: sql<number>`coalesce(sum(case when ${postImages.moderationStatus} = 'approved' then 1 else 0 end), 0)`,
          rejectedCount: sql<number>`coalesce(sum(case when ${postImages.moderationStatus} = 'rejected' then 1 else 0 end), 0)`,
        })
        .from(postImages),
      db
        .select({
          pendingCount: sql<number>`coalesce(sum(case when ${posts.moderationStatus} = 'pending' then 1 else 0 end), 0)`,
          approvedCount: sql<number>`coalesce(sum(case when ${posts.moderationStatus} = 'approved' then 1 else 0 end), 0)`,
          rejectedCount: sql<number>`coalesce(sum(case when ${posts.moderationStatus} = 'rejected' then 1 else 0 end), 0)`,
        })
        .from(posts),
      db
        .select({
          pendingCount: sql<number>`coalesce(sum(case when ${exchangeListings.moderationStatus} = 'pending' then 1 else 0 end), 0)`,
          approvedCount: sql<number>`coalesce(sum(case when ${exchangeListings.moderationStatus} = 'approved' then 1 else 0 end), 0)`,
          rejectedCount: sql<number>`coalesce(sum(case when ${exchangeListings.moderationStatus} = 'rejected' then 1 else 0 end), 0)`,
        })
        .from(exchangeListings),
      db
        .select({
          id: catalogSubmissions.id,
          title: catalogSubmissions.title,
          body: catalogSubmissions.body,
          submissionType: catalogSubmissions.submissionType,
          targetEntityType: catalogSubmissions.targetEntityType,
          targetEntityId: catalogSubmissions.targetEntityId,
          moderationStatus: catalogSubmissions.moderationStatus,
          reviewNote: catalogSubmissions.reviewNote,
          userId: catalogSubmissions.userId,
          createdAt: catalogSubmissions.createdAt,
        })
        .from(catalogSubmissions)
        .orderBy(desc(catalogSubmissions.createdAt))
        .limit(REVIEW_LIMIT),
      db
        .select({
          id: postImages.id,
          imageUrl: postImages.imageUrl,
          altText: postImages.altText,
          moderationStatus: postImages.moderationStatus,
          reviewNote: postImages.reviewNote,
          createdAt: postImages.createdAt,
          goodsSlug: goods.slug,
          goodsName: goods.name,
          body: posts.body,
          userId: posts.userId,
        })
        .from(postImages)
        .innerJoin(posts, eq(postImages.postId, posts.id))
        .innerJoin(goods, eq(posts.goodsId, goods.id))
        .orderBy(desc(postImages.createdAt))
        .limit(REVIEW_LIMIT),
      db
        .select({
          id: posts.id,
          goodsSlug: goods.slug,
          goodsName: goods.name,
          body: posts.body,
          moderationStatus: posts.moderationStatus,
          reviewNote: posts.reviewNote,
          createdAt: posts.createdAt,
          userId: posts.userId,
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
          moderationStatus: exchangeListings.moderationStatus,
          reviewNote: exchangeListings.reviewNote,
          createdAt: exchangeListings.createdAt,
          userId: exchangeListings.userId,
        })
        .from(exchangeListings)
        .innerJoin(goods, eq(exchangeListings.goodsId, goods.id))
        .orderBy(desc(exchangeListings.createdAt))
        .limit(REVIEW_LIMIT),
    ]);

    const wantedGoodsIds = Array.from(
      new Set(
        exchangeRows
          .map((row) => row.wantedGoodsId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const wantedGoodsRows =
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
      wantedGoodsRows.map((row) => [row.id, row.name]),
    );

    const catalogCountsRow = catalogCountsRows[0];
    const photoCountsRow = photoCountsRows[0];
    const commentCountsRow = commentCountsRows[0];
    const exchangeCountsRow = exchangeCountsRows[0];

    const catalogCounts: ModerationCounts = {
      pending: Number(catalogCountsRow?.pendingCount ?? 0),
      approved: Number(catalogCountsRow?.approvedCount ?? 0),
      rejected: Number(catalogCountsRow?.rejectedCount ?? 0),
    };
    const photoCounts: ModerationCounts = {
      pending: Number(photoCountsRow?.pendingCount ?? 0),
      approved: Number(photoCountsRow?.approvedCount ?? 0),
      rejected: Number(photoCountsRow?.rejectedCount ?? 0),
    };
    const commentCounts: ModerationCounts = {
      pending: Number(commentCountsRow?.pendingCount ?? 0),
      approved: Number(commentCountsRow?.approvedCount ?? 0),
      rejected: Number(commentCountsRow?.rejectedCount ?? 0),
    };
    const exchangeCounts: ModerationCounts = {
      pending: Number(exchangeCountsRow?.pendingCount ?? 0),
      approved: Number(exchangeCountsRow?.approvedCount ?? 0),
      rejected: Number(exchangeCountsRow?.rejectedCount ?? 0),
    };

    return {
      mode: 'live',
      generatedAt: new Date(),
      statusNote:
        '当前为实时审核快照。在这里做出的决定会立即写回评论、图片、交换意向和图鉴投稿记录。',
      modules: [
        {
          key: 'catalog-submissions',
          label: '用户投稿',
          description:
            '后续可并入图鉴数据的结构化提案。',
          counts: catalogCounts,
          reservedNote:
            '后续可补：diff 对比、审核人归属与通过后的合并执行。',
        },
        {
          key: 'photo-uploads',
          label: '图片投稿',
          description:
            '收藏实拍图片与评论审核决定保持独立。',
          counts: photoCounts,
          reservedNote:
            '后续可补：存储清理与单图审核历史。',
        },
        {
          key: 'comments',
          label: '评论',
          description:
            '文字笔记在审核员通过公开前会一直保持待审。',
          counts: commentCounts,
          reservedNote:
            '后续可补：批量操作、垃圾内容标记与驳回模板。',
        },
        {
          key: 'exchange-intents',
          label: '交换意向',
          description:
            '意向记录仍然绑定 SKU，且不进入支付流程。',
          counts: exchangeCounts,
          reservedNote:
            '后续可补：审核队列筛选器与策略级校验。',
        },
      ],
      catalogSubmissions: {
        items: catalogRows.map((row) => ({
          id: row.id,
          title: row.title,
          body: truncateText(row.body, 160),
          submissionType: row.submissionType,
          targetEntityType: row.targetEntityType,
          targetEntityId: row.targetEntityId,
          moderationStatus: row.moderationStatus,
          reviewNote: row.reviewNote,
          submitterLabel: toCollectorLabel(row.userId),
          createdAt: row.createdAt,
        })),
        note: '通过与驳回现在会直接更新审核字段，但图鉴 payload 仍需要额外的人工合并步骤。',
      },
      photoUploads: {
        items: photoRows.map((row) => ({
          id: row.id,
          imageUrl: row.imageUrl,
          altText: row.altText,
          goodsSlug: row.goodsSlug,
          goodsName: row.goodsName,
          noteExcerpt: truncateText(row.body, 110),
          moderationStatus: row.moderationStatus,
          reviewNote: row.reviewNote,
          submitterLabel: toCollectorLabel(row.userId),
          createdAt: row.createdAt,
        })),
        note: '图片已有独立审核字段，因此可以与评论审核解耦独立演进。',
      },
      comments: {
        items: commentRows.map((row) => ({
          id: row.id,
          goodsSlug: row.goodsSlug,
          goodsName: row.goodsName,
          body: truncateText(row.body, 150),
          moderationStatus: row.moderationStatus,
          reviewNote: row.reviewNote,
          submitterLabel: toCollectorLabel(row.userId),
          createdAt: row.createdAt,
        })),
        note: '公开 SKU 页面只展示已通过评论，待审与驳回内容会保留在这里。',
      },
      exchangeIntents: {
        items: exchangeRows.map((row) => ({
          id: row.id,
          goodsSlug: row.goodsSlug,
          goodsName: row.goodsName,
          wantedGoodsName: row.wantedGoodsId
            ? (wantedGoodsNames.get(row.wantedGoodsId) ?? null)
            : null,
          description: truncateText(row.description, 150),
          moderationStatus: row.moderationStatus,
          reviewNote: row.reviewNote,
          submitterLabel: toCollectorLabel(row.userId),
          createdAt: row.createdAt,
        })),
        note: '已通过的交换意向后续可以公开显示，驳回项则继续停留在 SKU 页之外。',
      },
    };
  } catch {
    return createFallbackData();
  }
}
