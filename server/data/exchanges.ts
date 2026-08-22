import 'server-only';

import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { z } from 'zod';

import { exchangeReviews, exchanges } from '@/drizzle/schema';
import type { ExchangeStatus } from '@/lib/exchange/status';
import {
  getProfileSummariesByUserIds,
  resolveCollectorLabel,
} from '@/server/data/profiles';
import { getDb } from '@/server/db/client';

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
