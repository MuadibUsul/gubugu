import 'server-only';

import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  coordinationProposals,
  exchangeReviews,
  exchanges,
} from '@/drizzle/schema';
import type { ExchangeStatus } from '@/lib/exchange/status';
import {
  getProfileSummariesByUserIds,
  resolveCollectorLabel,
} from '@/server/data/profiles';
import { getDb } from '@/server/db/client';

const listCoordinationProposalsInputSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(48),
});

/**
 * 当前用户参与的三方协调提案。
 *
 * 参与者存成 uuid 数组，所以过滤要用 `= any(...)`；这段原本写在
 * app/me/exchanges/page.tsx 里，页面不该自己编排数据库查询。
 */
export async function listCoordinationProposalsForUser(
  input: z.input<typeof listCoordinationProposalsInputSchema>,
) {
  const { userId, limit } = listCoordinationProposalsInputSchema.parse(input);

  return getDb()
    .select({
      id: coordinationProposals.id,
      status: coordinationProposals.status,
      participantIds: coordinationProposals.participantIds,
      acceptedUserIds: coordinationProposals.acceptedUserIds,
      createdAt: coordinationProposals.createdAt,
    })
    .from(coordinationProposals)
    .where(sql`${userId}::uuid = any(${coordinationProposals.participantIds})`)
    .orderBy(desc(coordinationProposals.createdAt))
    .limit(limit);
}

const listExchangesInputSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(48),
});

type GoodsSnapshot = {
  id?: unknown;
  slug?: unknown;
  skuCode?: unknown;
  name?: unknown;
  imageUrl?: unknown;
};

function asGoodsSnapshot(value: Record<string, unknown>): GoodsSnapshot {
  return value;
}

export type ExchangeListItem = {
  id: string;
  status: ExchangeStatus;
  fulfillmentMethod: 'shipping' | 'meetup' | 'either';
  offeredQuantity: number;
  requestedQuantity: number;
  initiatorId: string;
  initiatorLabel: string;
  recipientId: string;
  recipientLabel: string;
  offeredGoods: GoodsSnapshot;
  requestedGoods: GoodsSnapshot;
  initiatorShippedAt: Date | null;
  recipientShippedAt: Date | null;
  initiatorReceivedAt: Date | null;
  recipientReceivedAt: Date | null;
  reviewedByViewer: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** 参与者自己的换谷单；公开列表不暴露履约快照。 */
export async function listExchangesForUser(
  input: z.input<typeof listExchangesInputSchema>,
): Promise<ExchangeListItem[]> {
  const { userId, limit } = listExchangesInputSchema.parse(input);
  const rows = await getDb()
    .select({
      id: exchanges.id,
      status: exchanges.status,
      fulfillmentMethod: exchanges.fulfillmentMethod,
      offeredQuantity: exchanges.offeredQuantity,
      requestedQuantity: exchanges.requestedQuantity,
      initiatorId: exchanges.initiatorId,
      recipientId: exchanges.recipientId,
      offeredGoodsSnapshot: exchanges.offeredGoodsSnapshot,
      requestedGoodsSnapshot: exchanges.requestedGoodsSnapshot,
      initiatorShippedAt: exchanges.initiatorShippedAt,
      recipientShippedAt: exchanges.recipientShippedAt,
      initiatorReceivedAt: exchanges.initiatorReceivedAt,
      recipientReceivedAt: exchanges.recipientReceivedAt,
      createdAt: exchanges.createdAt,
      updatedAt: exchanges.updatedAt,
    })
    .from(exchanges)
    .where(
      or(eq(exchanges.initiatorId, userId), eq(exchanges.recipientId, userId)),
    )
    .orderBy(desc(exchanges.updatedAt), desc(exchanges.createdAt))
    .limit(limit);

  const [profiles, reviewRows] = await Promise.all([
    getProfileSummariesByUserIds(
      rows.flatMap((row) => [row.initiatorId, row.recipientId]),
    ),
    rows.length
      ? getDb()
          .select({ exchangeId: exchangeReviews.exchangeId })
          .from(exchangeReviews)
          .where(
            and(
              eq(exchangeReviews.reviewerId, userId),
              inArray(
                exchangeReviews.exchangeId,
                rows.map((row) => row.id),
              ),
            ),
          )
      : Promise.resolve([]),
  ]);
  const reviewedIds = new Set(reviewRows.map((row) => row.exchangeId));

  return rows.map((row) => ({
    ...row,
    initiatorLabel: resolveCollectorLabel(row.initiatorId, profiles),
    recipientLabel: resolveCollectorLabel(row.recipientId, profiles),
    reviewedByViewer: reviewedIds.has(row.id),
    offeredGoods: asGoodsSnapshot(row.offeredGoodsSnapshot),
    requestedGoods: asGoodsSnapshot(row.requestedGoodsSnapshot),
  }));
}
