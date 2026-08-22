import 'server-only';

import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { z } from 'zod';

import {
  directConversations,
  directMessages,
  exchangeOffers,
  exchanges,
  userBlocks,
} from '@/drizzle/schema';
import { conversationPartner } from '@/lib/messages';
import {
  getProfileSummariesByUserIds,
  resolveCollectorLabel,
} from '@/server/data/profiles';
import { getDb } from '@/server/db/client';

export type ConversationListItem = {
  id: string;
  partnerId: string;
  partnerLabel: string;
  partnerHandle: string | null;
  latestMessage: string | null;
  latestMessageAt: Date | null;
  latestMessageIsOwn: boolean;
  unreadCount: number;
  updatedAt: Date;
};

export async function listConversationsForUser(input: {
  userId: string;
  limit?: number;
}): Promise<ConversationListItem[]> {
  const parsed = z
    .object({
      userId: z.string().uuid(),
      limit: z.number().int().min(1).max(60).default(40),
    })
    .safeParse(input);
  if (!parsed.success) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(directConversations)
    .where(
      and(
        or(
          eq(directConversations.memberAId, parsed.data.userId),
          eq(directConversations.memberBId, parsed.data.userId),
        ),
        isNotNull(directConversations.lastMessageAt),
      ),
    )
    .orderBy(
      desc(directConversations.lastMessageAt),
      desc(directConversations.updatedAt),
    )
    .limit(parsed.data.limit);
  if (!rows.length) return [];

  const conversationIds = rows.map((row) => row.id);
  const [latestRows, unreadRows, profiles] = await Promise.all([
    db
      .selectDistinctOn([directMessages.conversationId], {
        conversationId: directMessages.conversationId,
        body: directMessages.body,
        senderId: directMessages.senderId,
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(
        and(
          inArray(directMessages.conversationId, conversationIds),
          eq(directMessages.status, 'visible'),
        ),
      )
      .orderBy(directMessages.conversationId, desc(directMessages.createdAt)),
    db
      .select({
        conversationId: directMessages.conversationId,
        count: sql<number>`count(*)::int`,
      })
      .from(directMessages)
      .where(
        and(
          inArray(directMessages.conversationId, conversationIds),
          ne(directMessages.senderId, parsed.data.userId),
          isNull(directMessages.readAt),
          eq(directMessages.status, 'visible'),
        ),
      )
      .groupBy(directMessages.conversationId),
    getProfileSummariesByUserIds(
      rows.flatMap((row) => [row.memberAId, row.memberBId]),
    ),
  ]);
  const latestByConversation = new Map(
    latestRows.map((row) => [row.conversationId, row]),
  );
  const unreadByConversation = new Map(
    unreadRows.map((row) => [row.conversationId, row.count]),
  );

  return rows.flatMap((row) => {
    const partnerId = conversationPartner(
      row.memberAId,
      row.memberBId,
      parsed.data.userId,
    );
    if (!partnerId) return [];
    const latest = latestByConversation.get(row.id);
    const partner = profiles.get(partnerId);
    return [
      {
        id: row.id,
        partnerId,
        partnerLabel: resolveCollectorLabel(partnerId, profiles),
        partnerHandle: partner?.handle ?? null,
        latestMessage: latest?.body ?? null,
        latestMessageAt: latest?.createdAt ?? row.lastMessageAt,
        latestMessageIsOwn: latest?.senderId === parsed.data.userId,
        unreadCount: unreadByConversation.get(row.id) ?? 0,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

export async function countUnreadMessages(userId: string) {
  if (!z.string().uuid().safeParse(userId).success) return 0;
  const result = (
    await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(directMessages)
      .innerJoin(
        directConversations,
        eq(directMessages.conversationId, directConversations.id),
      )
      .where(
        and(
          or(
            eq(directConversations.memberAId, userId),
            eq(directConversations.memberBId, userId),
          ),
          ne(directMessages.senderId, userId),
          isNull(directMessages.readAt),
          eq(directMessages.status, 'visible'),
        ),
      )
  )[0];
  return result?.count ?? 0;
}

export async function getConversationThread(input: {
  conversationId: string;
  viewerId: string;
  limit?: number;
}) {
  const parsed = z
    .object({
      conversationId: z.string().uuid(),
      viewerId: z.string().uuid(),
      limit: z.number().int().min(1).max(160).default(100),
    })
    .safeParse(input);
  if (!parsed.success) return null;
  const db = getDb();
  // The owner DB role bypasses RLS, so participant filtering belongs in SQL.
  const conversation = (
    await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, parsed.data.conversationId),
          or(
            eq(directConversations.memberAId, parsed.data.viewerId),
            eq(directConversations.memberBId, parsed.data.viewerId),
          ),
        ),
      )
      .limit(1)
  )[0];
  if (!conversation) return null;
  const partnerId = conversationPartner(
    conversation.memberAId,
    conversation.memberBId,
    parsed.data.viewerId,
  );
  if (!partnerId) return null;

  const [messages, profiles, blockRows, offerRows, exchangeRows] =
    await Promise.all([
      db
        .select()
        .from(directMessages)
        .where(
          and(
            eq(directMessages.conversationId, conversation.id),
            eq(directMessages.status, 'visible'),
          ),
        )
        .orderBy(desc(directMessages.createdAt))
        .limit(parsed.data.limit),
      getProfileSummariesByUserIds([parsed.data.viewerId, partnerId]),
      db
        .select()
        .from(userBlocks)
        .where(
          or(
            and(
              eq(userBlocks.blockerId, parsed.data.viewerId),
              eq(userBlocks.blockedId, partnerId),
            ),
            and(
              eq(userBlocks.blockerId, partnerId),
              eq(userBlocks.blockedId, parsed.data.viewerId),
            ),
          ),
        ),
      db
        .select({ id: exchangeOffers.id, status: exchangeOffers.status })
        .from(exchangeOffers)
        .where(
          and(
            eq(exchangeOffers.status, 'pending'),
            or(
              and(
                eq(exchangeOffers.proposerId, parsed.data.viewerId),
                eq(exchangeOffers.recipientId, partnerId),
              ),
              and(
                eq(exchangeOffers.proposerId, partnerId),
                eq(exchangeOffers.recipientId, parsed.data.viewerId),
              ),
            ),
          ),
        )
        .orderBy(desc(exchangeOffers.updatedAt))
        .limit(1),
      db
        .select({ id: exchanges.id, status: exchanges.status })
        .from(exchanges)
        .where(
          or(
            and(
              eq(exchanges.initiatorId, parsed.data.viewerId),
              eq(exchanges.recipientId, partnerId),
            ),
            and(
              eq(exchanges.initiatorId, partnerId),
              eq(exchanges.recipientId, parsed.data.viewerId),
            ),
          ),
        )
        .orderBy(desc(exchanges.updatedAt))
        .limit(1),
    ]);
  const blockedByViewer = blockRows.some(
    (row) => row.blockerId === parsed.data.viewerId,
  );
  const blockedByPartner = blockRows.some((row) => row.blockerId === partnerId);
  const partner = profiles.get(partnerId);

  return {
    id: conversation.id,
    partnerId,
    partnerLabel: resolveCollectorLabel(partnerId, profiles),
    partnerHandle: partner?.handle ?? null,
    blockedByViewer,
    blockedByPartner,
    messages: messages.reverse().map((message) => ({
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      readAt: message.readAt,
      createdAt: message.createdAt,
    })),
    activeOfferId: offerRows[0]?.id ?? null,
    recentExchangeId: exchangeRows[0]?.id ?? null,
    recentExchangeStatus: exchangeRows[0]?.status ?? null,
  };
}
