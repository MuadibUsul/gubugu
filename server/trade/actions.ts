'use server';

import {
  and,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  exchangeListings,
  exchangeOfferRevisions,
  exchangeOffers,
  exchanges,
  notifications,
  userGoods,
} from '@/drizzle/schema';
import { exchangeFulfillmentMethodSchema } from '@/lib/exchange/fulfillment';
import {
  MAX_OFFER_COUNTERS,
  exchangeOfferPolicySchema,
  isFulfillmentAllowed,
  isInitialGoodsAllowed,
  otherOfferParticipant,
} from '@/lib/exchange/negotiation';
import { consumeServerWrite } from '@/lib/rate-limit';
import { requireAuthUser } from '@/server/auth/session';
import { getPublishedGoodsCardsByIds } from '@/server/data/_shared';
import { getDb } from '@/server/db/client';
import {
  areUsersBlocked,
  areUsersBlockedInTransaction,
  ensureConversationBetween,
  lockUserPair,
} from '@/server/messages/access';
import { notifyGoodsWatchers } from '@/server/notifications/watch';
import {
  lockLitTradeInventory,
  reserveTradeInventory,
} from '@/server/trade/inventory';

const conditionNoteSchema = z.string().trim().max(280).default('');
const offerMessageSchema = z.string().trim().max(600).default('');

const createListingSchema = z.object({
  goodsId: z.string().uuid(),
  wantedGoodsId: z.string().uuid().optional(),
  offeredQuantity: z.coerce.number().int().min(1).max(99),
  offerPolicy: exchangeOfferPolicySchema,
  description: z.string().trim().min(1).max(600),
  conditionNote: conditionNoteSchema,
  locationHint: z.string().trim().max(128).default(''),
  fulfillmentMethod: exchangeFulfillmentMethodSchema,
});

type UserGoodsRow = {
  id: string;
  quantity: number;
  tradableQuantity: number;
  note: string | null;
};

const litOwnedGoods = alias(userGoods, 'trade_action_lit_owned_goods');

async function findUserGoods(
  userId: string,
  goodsId: string,
  status: 'wanted' | 'exchange',
): Promise<UserGoodsRow | undefined> {
  const db = getDb();
  return (
    await db
      .select({
        id: userGoods.id,
        quantity: userGoods.quantity,
        tradableQuantity: userGoods.tradableQuantity,
        note: userGoods.note,
      })
      .from(userGoods)
      .where(
        and(
          eq(userGoods.userId, userId),
          eq(userGoods.goodsId, goodsId),
          eq(userGoods.status, status),
          status === 'exchange'
            ? exists(
                db
                  .select({ id: litOwnedGoods.id })
                  .from(litOwnedGoods)
                  .where(
                    and(
                      eq(litOwnedGoods.userId, userId),
                      eq(litOwnedGoods.goodsId, goodsId),
                      eq(litOwnedGoods.status, 'owned'),
                      isNotNull(litOwnedGoods.litAt),
                    ),
                  ),
              )
            : undefined,
        ),
      )
      .limit(1)
  )[0];
}

function snapshotGoods(
  card: Awaited<ReturnType<typeof getPublishedGoodsCardsByIds>>[number],
  quantity: number,
) {
  return {
    id: card.id,
    slug: card.slug,
    skuCode: card.skuCode,
    name: card.name,
    imageUrl: card.primaryImageUrl,
    exchangeQuantity: quantity,
  };
}

export async function createTradeListingAction(formData: FormData) {
  const parsed = createListingSchema.safeParse({
    goodsId: formData.get('goodsId'),
    wantedGoodsId: formData.get('wantedGoodsId') || undefined,
    offeredQuantity: formData.get('offeredQuantity'),
    offerPolicy: formData.get('offerPolicy'),
    description: formData.get('description'),
    conditionNote: formData.get('conditionNote') ?? '',
    locationHint: formData.get('locationHint') ?? '',
    fulfillmentMethod: formData.get('fulfillmentMethod'),
  });
  if (!parsed.success) redirect('/matches/new?error=invalid');
  const user = await requireAuthUser('/matches/new');
  if (
    !consumeServerWrite(`${user.id}:trade-listing`, {
      limit: 6,
      windowMs: 60_000,
    })
  ) {
    redirect('/matches/new?error=rate_limited');
  }
  const input = parsed.data;
  if (input.goodsId === input.wantedGoodsId) {
    redirect('/matches/new?error=same_goods');
  }
  const [offeredState, preferredState, wantedRows, cards] = await Promise.all([
    findUserGoods(user.id, input.goodsId, 'exchange'),
    input.wantedGoodsId
      ? findUserGoods(user.id, input.wantedGoodsId, 'wanted')
      : Promise.resolve(undefined),
    getDb()
      .select({ goodsId: userGoods.goodsId })
      .from(userGoods)
      .where(and(eq(userGoods.userId, user.id), eq(userGoods.status, 'wanted')))
      .limit(1),
    getPublishedGoodsCardsByIds(
      input.wantedGoodsId
        ? [input.goodsId, input.wantedGoodsId]
        : [input.goodsId],
    ),
  ]);
  if (
    !offeredState ||
    offeredState.tradableQuantity < input.offeredQuantity ||
    !cards.some((card) => card.id === input.goodsId) ||
    (input.wantedGoodsId &&
      (!preferredState ||
        !cards.some((card) => card.id === input.wantedGoodsId))) ||
    (input.offerPolicy === 'wishlist_only' && wantedRows.length === 0)
  ) {
    redirect('/matches/new?error=unavailable');
  }

  const creation = await getDb().transaction(async (tx) => {
    const available = await lockLitTradeInventory(tx, [
      {
        userId: user.id,
        goodsId: input.goodsId,
        quantity: input.offeredQuantity,
      },
    ]);
    if (!available) return { status: 'unavailable' as const };

    const inserted = await tx
      .insert(exchangeListings)
      .values({
        goodsId: input.goodsId,
        wantedGoodsId: input.wantedGoodsId ?? null,
        userId: user.id,
        status: 'open',
        offeredQuantity: input.offeredQuantity,
        offerPolicy: input.offerPolicy,
        description: input.description,
        conditionNote: input.conditionNote || null,
        locationHint: input.locationHint || null,
        allowMulti: false,
        allowCash: false,
        fulfillmentMethod: input.fulfillmentMethod,
        // Text-only exchange posts use report-based moderation so publishing is
        // immediately usable; the admin queue can still close reported posts.
        moderationStatus: 'approved',
      })
      .onConflictDoNothing()
      .returning({ id: exchangeListings.id });
    return inserted[0]
      ? { status: 'created' as const, id: inserted[0].id }
      : { status: 'existing' as const };
  });
  if (creation.status !== 'created') {
    redirect(`/matches/new?error=${creation.status}`);
  }
  const listingId = creation.id;
  await notifyGoodsWatchers(input.goodsId, user.id);
  revalidatePath('/matches');
  revalidatePath('/me/exchanges');
  redirect(`/matches/${listingId}?created=1`);
}

const listingStatusSchema = z.object({
  listingId: z.string().uuid(),
  decision: z.enum(['pause', 'resume', 'close']),
});

export async function updateTradeListingStatusAction(formData: FormData) {
  const parsed = listingStatusSchema.safeParse({
    listingId: formData.get('listingId'),
    decision: formData.get('decision'),
  });
  if (!parsed.success) redirect('/me/exchanges');
  const user = await requireAuthUser(`/matches/${parsed.data.listingId}`);
  const db = getDb();
  const row = (
    await db
      .select()
      .from(exchangeListings)
      .where(
        and(
          eq(exchangeListings.id, parsed.data.listingId),
          eq(exchangeListings.userId, user.id),
        ),
      )
      .limit(1)
  )[0];
  if (!row) redirect('/me/exchanges');
  const nextStatus =
    parsed.data.decision === 'pause'
      ? 'paused'
      : parsed.data.decision === 'resume'
        ? 'open'
        : 'closed';
  const allowed =
    (row.status === 'open' && ['paused', 'closed'].includes(nextStatus)) ||
    (row.status === 'paused' && ['open', 'closed'].includes(nextStatus));
  if (!allowed) redirect(`/matches/${row.id}?error=terminal`);
  if (nextStatus === 'open') {
    const inventory = await findUserGoods(user.id, row.goodsId, 'exchange');
    if (!inventory || inventory.tradableQuantity < row.offeredQuantity) {
      redirect(`/matches/${row.id}?status=unavailable`);
    }
  }
  const now = new Date();
  const updatedStatus = await db.transaction(async (tx) => {
    if (
      nextStatus === 'open' &&
      !(await lockLitTradeInventory(tx, [
        {
          userId: user.id,
          goodsId: row.goodsId,
          quantity: row.offeredQuantity,
        },
      ]))
    ) {
      return 'unavailable' as const;
    }
    const updated = await tx
      .update(exchangeListings)
      .set({ status: nextStatus, updatedAt: now })
      .where(
        and(
          eq(exchangeListings.id, row.id),
          eq(exchangeListings.userId, user.id),
          eq(exchangeListings.status, row.status),
        ),
      )
      .returning({ id: exchangeListings.id });
    if (!updated.length) return 'stale' as const;
    if (nextStatus !== 'closed') return 'updated' as const;
    const expired = await tx
      .update(exchangeOffers)
      .set({ status: 'expired', decidedAt: now, updatedAt: now })
      .where(
        and(
          eq(exchangeOffers.listingId, row.id),
          eq(exchangeOffers.status, 'pending'),
        ),
      )
      .returning({
        proposerId: exchangeOffers.proposerId,
        id: exchangeOffers.id,
      });
    if (expired.length) {
      await tx.insert(notifications).values(
        expired.map((offer) => ({
          recipientId: offer.proposerId,
          actorId: user.id,
          type: 'offer_declined' as const,
          payload: {
            offerId: offer.id,
            listingId: row.id,
            reason: 'listing_closed',
          },
        })),
      );
    }
    return 'updated' as const;
  });
  if (updatedStatus === 'unavailable') {
    redirect(`/matches/${row.id}?status=unavailable`);
  }
  if (updatedStatus === 'stale') {
    redirect(`/matches/${row.id}?error=terminal`);
  }
  revalidatePath('/matches');
  revalidatePath('/me/exchanges');
  revalidatePath(`/matches/${row.id}`);
  redirect(`/matches/${row.id}?status=${nextStatus}`);
}

const offerTermsSchema = z.object({
  offeredGoodsId: z.string().uuid(),
  requestedGoodsId: z.string().uuid(),
  offeredQuantity: z.coerce.number().int().min(1).max(99),
  requestedQuantity: z.coerce.number().int().min(1).max(99),
  fulfillmentMethod: exchangeFulfillmentMethodSchema.refine(
    (value) => value !== 'either',
    '成交前需明确邮寄或面交。',
  ),
  conditionNote: conditionNoteSchema,
  message: offerMessageSchema,
});

const createListingOfferSchema = offerTermsSchema.extend({
  listingId: z.string().uuid(),
});

async function validateTerms(input: {
  proposerId: string;
  recipientId: string;
  offeredGoodsId: string;
  requestedGoodsId: string;
  offeredQuantity: number;
  requestedQuantity: number;
}) {
  const [offeredState, requestedState, cards] = await Promise.all([
    findUserGoods(input.proposerId, input.offeredGoodsId, 'exchange'),
    findUserGoods(input.recipientId, input.requestedGoodsId, 'exchange'),
    getPublishedGoodsCardsByIds([input.offeredGoodsId, input.requestedGoodsId]),
  ]);
  return {
    offeredState,
    requestedState,
    cards,
    valid: Boolean(
      offeredState &&
      requestedState &&
      offeredState.tradableQuantity >= input.offeredQuantity &&
      requestedState.tradableQuantity >= input.requestedQuantity &&
      cards.length === 2 &&
      input.offeredGoodsId !== input.requestedGoodsId,
    ),
  };
}

export async function createListingOfferAction(formData: FormData) {
  const parsed = createListingOfferSchema.safeParse({
    listingId: formData.get('listingId'),
    offeredGoodsId: formData.get('offeredGoodsId'),
    requestedGoodsId: formData.get('requestedGoodsId'),
    offeredQuantity: formData.get('offeredQuantity'),
    requestedQuantity: formData.get('requestedQuantity'),
    fulfillmentMethod: formData.get('fulfillmentMethod'),
    conditionNote: formData.get('conditionNote') ?? '',
    message: formData.get('message') ?? '',
  });
  if (!parsed.success) redirect('/matches?offer=invalid');
  const user = await requireAuthUser(`/matches/${parsed.data.listingId}`);
  if (
    !consumeServerWrite(`${user.id}:trade-offer`, {
      limit: 8,
      windowMs: 60_000,
    })
  ) {
    redirect(`/matches/${parsed.data.listingId}?offer=rate_limited`);
  }
  const db = getDb();
  const listing = (
    await db
      .select()
      .from(exchangeListings)
      .where(
        and(
          eq(exchangeListings.id, parsed.data.listingId),
          eq(exchangeListings.status, 'open'),
          eq(exchangeListings.moderationStatus, 'approved'),
          eq(exchangeListings.allowCash, false),
        ),
      )
      .limit(1)
  )[0];
  if (
    !listing ||
    listing.userId === user.id ||
    parsed.data.requestedGoodsId !== listing.goodsId ||
    parsed.data.requestedQuantity > listing.offeredQuantity ||
    !isFulfillmentAllowed(
      listing.fulfillmentMethod,
      parsed.data.fulfillmentMethod,
    ) ||
    (await areUsersBlocked(user.id, listing.userId))
  ) {
    redirect(`/matches/${parsed.data.listingId}?offer=unavailable`);
  }
  const terms = await validateTerms({
    proposerId: user.id,
    recipientId: listing.userId,
    ...parsed.data,
  });
  const ownerWants = await findUserGoods(
    listing.userId,
    parsed.data.offeredGoodsId,
    'wanted',
  );
  if (
    !terms.valid ||
    !isInitialGoodsAllowed(listing.offerPolicy, Boolean(ownerWants))
  ) {
    redirect(`/matches/${listing.id}?offer=policy`);
  }

  const offerId = crypto.randomUUID();
  const inserted = await db.transaction(async (tx) => {
    await lockUserPair(tx, user.id, listing.userId);
    if (await areUsersBlockedInTransaction(tx, user.id, listing.userId)) {
      return 'blocked' as const;
    }
    if (
      !(await lockLitTradeInventory(tx, [
        {
          userId: user.id,
          goodsId: parsed.data.offeredGoodsId,
          quantity: parsed.data.offeredQuantity,
        },
        {
          userId: listing.userId,
          goodsId: listing.goodsId,
          quantity: parsed.data.requestedQuantity,
        },
      ]))
    ) {
      return 'unavailable' as const;
    }
    const offerRows = await tx
      .insert(exchangeOffers)
      .values({
        id: offerId,
        listingId: listing.id,
        proposerId: user.id,
        recipientId: listing.userId,
        awaitingUserId: listing.userId,
      })
      .onConflictDoNothing()
      .returning({ id: exchangeOffers.id });
    if (!offerRows.length) return 'conflict' as const;
    await tx.insert(exchangeOfferRevisions).values({
      offerId,
      revisionNumber: 0,
      actorId: user.id,
      offeredGoodsId: parsed.data.offeredGoodsId,
      requestedGoodsId: listing.goodsId,
      offeredQuantity: parsed.data.offeredQuantity,
      requestedQuantity: parsed.data.requestedQuantity,
      fulfillmentMethod: parsed.data.fulfillmentMethod,
      offeredConditionNote:
        parsed.data.conditionNote || terms.offeredState?.note,
      requestedConditionNote: listing.conditionNote,
      message: parsed.data.message || null,
    });
    await tx.insert(notifications).values({
      recipientId: listing.userId,
      actorId: user.id,
      type: 'offer_received',
      payload: { offerId, listingId: listing.id },
    });
    return 'created' as const;
  });
  if (inserted === 'unavailable' || inserted === 'blocked') {
    redirect(`/matches/${listing.id}?offer=unavailable`);
  }
  if (inserted !== 'created') {
    const existing = (
      await db
        .select({ id: exchangeOffers.id })
        .from(exchangeOffers)
        .where(
          and(
            eq(exchangeOffers.listingId, listing.id),
            eq(exchangeOffers.proposerId, user.id),
          ),
        )
        .limit(1)
    )[0];
    redirect(
      existing
        ? `/matches/offers/${existing.id}?offer=existing`
        : `/matches/${listing.id}?offer=failed`,
    );
  }
  await ensureConversationBetween(user.id, listing.userId);
  revalidatePath('/matches');
  revalidatePath('/me/exchanges');
  revalidatePath(`/matches/${listing.id}`);
  redirect(`/matches/offers/${offerId}?created=1`);
}

const createDirectOfferSchema = offerTermsSchema.extend({
  recipientId: z.string().uuid(),
});

export async function createDirectOfferAction(formData: FormData) {
  const parsed = createDirectOfferSchema.safeParse({
    recipientId: formData.get('recipientId'),
    offeredGoodsId: formData.get('offeredGoodsId'),
    requestedGoodsId: formData.get('requestedGoodsId'),
    offeredQuantity: formData.get('offeredQuantity') ?? 1,
    requestedQuantity: formData.get('requestedQuantity') ?? 1,
    fulfillmentMethod: formData.get('fulfillmentMethod'),
    conditionNote: formData.get('conditionNote') ?? '',
    message: formData.get('message') ?? '',
  });
  if (!parsed.success) redirect('/matches?offer=invalid');
  const user = await requireAuthUser('/matches');
  if (
    user.id === parsed.data.recipientId ||
    (await areUsersBlocked(user.id, parsed.data.recipientId)) ||
    !consumeServerWrite(`${user.id}:direct-trade-offer`, {
      limit: 6,
      windowMs: 60_000,
    })
  ) {
    redirect('/matches?offer=unavailable');
  }
  const [terms, initiatorWants, recipientWants] = await Promise.all([
    validateTerms({ proposerId: user.id, ...parsed.data }),
    findUserGoods(user.id, parsed.data.requestedGoodsId, 'wanted'),
    findUserGoods(
      parsed.data.recipientId,
      parsed.data.offeredGoodsId,
      'wanted',
    ),
  ]);
  if (!terms.valid || !initiatorWants || !recipientWants) {
    redirect('/matches?offer=unavailable');
  }
  const db = getDb();
  const offerId = crypto.randomUUID();
  const inserted = await db.transaction(async (tx) => {
    await lockUserPair(tx, user.id, parsed.data.recipientId);
    if (
      await areUsersBlockedInTransaction(tx, user.id, parsed.data.recipientId)
    ) {
      return 'blocked' as const;
    }
    if (
      !(await lockLitTradeInventory(tx, [
        {
          userId: user.id,
          goodsId: parsed.data.offeredGoodsId,
          quantity: parsed.data.offeredQuantity,
        },
        {
          userId: parsed.data.recipientId,
          goodsId: parsed.data.requestedGoodsId,
          quantity: parsed.data.requestedQuantity,
        },
      ]))
    ) {
      return 'unavailable' as const;
    }
    const rows = await tx
      .insert(exchangeOffers)
      .values({
        id: offerId,
        proposerId: user.id,
        recipientId: parsed.data.recipientId,
        awaitingUserId: parsed.data.recipientId,
      })
      .onConflictDoNothing()
      .returning({ id: exchangeOffers.id });
    if (!rows.length) return 'conflict' as const;
    await tx.insert(exchangeOfferRevisions).values({
      offerId,
      revisionNumber: 0,
      actorId: user.id,
      offeredGoodsId: parsed.data.offeredGoodsId,
      requestedGoodsId: parsed.data.requestedGoodsId,
      offeredQuantity: parsed.data.offeredQuantity,
      requestedQuantity: parsed.data.requestedQuantity,
      fulfillmentMethod: parsed.data.fulfillmentMethod,
      offeredConditionNote:
        parsed.data.conditionNote || terms.offeredState?.note,
      requestedConditionNote: terms.requestedState?.note,
      message: parsed.data.message || null,
    });
    await tx.insert(notifications).values({
      recipientId: parsed.data.recipientId,
      actorId: user.id,
      type: 'offer_received',
      payload: { offerId, source: 'match' },
    });
    return 'created' as const;
  });
  if (inserted === 'unavailable' || inserted === 'blocked') {
    redirect('/matches?offer=unavailable');
  }
  if (inserted !== 'created') {
    const existing = (
      await db
        .select({ id: exchangeOffers.id })
        .from(exchangeOffers)
        .where(
          and(
            eq(exchangeOffers.status, 'pending'),
            sql`${exchangeOffers.listingId} is null`,
            or(
              and(
                eq(exchangeOffers.proposerId, user.id),
                eq(exchangeOffers.recipientId, parsed.data.recipientId),
              ),
              and(
                eq(exchangeOffers.proposerId, parsed.data.recipientId),
                eq(exchangeOffers.recipientId, user.id),
              ),
            ),
          ),
        )
        .limit(1)
    )[0];
    redirect(
      existing
        ? `/matches/offers/${existing.id}?offer=existing`
        : '/matches?offer=failed',
    );
  }
  await ensureConversationBetween(user.id, parsed.data.recipientId);
  revalidatePath('/matches');
  revalidatePath('/me/exchanges');
  redirect(`/matches/offers/${offerId}?created=1`);
}

const counterOfferSchema = createDirectOfferSchema
  .omit({ recipientId: true })
  .extend({
    offerId: z.string().uuid(),
    revisionNumber: z.coerce.number().int().min(0).max(MAX_OFFER_COUNTERS),
  });

export async function counterTradeOfferAction(formData: FormData) {
  const parsed = counterOfferSchema.safeParse({
    offerId: formData.get('offerId'),
    revisionNumber: formData.get('revisionNumber'),
    offeredGoodsId: formData.get('offeredGoodsId'),
    requestedGoodsId: formData.get('requestedGoodsId'),
    offeredQuantity: formData.get('offeredQuantity'),
    requestedQuantity: formData.get('requestedQuantity'),
    fulfillmentMethod: formData.get('fulfillmentMethod'),
    conditionNote: formData.get('conditionNote') ?? '',
    message: formData.get('message') ?? '',
  });
  if (!parsed.success) redirect('/me/exchanges?offer=invalid');
  const user = await requireAuthUser(`/matches/offers/${parsed.data.offerId}`);
  const db = getDb();
  const offer = (
    await db
      .select()
      .from(exchangeOffers)
      .where(
        and(
          eq(exchangeOffers.id, parsed.data.offerId),
          eq(exchangeOffers.status, 'pending'),
          eq(exchangeOffers.awaitingUserId, user.id),
          eq(exchangeOffers.counterCount, parsed.data.revisionNumber),
        ),
      )
      .limit(1)
  )[0];
  if (!offer || offer.counterCount >= MAX_OFFER_COUNTERS) {
    redirect(`/matches/offers/${parsed.data.offerId}?offer=stale`);
  }
  const otherId = otherOfferParticipant(offer, user.id);
  if (!otherId || (await areUsersBlocked(user.id, otherId))) {
    redirect(`/matches/offers/${offer.id}?offer=blocked`);
  }
  const listing = offer.listingId
    ? (
        await db
          .select()
          .from(exchangeListings)
          .where(eq(exchangeListings.id, offer.listingId))
          .limit(1)
      )[0]
    : undefined;
  if (
    listing &&
    (parsed.data.requestedGoodsId !== listing.goodsId ||
      parsed.data.requestedQuantity > listing.offeredQuantity ||
      !isFulfillmentAllowed(
        listing.fulfillmentMethod,
        parsed.data.fulfillmentMethod,
      ))
  ) {
    redirect(`/matches/offers/${offer.id}?offer=invalid_terms`);
  }
  const terms = await validateTerms({
    proposerId: offer.proposerId,
    recipientId: offer.recipientId,
    ...parsed.data,
  });
  if (!terms.valid) {
    redirect(`/matches/offers/${offer.id}?offer=unavailable`);
  }
  if (
    listing &&
    listing.offerPolicy === 'wishlist_only' &&
    user.id === offer.proposerId
  ) {
    const ownerWants = await findUserGoods(
      offer.recipientId,
      parsed.data.offeredGoodsId,
      'wanted',
    );
    const latest = (
      await db
        .select()
        .from(exchangeOfferRevisions)
        .where(eq(exchangeOfferRevisions.offerId, offer.id))
        .orderBy(desc(exchangeOfferRevisions.revisionNumber))
        .limit(1)
    )[0];
    const recipientAlreadySuggestedThis =
      latest?.actorId === offer.recipientId &&
      latest.offeredGoodsId === parsed.data.offeredGoodsId;
    if (!ownerWants && !recipientAlreadySuggestedThis) {
      redirect(`/matches/offers/${offer.id}?offer=policy`);
    }
  }
  const now = new Date();
  const nextNumber = offer.counterCount + 1;
  const updated = await db.transaction(async (tx) => {
    await lockUserPair(tx, user.id, otherId);
    if (await areUsersBlockedInTransaction(tx, user.id, otherId)) {
      return 'blocked' as const;
    }
    if (
      !(await lockLitTradeInventory(tx, [
        {
          userId: offer.proposerId,
          goodsId: parsed.data.offeredGoodsId,
          quantity: parsed.data.offeredQuantity,
        },
        {
          userId: offer.recipientId,
          goodsId: parsed.data.requestedGoodsId,
          quantity: parsed.data.requestedQuantity,
        },
      ]))
    ) {
      return 'unavailable' as const;
    }
    const rows = await tx
      .update(exchangeOffers)
      .set({
        awaitingUserId: otherId,
        counterCount: nextNumber,
        updatedAt: now,
      })
      .where(
        and(
          eq(exchangeOffers.id, offer.id),
          eq(exchangeOffers.status, 'pending'),
          eq(exchangeOffers.awaitingUserId, user.id),
          eq(exchangeOffers.counterCount, offer.counterCount),
        ),
      )
      .returning({ id: exchangeOffers.id });
    if (!rows.length) return 'stale' as const;
    await tx.insert(exchangeOfferRevisions).values({
      offerId: offer.id,
      revisionNumber: nextNumber,
      actorId: user.id,
      offeredGoodsId: parsed.data.offeredGoodsId,
      requestedGoodsId: parsed.data.requestedGoodsId,
      offeredQuantity: parsed.data.offeredQuantity,
      requestedQuantity: parsed.data.requestedQuantity,
      fulfillmentMethod: parsed.data.fulfillmentMethod,
      offeredConditionNote:
        user.id === offer.proposerId
          ? parsed.data.conditionNote || terms.offeredState?.note
          : terms.offeredState?.note,
      requestedConditionNote:
        user.id === offer.recipientId
          ? parsed.data.conditionNote || terms.requestedState?.note
          : (listing?.conditionNote ?? terms.requestedState?.note),
      message: parsed.data.message || null,
    });
    await tx.insert(notifications).values({
      recipientId: otherId,
      actorId: user.id,
      type: 'offer_countered',
      payload: { offerId: offer.id, counterCount: nextNumber },
    });
    return 'countered' as const;
  });
  revalidatePath('/me/exchanges');
  revalidatePath(`/matches/offers/${offer.id}`);
  if (updated === 'unavailable' || updated === 'blocked') {
    redirect(`/matches/offers/${offer.id}?offer=unavailable`);
  }
  redirect(`/matches/offers/${offer.id}?offer=${updated}`);
}

const decideOfferSchema = z.object({
  offerId: z.string().uuid(),
  revisionNumber: z.coerce.number().int().min(0).max(MAX_OFFER_COUNTERS),
  decision: z.enum(['accept', 'decline', 'withdraw']),
  confirm: z.string().optional(),
});

export async function decideTradeOfferAction(formData: FormData) {
  const parsed = decideOfferSchema.safeParse({
    offerId: formData.get('offerId'),
    revisionNumber: formData.get('revisionNumber'),
    decision: formData.get('decision'),
    confirm: formData.get('confirm') || undefined,
  });
  if (!parsed.success) redirect('/me/exchanges?offer=invalid');
  const user = await requireAuthUser(`/matches/offers/${parsed.data.offerId}`);
  const db = getDb();
  const offer = (
    await db
      .select()
      .from(exchangeOffers)
      .where(
        and(
          eq(exchangeOffers.id, parsed.data.offerId),
          eq(exchangeOffers.status, 'pending'),
          eq(exchangeOffers.counterCount, parsed.data.revisionNumber),
          or(
            eq(exchangeOffers.proposerId, user.id),
            eq(exchangeOffers.recipientId, user.id),
          ),
        ),
      )
      .limit(1)
  )[0];
  if (!offer) redirect(`/matches/offers/${parsed.data.offerId}?offer=stale`);
  const otherId = otherOfferParticipant(offer, user.id);
  if (!otherId) redirect('/me/exchanges');
  const latest = (
    await db
      .select()
      .from(exchangeOfferRevisions)
      .where(eq(exchangeOfferRevisions.offerId, offer.id))
      .orderBy(desc(exchangeOfferRevisions.revisionNumber))
      .limit(1)
  )[0];
  if (!latest || latest.revisionNumber !== offer.counterCount) {
    redirect(`/matches/offers/${offer.id}?offer=stale`);
  }

  if (parsed.data.decision === 'withdraw') {
    if (latest.actorId !== user.id || offer.awaitingUserId === user.id) {
      redirect(`/matches/offers/${offer.id}?offer=forbidden`);
    }
    const withdrawn = await db.transaction(async (tx) => {
      const changed = await tx
        .update(exchangeOffers)
        .set({
          status: 'withdrawn',
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(exchangeOffers.id, offer.id),
            eq(exchangeOffers.status, 'pending'),
            eq(exchangeOffers.counterCount, offer.counterCount),
          ),
        )
        .returning({ id: exchangeOffers.id });
      if (!changed.length) return false;
      await tx.insert(notifications).values({
        recipientId: otherId,
        actorId: user.id,
        type: 'offer_declined',
        payload: { offerId: offer.id, reason: 'withdrawn' },
      });
      return true;
    });
    if (!withdrawn) {
      redirect(`/matches/offers/${offer.id}?offer=stale`);
    }
    revalidatePath('/me/exchanges');
    redirect(`/matches/offers/${offer.id}?offer=withdrawn`);
  }

  if (offer.awaitingUserId !== user.id) {
    redirect(`/matches/offers/${offer.id}?offer=forbidden`);
  }
  if (parsed.data.decision === 'decline') {
    const declined = await db.transaction(async (tx) => {
      const changed = await tx
        .update(exchangeOffers)
        .set({
          status: 'declined',
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(exchangeOffers.id, offer.id),
            eq(exchangeOffers.status, 'pending'),
            eq(exchangeOffers.awaitingUserId, user.id),
            eq(exchangeOffers.counterCount, offer.counterCount),
          ),
        )
        .returning({ id: exchangeOffers.id });
      if (!changed.length) return false;
      await tx.insert(notifications).values({
        recipientId: otherId,
        actorId: user.id,
        type: 'offer_declined',
        payload: { offerId: offer.id, reason: 'declined' },
      });
      return true;
    });
    if (!declined) {
      redirect(`/matches/offers/${offer.id}?offer=stale`);
    }
    revalidatePath('/me/exchanges');
    redirect(`/matches/offers/${offer.id}?offer=declined`);
  }

  if (parsed.data.confirm !== 'yes') {
    redirect(`/matches/offers/${offer.id}?offer=confirm_required`);
  }

  if (
    latest.fulfillmentMethod === 'either' ||
    (await areUsersBlocked(user.id, otherId))
  ) {
    redirect(`/matches/offers/${offer.id}?offer=unavailable`);
  }
  const listing = offer.listingId
    ? (
        await db
          .select()
          .from(exchangeListings)
          .where(eq(exchangeListings.id, offer.listingId))
          .limit(1)
      )[0]
    : undefined;
  const terms = await validateTerms({
    proposerId: offer.proposerId,
    recipientId: offer.recipientId,
    offeredGoodsId: latest.offeredGoodsId,
    requestedGoodsId: latest.requestedGoodsId,
    offeredQuantity: latest.offeredQuantity,
    requestedQuantity: latest.requestedQuantity,
  });
  const ownerWants = listing
    ? await findUserGoods(offer.recipientId, latest.offeredGoodsId, 'wanted')
    : undefined;
  const ownerPreviouslySuggested = listing
    ? Boolean(
        (
          await db
            .select({ id: exchangeOfferRevisions.id })
            .from(exchangeOfferRevisions)
            .where(
              and(
                eq(exchangeOfferRevisions.offerId, offer.id),
                eq(exchangeOfferRevisions.actorId, offer.recipientId),
                eq(
                  exchangeOfferRevisions.offeredGoodsId,
                  latest.offeredGoodsId,
                ),
              ),
            )
            .limit(1)
        )[0],
      )
    : false;
  if (
    !terms.valid ||
    (listing &&
      (listing.status === 'closed' ||
        latest.requestedGoodsId !== listing.goodsId ||
        latest.requestedQuantity > listing.offeredQuantity ||
        !isFulfillmentAllowed(
          listing.fulfillmentMethod,
          latest.fulfillmentMethod,
        ) ||
        (listing.offerPolicy === 'wishlist_only' &&
          !ownerWants &&
          !ownerPreviouslySuggested)))
  ) {
    redirect(`/matches/offers/${offer.id}?offer=unavailable`);
  }
  const offeredCard = terms.cards.find(
    (card) => card.id === latest.offeredGoodsId,
  );
  const requestedCard = terms.cards.find(
    (card) => card.id === latest.requestedGoodsId,
  );
  if (!offeredCard || !requestedCard) {
    redirect(`/matches/offers/${offer.id}?offer=unavailable`);
  }
  const exchangeId = crypto.randomUUID();
  const now = new Date();
  let accepted = false;
  try {
    accepted = await db.transaction(async (tx) => {
      await lockUserPair(tx, user.id, otherId);
      if (await areUsersBlockedInTransaction(tx, user.id, otherId)) {
        return false;
      }
      const claimed = await tx
        .update(exchangeOffers)
        .set({ status: 'accepted', decidedAt: now, updatedAt: now })
        .where(
          and(
            eq(exchangeOffers.id, offer.id),
            eq(exchangeOffers.status, 'pending'),
            eq(exchangeOffers.awaitingUserId, user.id),
            eq(exchangeOffers.counterCount, offer.counterCount),
          ),
        )
        .returning({ id: exchangeOffers.id });
      if (!claimed.length) return false;

      if (listing) {
        const closed = await tx
          .update(exchangeListings)
          .set({ status: 'closed', updatedAt: now })
          .where(
            and(
              eq(exchangeListings.id, listing.id),
              inArray(exchangeListings.status, ['open', 'paused']),
            ),
          )
          .returning({ id: exchangeListings.id });
        if (!closed.length) throw new Error('LISTING_ALREADY_CLOSED');
      }

      await reserveTradeInventory(
        tx,
        [
          {
            userId: offer.proposerId,
            goodsId: latest.offeredGoodsId,
            quantity: latest.offeredQuantity,
          },
          {
            userId: offer.recipientId,
            goodsId: latest.requestedGoodsId,
            quantity: latest.requestedQuantity,
          },
        ],
        now,
      );

      await tx.insert(exchanges).values({
        id: exchangeId,
        initiatorId: offer.proposerId,
        recipientId: offer.recipientId,
        offeredGoodsId: latest.offeredGoodsId,
        requestedGoodsId: latest.requestedGoodsId,
        offeredQuantity: latest.offeredQuantity,
        requestedQuantity: latest.requestedQuantity,
        status: 'accepted',
        fulfillmentMethod: latest.fulfillmentMethod,
        offeredGoodsSnapshot: snapshotGoods(
          offeredCard,
          latest.offeredQuantity,
        ),
        requestedGoodsSnapshot: snapshotGoods(
          requestedCard,
          latest.requestedQuantity,
        ),
        initiatorConditionSnapshot: {
          note: latest.offeredConditionNote ?? '',
        },
        recipientConditionSnapshot: {
          note: latest.requestedConditionNote ?? '',
        },
        note: latest.message,
        proposedAt: offer.createdAt,
        acceptedAt: now,
        inventoryReservedAt: now,
      });
      await tx
        .update(exchangeOffers)
        .set({ acceptedExchangeId: exchangeId, updatedAt: now })
        .where(eq(exchangeOffers.id, offer.id));

      const competing = listing
        ? await tx
            .update(exchangeOffers)
            .set({ status: 'expired', decidedAt: now, updatedAt: now })
            .where(
              and(
                eq(exchangeOffers.listingId, listing.id),
                ne(exchangeOffers.id, offer.id),
                eq(exchangeOffers.status, 'pending'),
              ),
            )
            .returning({
              id: exchangeOffers.id,
              userId: exchangeOffers.proposerId,
            })
        : [];
      await tx.insert(notifications).values([
        {
          recipientId: otherId,
          actorId: user.id,
          type: 'offer_accepted',
          exchangeId,
          payload: { offerId: offer.id, listingId: listing?.id ?? null },
        },
        ...competing.map((item) => ({
          recipientId: item.userId,
          actorId: user.id,
          type: 'offer_declined' as const,
          payload: {
            offerId: item.id,
            listingId: listing?.id ?? null,
            reason: 'another_offer_accepted',
          },
        })),
      ]);
      return true;
    });
  } catch {
    accepted = false;
  }
  revalidatePath('/matches');
  revalidatePath('/me/exchanges');
  revalidatePath(`/matches/offers/${offer.id}`);
  redirect(
    accepted
      ? `/me/exchanges?accepted=${exchangeId}`
      : `/matches/offers/${offer.id}?offer=stale`,
  );
}
