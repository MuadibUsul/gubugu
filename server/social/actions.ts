'use server';

import { and, eq, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  coordinationProposals,
  directConversations,
  directMessages,
  exchangeListings,
  exchanges,
  goods,
  goodsWatches,
  posts,
  reports,
} from '@/drizzle/schema';
import { requireAuthUser } from '@/server/auth/session';
import { consumeServerWrite } from '@/lib/rate-limit';
import { internalPathSchema } from '@/lib/internal-path';
import { getMatchesForUser } from '@/server/data/matching';
import { getDb } from '@/server/db/client';
import { lockLitTradeInventory } from '@/server/trade/inventory';

const reportSchema = z.object({
  targetType: z.enum(['post', 'exchange_listing', 'exchange', 'message']),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(1).max(64),
  details: z.string().trim().max(1000),
});
export async function createReportAction(formData: FormData) {
  const parsed = reportSchema.safeParse({
    targetType: formData.get('targetType'),
    targetId: formData.get('targetId'),
    reason: formData.get('reason'),
    details: formData.get('details') ?? '',
  });
  if (!parsed.success) return;
  const user = await requireAuthUser('/');
  if (
    !consumeServerWrite(`${user.id}:report`, {
      limit: 10,
      windowMs: 60_000,
    })
  )
    return;
  const db = getDb();
  let target: { id: string } | undefined;
  if (parsed.data.targetType === 'post') {
    target = (
      await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.id, parsed.data.targetId),
            eq(posts.status, 'visible'),
            eq(posts.moderationStatus, 'approved'),
          ),
        )
        .limit(1)
    )[0];
  } else if (parsed.data.targetType === 'exchange') {
    target = (
      await db
        .select({ id: exchanges.id })
        .from(exchanges)
        .where(
          and(
            eq(exchanges.id, parsed.data.targetId),
            or(
              eq(exchanges.initiatorId, user.id),
              eq(exchanges.recipientId, user.id),
            ),
          ),
        )
        .limit(1)
    )[0];
  } else if (parsed.data.targetType === 'exchange_listing') {
    target = (
      await db
        .select({ id: exchangeListings.id })
        .from(exchangeListings)
        .where(
          and(
            eq(exchangeListings.id, parsed.data.targetId),
            eq(exchangeListings.moderationStatus, 'approved'),
          ),
        )
        .limit(1)
    )[0];
  } else {
    target = (
      await db
        .select({ id: directMessages.id })
        .from(directMessages)
        .innerJoin(
          directConversations,
          eq(directMessages.conversationId, directConversations.id),
        )
        .where(
          and(
            eq(directMessages.id, parsed.data.targetId),
            eq(directMessages.status, 'visible'),
            sql`${directMessages.senderId} <> ${user.id}::uuid`,
            or(
              eq(directConversations.memberAId, user.id),
              eq(directConversations.memberBId, user.id),
            ),
          ),
        )
        .limit(1)
    )[0];
  }
  if (!target) return;

  await db
    .insert(reports)
    .values({
      reporterId: user.id,
      ...parsed.data,
      details: parsed.data.details || null,
    })
    .onConflictDoNothing();
  revalidatePath('/admin/moderation');
}

const watchSchema = z.object({
  goodsId: z.string().uuid(),
  nextPath: internalPathSchema,
});
export async function toggleGoodsWatchAction(formData: FormData) {
  const parsed = watchSchema.safeParse({
    goodsId: formData.get('goodsId'),
    nextPath: formData.get('nextPath'),
  });
  if (!parsed.success) return;
  const user = await requireAuthUser(parsed.data.nextPath);
  const db = getDb();
  const published = (
    await db
      .select({ id: goods.id })
      .from(goods)
      .where(
        and(eq(goods.id, parsed.data.goodsId), eq(goods.status, 'published')),
      )
      .limit(1)
  )[0];
  if (!published) return;
  const existing = (
    await db
      .select()
      .from(goodsWatches)
      .where(
        and(
          eq(goodsWatches.userId, user.id),
          eq(goodsWatches.goodsId, parsed.data.goodsId),
        ),
      )
      .limit(1)
  )[0];
  if (existing)
    await db
      .delete(goodsWatches)
      .where(
        and(
          eq(goodsWatches.userId, user.id),
          eq(goodsWatches.goodsId, parsed.data.goodsId),
        ),
      );
  else
    await db
      .insert(goodsWatches)
      .values({ userId: user.id, goodsId: parsed.data.goodsId })
      .onConflictDoNothing({
        target: [goodsWatches.userId, goodsWatches.goodsId],
      });
  revalidatePath(parsed.data.nextPath);
}

const coordinationSchema = z.object({
  participantIds: z.string(),
  nextPath: internalPathSchema,
});
const coordinationSnapshotSchema = z.object({
  legs: z
    .array(
      z.object({
        fromUserId: z.string().uuid(),
        toUserId: z.string().uuid(),
        goods: z.array(z.object({ id: z.string().uuid() })).min(1),
      }),
    )
    .length(3),
});

function coordinationInventory(
  snapshot: z.infer<typeof coordinationSnapshotSchema>,
) {
  return snapshot.legs.flatMap((leg) =>
    leg.goods.map((item) => ({
      // A cycle leg means `from` receives from `to`; `to` owns the item.
      userId: leg.toUserId,
      goodsId: item.id,
      quantity: 1,
    })),
  );
}

export async function createCoordinationProposalAction(formData: FormData) {
  const parsed = coordinationSchema.safeParse({
    participantIds: formData.get('participantIds'),
    nextPath: formData.get('nextPath'),
  });
  if (!parsed.success) return;
  const user = await requireAuthUser(parsed.data.nextPath);
  let rawParticipants: unknown;
  try {
    rawParticipants = JSON.parse(parsed.data.participantIds);
  } catch {
    return;
  }
  const participants = z
    .array(z.string().uuid())
    .length(3)
    .safeParse(rawParticipants);
  if (
    !participants.success ||
    participants.data[0] !== user.id ||
    new Set(participants.data).size !== 3
  )
    return;
  const matches = await getMatchesForUser(user.id);
  const cycle = matches.threeParty.find(
    (item) =>
      item.legs.map((leg) => leg.fromUserId).join(':') ===
      participants.data.join(':'),
  );
  if (!cycle) return;
  const cycleSnapshot = { legs: cycle.legs };
  const snapshot = coordinationSnapshotSchema.parse(cycleSnapshot);
  await getDb().transaction(async (tx) => {
    if (!(await lockLitTradeInventory(tx, coordinationInventory(snapshot)))) {
      return false;
    }
    await tx.insert(coordinationProposals).values({
      initiatorId: user.id,
      participantIds: participants.data,
      acceptedUserIds: [user.id],
      cycleSnapshot,
    });
    return true;
  });
  revalidatePath('/matches');
}

const coordinationDecisionSchema = z.object({
  proposalId: z.string().uuid(),
  decision: z.enum(['accept', 'cancel']),
});
export async function decideCoordinationProposalAction(formData: FormData) {
  const parsed = coordinationDecisionSchema.safeParse({
    proposalId: formData.get('proposalId'),
    decision: formData.get('decision'),
  });
  if (!parsed.success) return;
  const user = await requireAuthUser('/me/exchanges');
  const db = getDb();
  await db.transaction(async (tx) => {
    const proposal = (
      await tx
        .select()
        .from(coordinationProposals)
        .where(eq(coordinationProposals.id, parsed.data.proposalId))
        .limit(1)
        .for('update')
    )[0];
    if (
      !proposal ||
      proposal.status !== 'proposed' ||
      !proposal.participantIds.includes(user.id)
    ) {
      return false;
    }
    const now = new Date();
    if (parsed.data.decision === 'cancel') {
      await tx
        .update(coordinationProposals)
        .set({ status: 'cancelled', updatedAt: now })
        .where(eq(coordinationProposals.id, proposal.id));
      return true;
    }

    const snapshot = coordinationSnapshotSchema.safeParse(
      proposal.cycleSnapshot,
    );
    if (
      !snapshot.success ||
      !(await lockLitTradeInventory(tx, coordinationInventory(snapshot.data)))
    ) {
      await tx
        .update(coordinationProposals)
        .set({ status: 'cancelled', updatedAt: now })
        .where(eq(coordinationProposals.id, proposal.id));
      return false;
    }

    const acceptedUserIds = Array.from(
      new Set([...proposal.acceptedUserIds, user.id]),
    );
    const allAccepted = proposal.participantIds.every((participantId) =>
      acceptedUserIds.includes(participantId),
    );
    await tx
      .update(coordinationProposals)
      .set({
        acceptedUserIds,
        status: allAccepted ? 'accepted' : 'proposed',
        updatedAt: now,
      })
      .where(eq(coordinationProposals.id, proposal.id));
    return true;
  });
  revalidatePath('/me/exchanges');
}
