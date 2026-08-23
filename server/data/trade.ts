import 'server-only';

import {
  and,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  or,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import {
  exchangeListings,
  exchangeOfferRevisions,
  exchangeOffers,
  exchanges,
  userGoods,
} from '@/drizzle/schema';
import type { ExchangeOfferPolicy } from '@/lib/exchange/negotiation';
import type { ExchangeStatus } from '@/lib/exchange/status';
import type { GoodsCardData } from '@/server/data/_shared';
import { getPublishedGoodsCardsByIds } from '@/server/data/_shared';
import {
  getProfileSummariesByUserIds,
  resolveCollectorLabel,
  type ProfileSummary,
} from '@/server/data/profiles';
import { getDb } from '@/server/db/client';

export type TradeInventoryItem = {
  goods: GoodsCardData;
  quantity: number;
  tradableQuantity: number;
  note: string | null;
  wishlistPriority: 'normal' | 'super_want';
};

export type TradeListingView = {
  id: string;
  ownerId: string;
  owner: ProfileSummary | null;
  ownerLabel: string;
  status: 'open' | 'paused' | 'closed';
  offerPolicy: ExchangeOfferPolicy;
  offeredQuantity: number;
  description: string;
  conditionNote: string | null;
  locationHint: string | null;
  fulfillmentMethod: 'shipping' | 'meetup' | 'either';
  goods: GoodsCardData;
  preferredGoods: GoodsCardData | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TradeOfferRevisionView = {
  id: string;
  revisionNumber: number;
  actorId: string;
  actorLabel: string;
  offeredGoods: GoodsCardData;
  requestedGoods: GoodsCardData;
  offeredQuantity: number;
  requestedQuantity: number;
  fulfillmentMethod: 'shipping' | 'meetup' | 'either';
  offeredConditionNote: string | null;
  requestedConditionNote: string | null;
  message: string | null;
  createdAt: Date;
};

export type TradeOfferView = {
  id: string;
  listingId: string | null;
  proposerId: string;
  proposer: ProfileSummary | null;
  proposerLabel: string;
  recipientId: string;
  recipient: ProfileSummary | null;
  recipientLabel: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
  awaitingUserId: string;
  counterCount: number;
  acceptedExchangeId: string | null;
  acceptedExchangeStatus: ExchangeStatus | null;
  revisions: TradeOfferRevisionView[];
  latestRevision: TradeOfferRevisionView;
  createdAt: Date;
  updatedAt: Date;
};

type ListingRow = typeof exchangeListings.$inferSelect;

const litOwnedGoods = alias(userGoods, 'trade_data_lit_owned_goods');

function cardMap(cards: GoodsCardData[]) {
  return new Map(cards.map((card) => [card.id, card]));
}

async function hydrateListings(
  rows: ListingRow[],
): Promise<TradeListingView[]> {
  if (!rows.length) return [];

  const [cards, profiles] = await Promise.all([
    getPublishedGoodsCardsByIds(
      rows.flatMap((row) =>
        row.wantedGoodsId ? [row.goodsId, row.wantedGoodsId] : [row.goodsId],
      ),
    ),
    getProfileSummariesByUserIds(rows.map((row) => row.userId)),
  ]);
  const cardsById = cardMap(cards);

  return rows.flatMap((row) => {
    const goods = cardsById.get(row.goodsId);
    if (!goods) return [];
    return [
      {
        id: row.id,
        ownerId: row.userId,
        owner: profiles.get(row.userId) ?? null,
        ownerLabel: resolveCollectorLabel(row.userId, profiles),
        status: row.status,
        offerPolicy: row.offerPolicy,
        offeredQuantity: row.offeredQuantity,
        description: row.description,
        conditionNote: row.conditionNote,
        locationHint: row.locationHint,
        fulfillmentMethod: row.fulfillmentMethod,
        goods,
        preferredGoods: row.wantedGoodsId
          ? (cardsById.get(row.wantedGoodsId) ?? null)
          : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

export async function listUserTradeGoods(
  userId: string,
  status: 'wanted' | 'exchange',
): Promise<TradeInventoryItem[]> {
  const parsed = z.string().uuid().safeParse(userId);
  if (!parsed.success) return [];

  const db = getDb();
  const rows = await db
    .select({
      goodsId: userGoods.goodsId,
      quantity: userGoods.quantity,
      tradableQuantity: userGoods.tradableQuantity,
      note: userGoods.note,
      wishlistPriority: userGoods.wishlistPriority,
    })
    .from(userGoods)
    .where(
      and(
        eq(userGoods.userId, parsed.data),
        eq(userGoods.status, status),
        status === 'exchange'
          ? exists(
              db
                .select({ id: litOwnedGoods.id })
                .from(litOwnedGoods)
                .where(
                  and(
                    eq(litOwnedGoods.userId, userGoods.userId),
                    eq(litOwnedGoods.goodsId, userGoods.goodsId),
                    eq(litOwnedGoods.status, 'owned'),
                    isNotNull(litOwnedGoods.litAt),
                  ),
                ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(userGoods.updatedAt));
  const cards = await getPublishedGoodsCardsByIds(
    rows.map((row) => row.goodsId),
  );
  const cardsById = cardMap(cards);

  return rows.flatMap((row) => {
    const goods = cardsById.get(row.goodsId);
    if (!goods || (status === 'exchange' && row.tradableQuantity < 1))
      return [];
    return [{ goods, ...row }];
  });
}

export async function listOpenTradeListings(input?: {
  limit?: number;
  /** 只看某个发布者的公开换谷帖（用于其个人主页的换谷板）。 */
  ownerId?: string;
}): Promise<TradeListingView[]> {
  const limit = z.number().int().min(1).max(48).catch(12).parse(input?.limit);
  const db = getDb();
  const rows = await db
    .select()
    .from(exchangeListings)
    .where(
      and(
        eq(exchangeListings.status, 'open'),
        eq(exchangeListings.moderationStatus, 'approved'),
        eq(exchangeListings.allowCash, false),
        input?.ownerId
          ? eq(exchangeListings.userId, input.ownerId)
          : undefined,
        exists(
          db
            .select({ id: userGoods.id })
            .from(userGoods)
            .where(
              and(
                eq(userGoods.userId, exchangeListings.userId),
                eq(userGoods.goodsId, exchangeListings.goodsId),
                eq(userGoods.status, 'exchange'),
                gte(
                  userGoods.tradableQuantity,
                  exchangeListings.offeredQuantity,
                ),
              ),
            ),
        ),
        exists(
          db
            .select({ id: litOwnedGoods.id })
            .from(litOwnedGoods)
            .where(
              and(
                eq(litOwnedGoods.userId, exchangeListings.userId),
                eq(litOwnedGoods.goodsId, exchangeListings.goodsId),
                eq(litOwnedGoods.status, 'owned'),
                isNotNull(litOwnedGoods.litAt),
                gte(litOwnedGoods.quantity, exchangeListings.offeredQuantity),
              ),
            ),
        ),
      ),
    )
    .orderBy(desc(exchangeListings.createdAt))
    .limit(limit);

  return hydrateListings(rows);
}

export async function getTradeListingForViewer(input: {
  listingId: string;
  viewerId: string;
}) {
  const parsed = z
    .object({ listingId: z.string().uuid(), viewerId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return null;
  const db = getDb();
  const row = (
    await db
      .select()
      .from(exchangeListings)
      .where(eq(exchangeListings.id, parsed.data.listingId))
      .limit(1)
  )[0];
  if (!row) return null;

  if (
    row.userId !== parsed.data.viewerId &&
    (row.status !== 'open' || row.moderationStatus !== 'approved')
  ) {
    const participantOffer = (
      await db
        .select({ id: exchangeOffers.id })
        .from(exchangeOffers)
        .where(
          and(
            eq(exchangeOffers.listingId, row.id),
            or(
              eq(exchangeOffers.proposerId, parsed.data.viewerId),
              eq(exchangeOffers.recipientId, parsed.data.viewerId),
            ),
          ),
        )
        .limit(1)
    )[0];
    if (!participantOffer) return null;
  }

  const listing = (await hydrateListings([row]))[0];
  if (!listing) return null;
  const [ownerWanted, viewerTradable, offerRows] = await Promise.all([
    listUserTradeGoods(row.userId, 'wanted'),
    listUserTradeGoods(parsed.data.viewerId, 'exchange'),
    db
      .select()
      .from(exchangeOffers)
      .where(
        row.userId === parsed.data.viewerId
          ? eq(exchangeOffers.listingId, row.id)
          : and(
              eq(exchangeOffers.listingId, row.id),
              eq(exchangeOffers.proposerId, parsed.data.viewerId),
            ),
      )
      .orderBy(desc(exchangeOffers.updatedAt)),
  ]);
  const offers = await hydrateOffers(offerRows);

  return {
    listing,
    ownerWanted,
    viewerTradable,
    offers,
    viewerOfferId:
      offers.find((offer) => offer.proposerId === parsed.data.viewerId)?.id ??
      null,
  };
}

async function hydrateOffers(
  rows: Array<typeof exchangeOffers.$inferSelect>,
): Promise<TradeOfferView[]> {
  if (!rows.length) return [];
  const db = getDb();
  const revisions = await db
    .select()
    .from(exchangeOfferRevisions)
    .where(
      inArray(
        exchangeOfferRevisions.offerId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(
      exchangeOfferRevisions.offerId,
      exchangeOfferRevisions.revisionNumber,
    );
  const [cards, profiles, exchangeRows] = await Promise.all([
    getPublishedGoodsCardsByIds(
      revisions.flatMap((revision) => [
        revision.offeredGoodsId,
        revision.requestedGoodsId,
      ]),
    ),
    getProfileSummariesByUserIds(
      rows.flatMap((row) => [row.proposerId, row.recipientId]),
    ),
    (async () => {
      const ids = rows.flatMap((row) =>
        row.acceptedExchangeId ? [row.acceptedExchangeId] : [],
      );
      if (!ids.length) return [];
      return db
        .select({ id: exchanges.id, status: exchanges.status })
        .from(exchanges)
        .where(inArray(exchanges.id, ids));
    })(),
  ]);
  const cardsById = cardMap(cards);
  const exchangeStatusById = new Map(
    exchangeRows.map((row) => [row.id, row.status]),
  );
  const revisionsByOffer = new Map<string, TradeOfferRevisionView[]>();

  for (const revision of revisions) {
    const offeredGoods = cardsById.get(revision.offeredGoodsId);
    const requestedGoods = cardsById.get(revision.requestedGoodsId);
    if (!offeredGoods || !requestedGoods) continue;
    const list = revisionsByOffer.get(revision.offerId) ?? [];
    list.push({
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      actorId: revision.actorId,
      actorLabel: resolveCollectorLabel(revision.actorId, profiles),
      offeredGoods,
      requestedGoods,
      offeredQuantity: revision.offeredQuantity,
      requestedQuantity: revision.requestedQuantity,
      fulfillmentMethod: revision.fulfillmentMethod,
      offeredConditionNote: revision.offeredConditionNote,
      requestedConditionNote: revision.requestedConditionNote,
      message: revision.message,
      createdAt: revision.createdAt,
    });
    revisionsByOffer.set(revision.offerId, list);
  }

  return rows.flatMap((row) => {
    const offerRevisions = revisionsByOffer.get(row.id) ?? [];
    const latestRevision = offerRevisions.at(-1);
    if (!latestRevision) return [];
    return [
      {
        id: row.id,
        listingId: row.listingId,
        proposerId: row.proposerId,
        proposer: profiles.get(row.proposerId) ?? null,
        proposerLabel: resolveCollectorLabel(row.proposerId, profiles),
        recipientId: row.recipientId,
        recipient: profiles.get(row.recipientId) ?? null,
        recipientLabel: resolveCollectorLabel(row.recipientId, profiles),
        status: row.status,
        awaitingUserId: row.awaitingUserId,
        counterCount: row.counterCount,
        acceptedExchangeId: row.acceptedExchangeId,
        acceptedExchangeStatus: row.acceptedExchangeId
          ? (exchangeStatusById.get(row.acceptedExchangeId) ?? null)
          : null,
        revisions: offerRevisions,
        latestRevision,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

export async function getTradeOfferForParticipant(input: {
  offerId: string;
  viewerId: string;
}) {
  const parsed = z
    .object({ offerId: z.string().uuid(), viewerId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return null;
  const row = (
    await getDb()
      .select()
      .from(exchangeOffers)
      .where(
        and(
          eq(exchangeOffers.id, parsed.data.offerId),
          or(
            eq(exchangeOffers.proposerId, parsed.data.viewerId),
            eq(exchangeOffers.recipientId, parsed.data.viewerId),
          ),
        ),
      )
      .limit(1)
  )[0];
  if (!row) return null;
  const offer = (await hydrateOffers([row]))[0];
  if (!offer) return null;

  const [proposerTradable, recipientTradable, listingRows] = await Promise.all([
    listUserTradeGoods(row.proposerId, 'exchange'),
    listUserTradeGoods(row.recipientId, 'exchange'),
    row.listingId
      ? getDb()
          .select()
          .from(exchangeListings)
          .where(eq(exchangeListings.id, row.listingId))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const listing = listingRows[0]
    ? ((await hydrateListings([listingRows[0]]))[0] ?? null)
    : null;

  return { offer, listing, proposerTradable, recipientTradable };
}

export async function listTradeActivityForUser(userId: string) {
  if (!z.string().uuid().safeParse(userId).success) {
    return { listings: [], offers: [] };
  }
  const db = getDb();
  const [listingRows, offerRows] = await Promise.all([
    db
      .select()
      .from(exchangeListings)
      .where(eq(exchangeListings.userId, userId))
      .orderBy(desc(exchangeListings.updatedAt))
      .limit(48),
    db
      .select()
      .from(exchangeOffers)
      .where(
        or(
          eq(exchangeOffers.proposerId, userId),
          eq(exchangeOffers.recipientId, userId),
        ),
      )
      .orderBy(desc(exchangeOffers.updatedAt))
      .limit(64),
  ]);
  const [listings, offers] = await Promise.all([
    hydrateListings(listingRows),
    hydrateOffers(offerRows),
  ]);
  return { listings, offers };
}
