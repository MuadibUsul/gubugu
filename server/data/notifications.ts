import 'server-only';

import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { notifications } from '@/drizzle/schema';
import {
  getProfileSummariesByUserIds,
  resolveCollectorLabel,
} from '@/server/data/profiles';
import { getDb } from '@/server/db/client';

const listNotificationsInputSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(48),
});

export type NotificationListItem = {
  id: string;
  type:
    | 'exchange_proposed'
    | 'exchange_accepted'
    | 'exchange_shipping'
    | 'exchange_received'
    | 'exchange_completed'
    | 'exchange_cancelled'
    | 'offer_received'
    | 'offer_countered'
    | 'offer_accepted'
    | 'offer_declined'
    | 'message_received'
    | 'watch_available'
    | 'report_resolved';
  actorLabel: string | null;
  exchangeId: string | null;
  conversationId: string | null;
  payload: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
};

export async function listNotificationsForUser(
  input: z.input<typeof listNotificationsInputSchema>,
): Promise<NotificationListItem[]> {
  const { userId, limit } = listNotificationsInputSchema.parse(input);
  const rows = await getDb()
    .select({
      id: notifications.id,
      type: notifications.type,
      actorId: notifications.actorId,
      exchangeId: notifications.exchangeId,
      conversationId: notifications.conversationId,
      payload: notifications.payload,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const profiles = await getProfileSummariesByUserIds(
    rows.flatMap((row) => (row.actorId ? [row.actorId] : [])),
  );

  return rows.map((row) => ({
    ...row,
    actorLabel: row.actorId
      ? resolveCollectorLabel(row.actorId, profiles)
      : null,
  }));
}
