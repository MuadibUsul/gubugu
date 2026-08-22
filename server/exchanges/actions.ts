'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  exchangeReviews,
  exchanges,
  notifications,
  userGoods,
} from '@/drizzle/schema';
import {
  assertExchangeTransition,
  type ExchangeStatus,
} from '@/lib/exchange/status';
import {
  canCancelBeforeShipping,
  deriveFulfillmentStatus,
} from '@/lib/exchange/progress';
import { internalPathSchema } from '@/lib/internal-path';
import { requireAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import {
  reserveTradeInventory,
  settleTradeInventory,
} from '@/server/trade/inventory';

type ExchangeNotificationType =
  | 'exchange_proposed'
  | 'exchange_accepted'
  | 'exchange_shipping'
  | 'exchange_received'
  | 'exchange_completed'
  | 'exchange_cancelled';

const notificationTypeForStatus: Record<
  Exclude<ExchangeStatus, 'draft'>,
  ExchangeNotificationType
> = {
  proposed: 'exchange_proposed',
  accepted: 'exchange_accepted',
  shipping: 'exchange_shipping',
  received: 'exchange_received',
  completed: 'exchange_completed',
  cancelled: 'exchange_cancelled',
};

const nextPathSchema = internalPathSchema;

const exchangeActionInputSchema = z.object({
  exchangeId: z.string().uuid(),
  nextPath: nextPathSchema.optional(),
});

async function transitionExchange(
  exchangeId: string,
  actorId: string,
  to: ExchangeStatus,
) {
  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      const exchange = (
        await tx
          .select()
          .from(exchanges)
          .where(eq(exchanges.id, exchangeId))
          .limit(1)
          .for('update')
      )[0];
      if (!exchange) return false;
      const allowed =
        (to === 'accepted' &&
          exchange.status === 'proposed' &&
          exchange.recipientId === actorId) ||
        (to === 'cancelled' &&
          canCancelBeforeShipping(exchange.status, {
            initiatorShipped: Boolean(exchange.initiatorShippedAt),
            recipientShipped: Boolean(exchange.recipientShippedAt),
          }) &&
          (exchange.initiatorId === actorId ||
            exchange.recipientId === actorId));
      if (!allowed) return false;

      assertExchangeTransition(exchange.status, to);
      const now = new Date();
      const shouldReserveInventory = Boolean(
        to === 'accepted' && !exchange.inventoryReservedAt,
      );
      if (shouldReserveInventory) {
        await reserveTradeInventory(
          tx,
          [
            {
              userId: exchange.initiatorId,
              goodsId: exchange.offeredGoodsId,
              quantity: exchange.offeredQuantity,
            },
            {
              userId: exchange.recipientId,
              goodsId: exchange.requestedGoodsId,
              quantity: exchange.requestedQuantity,
            },
          ],
          now,
        );
      }
      const shouldReleaseInventory = Boolean(
        to === 'cancelled' &&
        exchange.inventoryReservedAt &&
        !exchange.inventoryReleasedAt,
      );
      await tx
        .update(exchanges)
        .set({
          status: to,
          acceptedAt: to === 'accepted' ? now : exchange.acceptedAt,
          cancelledAt: to === 'cancelled' ? now : exchange.cancelledAt,
          recipientConditionSnapshot:
            to === 'accepted'
              ? (exchange.recipientConditionSnapshot ?? { note: '' })
              : exchange.recipientConditionSnapshot,
          inventoryReleasedAt: shouldReleaseInventory
            ? now
            : exchange.inventoryReleasedAt,
          inventoryReservedAt: shouldReserveInventory
            ? now
            : exchange.inventoryReservedAt,
          updatedAt: now,
        })
        .where(eq(exchanges.id, exchange.id));

      if (shouldReleaseInventory) {
        for (const reservation of [
          {
            userId: exchange.initiatorId,
            goodsId: exchange.offeredGoodsId,
            quantity: exchange.offeredQuantity,
          },
          {
            userId: exchange.recipientId,
            goodsId: exchange.requestedGoodsId,
            quantity: exchange.requestedQuantity,
          },
        ]) {
          await tx
            .insert(userGoods)
            .values({
              userId: reservation.userId,
              goodsId: reservation.goodsId,
              status: 'exchange',
              quantity: reservation.quantity,
              tradableQuantity: reservation.quantity,
            })
            .onConflictDoUpdate({
              target: [userGoods.userId, userGoods.goodsId, userGoods.status],
              set: {
                quantity: sql`greatest(${userGoods.quantity}, ${userGoods.tradableQuantity} + ${reservation.quantity})`,
                tradableQuantity: sql`${userGoods.tradableQuantity} + ${reservation.quantity}`,
                updatedAt: now,
              },
            });
        }
      }

      await tx.insert(notifications).values({
        recipientId:
          actorId === exchange.initiatorId
            ? exchange.recipientId
            : exchange.initiatorId,
        actorId,
        type: notificationTypeForStatus[to],
        exchangeId: exchange.id,
      });
      return true;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'TRADE_INVENTORY_UNAVAILABLE'
    ) {
      return false;
    }
    throw error;
  }
}

async function performExchangeTransition(
  formData: FormData,
  to: ExchangeStatus,
) {
  const parsed = exchangeActionInputSchema.safeParse({
    exchangeId: formData.get('exchangeId'),
    nextPath: formData.get('nextPath'),
  });
  if (!parsed.success) redirect('/me/exchanges');

  const user = await requireAuthUser('/me/exchanges');
  await transitionExchange(parsed.data.exchangeId, user.id, to);
  revalidatePath('/me/exchanges');
  revalidatePath('/matches');
  redirect(parsed.data.nextPath ?? '/me/exchanges');
}

export async function acceptExchangeAction(formData: FormData) {
  return performExchangeTransition(formData, 'accepted');
}

export async function shipExchangeAction(formData: FormData) {
  const parsed = exchangeActionInputSchema.safeParse({
    exchangeId: formData.get('exchangeId'),
    nextPath: formData.get('nextPath'),
  });
  if (!parsed.success) redirect('/me/exchanges');
  const user = await requireAuthUser('/me/exchanges');
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const exchange = (
      await tx
        .select()
        .from(exchanges)
        .where(eq(exchanges.id, parsed.data.exchangeId))
        .limit(1)
        .for('update')
    )[0];
    if (
      !exchange ||
      ![exchange.initiatorId, exchange.recipientId].includes(user.id) ||
      !['accepted', 'shipping'].includes(exchange.status) ||
      !exchange.inventoryReservedAt ||
      exchange.inventoryReleasedAt
    ) {
      return false;
    }
    const isInitiator = user.id === exchange.initiatorId;
    const ownColumn = isInitiator
      ? exchange.initiatorShippedAt
      : exchange.recipientShippedAt;
    if (ownColumn) return false;
    const progressStatus = deriveFulfillmentStatus({
      initiatorShipped: isInitiator || Boolean(exchange.initiatorShippedAt),
      recipientShipped: !isInitiator || Boolean(exchange.recipientShippedAt),
      initiatorReceived: Boolean(exchange.initiatorReceivedAt),
      recipientReceived: Boolean(exchange.recipientReceivedAt),
    });
    await tx
      .update(exchanges)
      .set({
        ...(isInitiator
          ? { initiatorShippedAt: now }
          : { recipientShippedAt: now }),
        status: progressStatus,
        shippedAt: progressStatus === 'shipping' ? now : exchange.shippedAt,
        updatedAt: now,
      })
      .where(eq(exchanges.id, exchange.id));
    await tx.insert(notifications).values({
      recipientId: isInitiator ? exchange.recipientId : exchange.initiatorId,
      actorId: user.id,
      type: 'exchange_shipping',
      exchangeId: exchange.id,
    });
    return true;
  });
  revalidatePath('/me/exchanges');
  redirect(parsed.data.nextPath ?? '/me/exchanges');
}

export async function receiveExchangeAction(formData: FormData) {
  const parsed = exchangeActionInputSchema.safeParse({
    exchangeId: formData.get('exchangeId'),
    nextPath: formData.get('nextPath'),
  });
  if (!parsed.success) redirect('/me/exchanges');
  const user = await requireAuthUser('/me/exchanges');
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const exchange = (
      await tx
        .select()
        .from(exchanges)
        .where(eq(exchanges.id, parsed.data.exchangeId))
        .limit(1)
        .for('update')
    )[0];
    if (
      !exchange ||
      ![exchange.initiatorId, exchange.recipientId].includes(user.id) ||
      !['shipping', 'received'].includes(exchange.status) ||
      !exchange.initiatorShippedAt ||
      !exchange.recipientShippedAt ||
      !exchange.inventoryReservedAt ||
      exchange.inventoryReleasedAt
    ) {
      return false;
    }
    const isInitiator = user.id === exchange.initiatorId;
    const ownReceivedAt = isInitiator
      ? exchange.initiatorReceivedAt
      : exchange.recipientReceivedAt;
    if (ownReceivedAt) return false;
    const progressStatus = deriveFulfillmentStatus({
      initiatorShipped: true,
      recipientShipped: true,
      initiatorReceived: isInitiator || Boolean(exchange.initiatorReceivedAt),
      recipientReceived: !isInitiator || Boolean(exchange.recipientReceivedAt),
    });
    const completed = progressStatus === 'completed';
    const consumesReservedInventory = completed;
    if (consumesReservedInventory) {
      await settleTradeInventory(
        tx,
        [
          {
            fromUserId: exchange.initiatorId,
            toUserId: exchange.recipientId,
            goodsId: exchange.offeredGoodsId,
            quantity: exchange.offeredQuantity,
          },
          {
            fromUserId: exchange.recipientId,
            toUserId: exchange.initiatorId,
            goodsId: exchange.requestedGoodsId,
            quantity: exchange.requestedQuantity,
          },
        ],
        now,
      );
    }
    const rows = await tx
      .update(exchanges)
      .set({
        ...(isInitiator
          ? { initiatorReceivedAt: now }
          : { recipientReceivedAt: now }),
        status: progressStatus,
        receivedAt: now,
        completedAt: completed ? now : null,
        inventoryReleasedAt: consumesReservedInventory
          ? now
          : exchange.inventoryReleasedAt,
        updatedAt: now,
      })
      .where(eq(exchanges.id, exchange.id))
      .returning({ id: exchanges.id });
    if (!rows.length) return rows;
    await tx.insert(notifications).values({
      recipientId: isInitiator ? exchange.recipientId : exchange.initiatorId,
      actorId: user.id,
      type: completed ? 'exchange_completed' : 'exchange_received',
      exchangeId: exchange.id,
    });
    return true;
  });
  revalidatePath('/me/exchanges');
  redirect(parsed.data.nextPath ?? '/me/exchanges');
}

export async function cancelExchangeAction(formData: FormData) {
  return performExchangeTransition(formData, 'cancelled');
}

const reviewInputSchema = z.object({
  exchangeId: z.string().uuid(),
  score: z.coerce.number().int().min(1).max(5),
  note: z.string().trim().max(500),
});

export async function reviewExchangeAction(formData: FormData) {
  const parsed = reviewInputSchema.safeParse({
    exchangeId: formData.get('exchangeId'),
    score: formData.get('score'),
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) return;
  const user = await requireAuthUser('/me/exchanges');
  const db = getDb();
  const exchange = (
    await db
      .select()
      .from(exchanges)
      .where(eq(exchanges.id, parsed.data.exchangeId))
      .limit(1)
  )[0];
  if (
    !exchange ||
    exchange.status !== 'completed' ||
    ![exchange.initiatorId, exchange.recipientId].includes(user.id)
  )
    return;
  const revieweeId =
    user.id === exchange.initiatorId
      ? exchange.recipientId
      : exchange.initiatorId;
  await db
    .insert(exchangeReviews)
    .values({
      exchangeId: exchange.id,
      reviewerId: user.id,
      revieweeId,
      score: parsed.data.score,
      note: parsed.data.note || null,
    })
    .onConflictDoNothing({
      target: [exchangeReviews.exchangeId, exchangeReviews.reviewerId],
    });
  revalidatePath('/me/exchanges');
}
