'use server';

import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  directConversations,
  directMessages,
  exchangeListings,
  exchangeOffers,
  exchanges,
  follows,
  notifications,
  profiles,
  userBlocks,
} from '@/drizzle/schema';
import { internalPathSchema } from '@/lib/internal-path';
import { messageBodySchema } from '@/lib/messages';
import { consumeServerWrite } from '@/lib/rate-limit';
import { requireAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import {
  areUsersBlockedInTransaction,
  ensureConversationBetween,
  lockUserPair,
} from '@/server/messages/access';

const startConversationSchema = z.object({
  recipientId: z.string().uuid(),
  contextType: z.enum(['profile', 'listing', 'offer', 'exchange']),
  contextId: z.string().uuid().optional(),
  nextPath: internalPathSchema.optional(),
});

async function canStartConversation(input: {
  actorId: string;
  recipientId: string;
  contextType: z.output<typeof startConversationSchema>['contextType'];
  contextId?: string;
}) {
  const db = getDb();
  if (input.contextType !== 'profile' && !input.contextId) return false;
  if (input.contextType === 'listing' && input.contextId) {
    return Boolean(
      (
        await db
          .select({ id: exchangeListings.id })
          .from(exchangeListings)
          .where(
            and(
              eq(exchangeListings.id, input.contextId),
              eq(exchangeListings.userId, input.recipientId),
              eq(exchangeListings.status, 'open'),
              eq(exchangeListings.moderationStatus, 'approved'),
            ),
          )
          .limit(1)
      )[0],
    );
  }
  if (input.contextType === 'offer' && input.contextId) {
    return Boolean(
      (
        await db
          .select({ id: exchangeOffers.id })
          .from(exchangeOffers)
          .where(
            and(
              eq(exchangeOffers.id, input.contextId),
              or(
                and(
                  eq(exchangeOffers.proposerId, input.actorId),
                  eq(exchangeOffers.recipientId, input.recipientId),
                ),
                and(
                  eq(exchangeOffers.proposerId, input.recipientId),
                  eq(exchangeOffers.recipientId, input.actorId),
                ),
              ),
            ),
          )
          .limit(1)
      )[0],
    );
  }
  if (input.contextType === 'exchange' && input.contextId) {
    return Boolean(
      (
        await db
          .select({ id: exchanges.id })
          .from(exchanges)
          .where(
            and(
              eq(exchanges.id, input.contextId),
              or(
                and(
                  eq(exchanges.initiatorId, input.actorId),
                  eq(exchanges.recipientId, input.recipientId),
                ),
                and(
                  eq(exchanges.initiatorId, input.recipientId),
                  eq(exchanges.recipientId, input.actorId),
                ),
              ),
            ),
          )
          .limit(1)
      )[0],
    );
  }

  const target = (
    await db
      .select({ id: profiles.id, visibility: profiles.visibility })
      .from(profiles)
      .where(eq(profiles.id, input.recipientId))
      .limit(1)
  )[0];
  if (!target) return false;
  if (target.visibility === 'public') return true;
  if (target.visibility === 'private') return false;
  return Boolean(
    (
      await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, input.actorId),
            eq(follows.followingId, input.recipientId),
          ),
        )
        .limit(1)
    )[0],
  );
}

export async function startConversationAction(formData: FormData) {
  const parsed = startConversationSchema.safeParse({
    recipientId: formData.get('recipientId'),
    contextType: formData.get('contextType') ?? 'profile',
    contextId: formData.get('contextId') || undefined,
    nextPath: formData.get('nextPath') || undefined,
  });
  if (!parsed.success) redirect('/me/messages?error=invalid');
  const user = await requireAuthUser(parsed.data.nextPath ?? '/me/messages');
  if (
    user.id === parsed.data.recipientId ||
    !consumeServerWrite(`${user.id}:new-conversation`, {
      limit: 5,
      windowMs: 24 * 60 * 60 * 1000,
    }) ||
    !(await canStartConversation({ actorId: user.id, ...parsed.data }))
  ) {
    redirect('/me/messages?message=unavailable');
  }
  const conversationId = await ensureConversationBetween(
    user.id,
    parsed.data.recipientId,
  );
  if (!conversationId) {
    redirect('/me/messages?message=blocked');
  }
  const contextQuery =
    parsed.data.contextType !== 'profile' && parsed.data.contextId
      ? `?${new URLSearchParams({
          contextType: parsed.data.contextType,
          contextId: parsed.data.contextId,
        })}`
      : '';
  redirect(`/me/messages/${conversationId}${contextQuery}`);
}

const sendMessageSchema = z
  .object({
    conversationId: z.string().uuid(),
    body: messageBodySchema,
    contextType: z.enum(['listing', 'offer', 'exchange']).optional(),
    contextId: z.string().uuid().optional(),
  })
  .refine(
    (value) => Boolean(value.contextType) === Boolean(value.contextId),
    '上下文类型和 ID 必须同时提供。',
  );

function conversationPath(input: {
  conversationId: string;
  contextType?: 'listing' | 'offer' | 'exchange';
  contextId?: string;
  message?: string;
}) {
  const params = new URLSearchParams();
  if (input.contextType && input.contextId) {
    params.set('contextType', input.contextType);
    params.set('contextId', input.contextId);
  }
  if (input.message) params.set('message', input.message);
  const query = params.size ? `?${params}` : '';
  return `/me/messages/${input.conversationId}${query}`;
}

export async function sendMessageAction(formData: FormData) {
  const parsed = sendMessageSchema.safeParse({
    conversationId: formData.get('conversationId'),
    body: formData.get('body'),
    contextType: formData.get('contextType') || undefined,
    contextId: formData.get('contextId') || undefined,
  });
  if (!parsed.success) redirect('/me/messages?message=invalid');
  const user = await requireAuthUser(
    `/me/messages/${parsed.data.conversationId}`,
  );
  if (
    !consumeServerWrite(`${user.id}:message`, {
      limit: 30,
      windowMs: 60_000,
    }) ||
    !consumeServerWrite(`${user.id}:${parsed.data.conversationId}:message`, {
      limit: 10,
      windowMs: 60_000,
    })
  ) {
    redirect(conversationPath({ ...parsed.data, message: 'rate_limited' }));
  }
  const db = getDb();
  const conversation = (
    await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, parsed.data.conversationId),
          or(
            eq(directConversations.memberAId, user.id),
            eq(directConversations.memberBId, user.id),
          ),
        ),
      )
      .limit(1)
  )[0];
  if (!conversation) redirect('/me/messages?message=unavailable');
  const recipientId =
    conversation.memberAId === user.id
      ? conversation.memberBId
      : conversation.memberAId;
  const now = new Date();
  const sent = await db.transaction(async (tx) => {
    await lockUserPair(tx, user.id, recipientId);
    if (await areUsersBlockedInTransaction(tx, user.id, recipientId)) {
      return false;
    }
    const inserted = await tx
      .insert(directMessages)
      .values({
        conversationId: conversation.id,
        senderId: user.id,
        body: parsed.data.body,
      })
      .returning({ id: directMessages.id });
    await tx
      .update(directConversations)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(directConversations.id, conversation.id));
    await tx.insert(notifications).values({
      recipientId,
      actorId: user.id,
      type: 'message_received',
      conversationId: conversation.id,
      payload: { messageId: inserted[0]?.id },
    });
    return true;
  });
  if (!sent) {
    redirect(
      conversationPath({
        ...parsed.data,
        conversationId: conversation.id,
        message: 'blocked',
      }),
    );
  }
  revalidatePath('/me');
  revalidatePath('/me/messages');
  revalidatePath(`/me/messages/${conversation.id}`);
  redirect(conversationPath(parsed.data));
}

const conversationActionSchema = z.object({
  conversationId: z.string().uuid(),
});

export async function markConversationReadAction(formData: FormData) {
  const parsed = conversationActionSchema.safeParse({
    conversationId: formData.get('conversationId'),
  });
  if (!parsed.success) return;
  const user = await requireAuthUser(
    `/me/messages/${parsed.data.conversationId}`,
  );
  const conversation = (
    await getDb()
      .select({ id: directConversations.id })
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, parsed.data.conversationId),
          or(
            eq(directConversations.memberAId, user.id),
            eq(directConversations.memberBId, user.id),
          ),
        ),
      )
      .limit(1)
  )[0];
  if (!conversation) return;
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx
      .update(directMessages)
      .set({ readAt: now, updatedAt: now })
      .where(
        and(
          eq(directMessages.conversationId, conversation.id),
          ne(directMessages.senderId, user.id),
          isNull(directMessages.readAt),
        ),
      );
    await tx
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.recipientId, user.id),
          eq(notifications.conversationId, conversation.id),
          eq(notifications.type, 'message_received'),
          isNull(notifications.readAt),
        ),
      );
  });
  revalidatePath('/me');
  revalidatePath('/me/messages');
  revalidatePath('/me/notifications');
}

const blockSchema = z.object({
  targetUserId: z.string().uuid(),
  conversationId: z.string().uuid(),
  decision: z.enum(['block', 'unblock']),
});

export async function toggleUserBlockAction(formData: FormData) {
  const parsed = blockSchema.safeParse({
    targetUserId: formData.get('targetUserId'),
    conversationId: formData.get('conversationId'),
    decision: formData.get('decision'),
  });
  if (!parsed.success) redirect('/me/messages');
  const user = await requireAuthUser(
    `/me/messages/${parsed.data.conversationId}`,
  );
  const conversation = (
    await getDb()
      .select({ id: directConversations.id })
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, parsed.data.conversationId),
          or(
            and(
              eq(directConversations.memberAId, user.id),
              eq(directConversations.memberBId, parsed.data.targetUserId),
            ),
            and(
              eq(directConversations.memberAId, parsed.data.targetUserId),
              eq(directConversations.memberBId, user.id),
            ),
          ),
        ),
      )
      .limit(1)
  )[0];
  if (!conversation || user.id === parsed.data.targetUserId) {
    redirect('/me/messages');
  }
  await getDb().transaction(async (tx) => {
    await lockUserPair(tx, user.id, parsed.data.targetUserId);
    if (parsed.data.decision === 'block') {
      await tx
        .insert(userBlocks)
        .values({ blockerId: user.id, blockedId: parsed.data.targetUserId })
        .onConflictDoNothing({
          target: [userBlocks.blockerId, userBlocks.blockedId],
        });
    } else {
      await tx
        .delete(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerId, user.id),
            eq(userBlocks.blockedId, parsed.data.targetUserId),
          ),
        );
    }
  });
  revalidatePath(`/me/messages/${conversation.id}`);
  redirect(
    `/me/messages/${conversation.id}?message=${parsed.data.decision === 'block' ? 'blocked' : 'unblocked'}`,
  );
}
