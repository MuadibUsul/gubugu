import 'server-only';

import { and, eq, gte, sql } from 'drizzle-orm';

import { userGoods } from '@/drizzle/schema';
import type { DatabaseTransaction } from '@/server/db/client';

export type TradeInventoryReservation = {
  userId: string;
  goodsId: string;
  quantity: number;
};

export type TradeInventoryTransfer = {
  fromUserId: string;
  toUserId: string;
  goodsId: string;
  quantity: number;
};

type InventoryStatus = 'owned' | 'wanted' | 'exchange';

type ExchangeInventoryRow = {
  id: string;
  tradableQuantity: number;
};

type LitOwnedInventoryRow = {
  quantity: number;
  litAt: Date | null;
};

export function canReserveLitTradeInventory(
  exchangeRow: ExchangeInventoryRow | undefined,
  ownedRow: LitOwnedInventoryRow | undefined,
  quantity: number,
) {
  return Boolean(
    exchangeRow &&
    ownedRow?.litAt &&
    quantity > 0 &&
    exchangeRow.tradableQuantity >= quantity &&
    ownedRow.quantity >= quantity,
  );
}

type LockedTradeInventory = TradeInventoryReservation & { id: string };

function inventoryKey(
  userId: string,
  goodsId: string,
  status: InventoryStatus,
) {
  return `${userId}:${goodsId}:${status}`;
}

/**
 * Locks every involved inventory row in a stable order before changing any of
 * them. Collection edits use the same row lock, so an accepted offer cannot be
 * raced by a quantity edit or a status deletion.
 */
async function lockAvailableTradeInventory(
  tx: DatabaseTransaction,
  reservations: TradeInventoryReservation[],
) {
  const ordered = [...reservations].sort((left, right) =>
    `${left.userId}:${left.goodsId}`.localeCompare(
      `${right.userId}:${right.goodsId}`,
    ),
  );
  const locked: LockedTradeInventory[] = [];

  for (const reservation of ordered) {
    // Lock the exchange row first and the corresponding owned row second.
    // Settlement uses the same stable status order, preventing a concurrent
    // collection edit from slipping an unlit or insufficient item through
    // acceptance.
    const exchangeRow = (
      await tx
        .select({
          id: userGoods.id,
          tradableQuantity: userGoods.tradableQuantity,
        })
        .from(userGoods)
        .where(
          and(
            eq(userGoods.userId, reservation.userId),
            eq(userGoods.goodsId, reservation.goodsId),
            eq(userGoods.status, 'exchange'),
          ),
        )
        .limit(1)
        .for('update')
    )[0];
    const ownedRow = (
      await tx
        .select({
          quantity: userGoods.quantity,
          litAt: userGoods.litAt,
        })
        .from(userGoods)
        .where(
          and(
            eq(userGoods.userId, reservation.userId),
            eq(userGoods.goodsId, reservation.goodsId),
            eq(userGoods.status, 'owned'),
          ),
        )
        .limit(1)
        .for('update')
    )[0];
    if (
      !exchangeRow ||
      !canReserveLitTradeInventory(exchangeRow, ownedRow, reservation.quantity)
    ) {
      return null;
    }
    locked.push({ ...reservation, id: exchangeRow.id });
  }

  return locked;
}

/**
 * Locks and validates lit inventory without reserving it. Listing, offer and
 * counter writes use this inside their own transaction so a concurrent
 * collection edit cannot create a stale trade record after an earlier check.
 */
export async function lockLitTradeInventory(
  tx: DatabaseTransaction,
  reservations: TradeInventoryReservation[],
) {
  return Boolean(await lockAvailableTradeInventory(tx, reservations));
}

export async function reserveTradeInventory(
  tx: DatabaseTransaction,
  reservations: TradeInventoryReservation[],
  now: Date,
) {
  const locked = await lockAvailableTradeInventory(tx, reservations);
  if (!locked) throw new Error('TRADE_INVENTORY_UNAVAILABLE');

  for (const reservation of locked) {
    const changed = await tx
      .update(userGoods)
      .set({
        tradableQuantity: sql`${userGoods.tradableQuantity} - ${reservation.quantity}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(userGoods.id, reservation.id),
          gte(userGoods.tradableQuantity, reservation.quantity),
        ),
      )
      .returning({ id: userGoods.id });
    if (!changed.length) throw new Error('TRADE_INVENTORY_UNAVAILABLE');
  }
}

/** Applies the physical collection changes once both parties have received. */
export async function settleTradeInventory(
  tx: DatabaseTransaction,
  transfers: TradeInventoryTransfer[],
  now: Date,
) {
  const targets = new Map<
    string,
    { userId: string; goodsId: string; status: InventoryStatus }
  >();
  for (const transfer of transfers) {
    for (const target of [
      {
        userId: transfer.fromUserId,
        goodsId: transfer.goodsId,
        status: 'exchange' as const,
      },
      {
        userId: transfer.fromUserId,
        goodsId: transfer.goodsId,
        status: 'owned' as const,
      },
      {
        userId: transfer.toUserId,
        goodsId: transfer.goodsId,
        status: 'owned' as const,
      },
      {
        userId: transfer.toUserId,
        goodsId: transfer.goodsId,
        status: 'wanted' as const,
      },
    ]) {
      targets.set(
        inventoryKey(target.userId, target.goodsId, target.status),
        target,
      );
    }
  }

  const locked = new Map<
    string,
    { id: string; quantity: number; tradableQuantity: number }
  >();
  for (const target of [...targets.values()].sort((left, right) =>
    inventoryKey(left.userId, left.goodsId, left.status).localeCompare(
      inventoryKey(right.userId, right.goodsId, right.status),
    ),
  )) {
    const row = (
      await tx
        .select({
          id: userGoods.id,
          quantity: userGoods.quantity,
          tradableQuantity: userGoods.tradableQuantity,
        })
        .from(userGoods)
        .where(
          and(
            eq(userGoods.userId, target.userId),
            eq(userGoods.goodsId, target.goodsId),
            eq(userGoods.status, target.status),
          ),
        )
        .limit(1)
        .for('update')
    )[0];
    if (row) {
      locked.set(
        inventoryKey(target.userId, target.goodsId, target.status),
        row,
      );
    }
  }

  for (const transfer of transfers) {
    const exchangeRow = locked.get(
      inventoryKey(transfer.fromUserId, transfer.goodsId, 'exchange'),
    );
    if (!exchangeRow || exchangeRow.quantity < transfer.quantity) {
      throw new Error('TRADE_INVENTORY_SETTLEMENT_FAILED');
    }
    if (exchangeRow.quantity === transfer.quantity) {
      await tx.delete(userGoods).where(eq(userGoods.id, exchangeRow.id));
    } else {
      await tx
        .update(userGoods)
        .set({
          quantity: sql`${userGoods.quantity} - ${transfer.quantity}`,
          tradableQuantity: sql`least(${userGoods.tradableQuantity}, ${userGoods.quantity} - ${transfer.quantity})`,
          updatedAt: now,
        })
        .where(eq(userGoods.id, exchangeRow.id));
    }

    const ownedRow = locked.get(
      inventoryKey(transfer.fromUserId, transfer.goodsId, 'owned'),
    );
    if (ownedRow) {
      if (ownedRow.quantity <= transfer.quantity) {
        await tx.delete(userGoods).where(eq(userGoods.id, ownedRow.id));
      } else {
        await tx
          .update(userGoods)
          .set({
            quantity: sql`${userGoods.quantity} - ${transfer.quantity}`,
            updatedAt: now,
          })
          .where(eq(userGoods.id, ownedRow.id));
      }
    }

    await tx
      .insert(userGoods)
      .values({
        userId: transfer.toUserId,
        goodsId: transfer.goodsId,
        status: 'owned',
        quantity: transfer.quantity,
        tradableQuantity: 0,
      })
      .onConflictDoUpdate({
        target: [userGoods.userId, userGoods.goodsId, userGoods.status],
        set: {
          quantity: sql`${userGoods.quantity} + ${transfer.quantity}`,
          updatedAt: now,
        },
      });

    const wantedRow = locked.get(
      inventoryKey(transfer.toUserId, transfer.goodsId, 'wanted'),
    );
    if (wantedRow) {
      if (wantedRow.quantity <= transfer.quantity) {
        await tx.delete(userGoods).where(eq(userGoods.id, wantedRow.id));
      } else {
        await tx
          .update(userGoods)
          .set({
            quantity: sql`${userGoods.quantity} - ${transfer.quantity}`,
            updatedAt: now,
          })
          .where(eq(userGoods.id, wantedRow.id));
      }
    }
  }
}
