import 'server-only';

import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';

import { exchangeListings, goods, ips, series } from '@/drizzle/schema';
import {
  exchangeListingStatusValues,
  type ExchangeFulfillmentMethod,
  type ExchangeListingStatus,
} from '@/lib/exchange-listing';
import {
  getProfileSummariesByUserIds,
  resolveCollectorLabel,
} from '@/server/data/profiles';
import {
  getPublishedGoodsCardsByIds,
  type GoodsCardData,
} from '@/server/data/_shared';
import { getDb } from '@/server/db/client';

const listGoodsExchangeListingsInputSchema = z.object({
  goodsId: z.string().uuid(),
  limit: z.number().int().min(1).max(12).default(6),
});

const listUserExchangeListingsInputSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(24).default(8),
  includeClosed: z.boolean().default(false),
});

const listExchangeGoodsOptionsInputSchema = z.object({
  excludeGoodsId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(36).default(18),
});

export type ExchangeGoodsOption = {
  id: string;
  slug: string;
  skuCode: string;
  name: string;
  goodsType: string;
  primaryImageUrl: string | null;
  series: {
    name: string;
    slug: string;
  };
  ip: {
    name: string;
    slug: string;
  };
};

export type ExchangeListingViewItem = {
  id: string;
  userId: string;
  ownerLabel: string;
  ownerHandle: string | null;
  status: ExchangeListingStatus;
  note: string;
  conditionNote: string | null;
  locationHint: string | null;
  allowMulti: boolean;
  allowCash: boolean;
  fulfillmentMethod: ExchangeFulfillmentMethod;
  createdAt: Date;
  updatedAt: Date;
  offeredGoods: ExchangeGoodsOption;
  wantedGoods: ExchangeGoodsOption | null;
};

type ExchangeListingRow = {
  id: string;
  goodsId: string;
  wantedGoodsId: string | null;
  userId: string;
  status: ExchangeListingStatus;
  description: string;
  conditionNote: string | null;
  locationHint: string | null;
  allowMulti: boolean;
  allowCash: boolean;
  fulfillmentMethod: ExchangeFulfillmentMethod;
  createdAt: Date;
  updatedAt: Date;
};

function toExchangeGoodsOption(goodsCard: GoodsCardData): ExchangeGoodsOption {
  return {
    id: goodsCard.id,
    slug: goodsCard.slug,
    skuCode: goodsCard.skuCode,
    name: goodsCard.name,
    goodsType: goodsCard.goodsType,
    primaryImageUrl: goodsCard.primaryImageUrl,
    series: {
      name: goodsCard.series.name,
      slug: goodsCard.series.slug,
    },
    ip: {
      name: goodsCard.ip.name,
      slug: goodsCard.ip.slug,
    },
  };
}

async function buildExchangeListingItems(rows: ExchangeListingRow[]) {
  if (rows.length === 0) {
    return [] satisfies ExchangeListingViewItem[];
  }

  const goodsIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        row.wantedGoodsId ? [row.goodsId, row.wantedGoodsId] : [row.goodsId],
      ),
    ),
  );
  const [goodsCards, profileSummaries] = await Promise.all([
    getPublishedGoodsCardsByIds(goodsIds),
    getProfileSummariesByUserIds(rows.map((row) => row.userId)),
  ]);
  const goodsCardById = new Map(goodsCards.map((item) => [item.id, item]));

  const items: Array<ExchangeListingViewItem | null> = rows.map((row) => {
    const offeredGoods = goodsCardById.get(row.goodsId);

    if (!offeredGoods) {
      return null;
    }

    return {
      id: row.id,
      userId: row.userId,
      ownerLabel: resolveCollectorLabel(row.userId, profileSummaries),
      ownerHandle: profileSummaries.get(row.userId)?.handle ?? null,
      status: row.status,
      note: row.description,
      conditionNote: row.conditionNote,
      locationHint: row.locationHint,
      allowMulti: row.allowMulti,
      allowCash: row.allowCash,
      fulfillmentMethod: row.fulfillmentMethod,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      offeredGoods: toExchangeGoodsOption(offeredGoods),
      wantedGoods: row.wantedGoodsId
        ? (() => {
            const wantedGoods = goodsCardById.get(row.wantedGoodsId);

            return wantedGoods ? toExchangeGoodsOption(wantedGoods) : null;
          })()
        : null,
    } satisfies ExchangeListingViewItem;
  });

  return items.filter((row): row is ExchangeListingViewItem => row !== null);
}

export async function listGoodsExchangeListings(
  input: z.input<typeof listGoodsExchangeListingsInputSchema>,
) {
  const db = getDb();
  const { goodsId, limit } = listGoodsExchangeListingsInputSchema.parse(input);

  const rows = await db
    .select({
      id: exchangeListings.id,
      goodsId: exchangeListings.goodsId,
      wantedGoodsId: exchangeListings.wantedGoodsId,
      userId: exchangeListings.userId,
      status: exchangeListings.status,
      description: exchangeListings.description,
      conditionNote: exchangeListings.conditionNote,
      locationHint: exchangeListings.locationHint,
      allowMulti: exchangeListings.allowMulti,
      allowCash: exchangeListings.allowCash,
      fulfillmentMethod: exchangeListings.fulfillmentMethod,
      createdAt: exchangeListings.createdAt,
      updatedAt: exchangeListings.updatedAt,
    })
    .from(exchangeListings)
    .where(
      and(
        eq(exchangeListings.goodsId, goodsId),
        eq(exchangeListings.status, 'open'),
        eq(exchangeListings.moderationStatus, 'approved'),
      ),
    )
    .orderBy(desc(exchangeListings.updatedAt), desc(exchangeListings.createdAt))
    .limit(limit);

  return buildExchangeListingItems(rows);
}

export async function listUserExchangeListings(
  input: z.input<typeof listUserExchangeListingsInputSchema>,
) {
  const db = getDb();
  const { userId, limit, includeClosed } =
    listUserExchangeListingsInputSchema.parse(input);

  const statuses = includeClosed
    ? [...exchangeListingStatusValues]
    : (['open', 'paused'] as const);

  const rows = await db
    .select({
      id: exchangeListings.id,
      goodsId: exchangeListings.goodsId,
      wantedGoodsId: exchangeListings.wantedGoodsId,
      userId: exchangeListings.userId,
      status: exchangeListings.status,
      description: exchangeListings.description,
      conditionNote: exchangeListings.conditionNote,
      locationHint: exchangeListings.locationHint,
      allowMulti: exchangeListings.allowMulti,
      allowCash: exchangeListings.allowCash,
      fulfillmentMethod: exchangeListings.fulfillmentMethod,
      createdAt: exchangeListings.createdAt,
      updatedAt: exchangeListings.updatedAt,
    })
    .from(exchangeListings)
    .where(
      and(
        eq(exchangeListings.userId, userId),
        inArray(exchangeListings.status, statuses),
        eq(exchangeListings.moderationStatus, 'approved'),
      ),
    )
    .orderBy(desc(exchangeListings.updatedAt), desc(exchangeListings.createdAt))
    .limit(limit);

  return buildExchangeListingItems(rows);
}

export async function listExchangeGoodsOptions(
  input?: z.input<typeof listExchangeGoodsOptionsInputSchema>,
) {
  const db = getDb();
  const { excludeGoodsId, limit } = listExchangeGoodsOptionsInputSchema.parse(
    input ?? {},
  );

  const rows = await db
    .select({
      id: goods.id,
    })
    .from(goods)
    .innerJoin(
      series,
      and(eq(goods.seriesId, series.id), eq(series.status, 'published')),
    )
    .innerJoin(ips, and(eq(series.ipId, ips.id), eq(ips.status, 'published')))
    .where(
      and(
        eq(goods.status, 'published'),
        excludeGoodsId ? ne(goods.id, excludeGoodsId) : undefined,
      ),
    )
    .orderBy(desc(goods.releaseDate), desc(goods.createdAt), asc(goods.name))
    .limit(limit);

  const goodsCards = await getPublishedGoodsCardsByIds(
    rows.map((row) => row.id),
  );

  return goodsCards.map((goodsCard) => toExchangeGoodsOption(goodsCard));
}
