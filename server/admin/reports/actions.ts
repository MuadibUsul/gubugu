'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  directMessages,
  exchangeListings,
  exchangeOffers,
  notifications,
  reports,
} from '@/drizzle/schema';
import { requireModeratorAccess } from '@/server/auth/admin';
import { getDb } from '@/server/db/client';

const schema = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(['resolved', 'rejected']),
  note: z.string().trim().max(500),
});
export async function resolveReportAction(formData: FormData) {
  const moderator = await requireModeratorAccess('/admin/moderation');
  const parsed = schema.safeParse({
    reportId: formData.get('reportId'),
    decision: formData.get('decision'),
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) return;
  const db = getDb();
  const report = (
    await db
      .select()
      .from(reports)
      .where(eq(reports.id, parsed.data.reportId))
      .limit(1)
  )[0];
  if (!report || report.status !== 'pending') return;
  const now = new Date();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(reports)
      .set({
        status: parsed.data.decision,
        resolutionNote: parsed.data.note || null,
        resolvedBy: moderator.id,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(and(eq(reports.id, report.id), eq(reports.status, 'pending')))
      .returning({ id: reports.id });
    if (updated.length > 0) {
      if (
        parsed.data.decision === 'resolved' &&
        report.targetType === 'message'
      ) {
        await tx
          .update(directMessages)
          .set({ status: 'hidden', updatedAt: now })
          .where(eq(directMessages.id, report.targetId));
      }
      if (
        parsed.data.decision === 'resolved' &&
        report.targetType === 'exchange_listing'
      ) {
        await tx
          .update(exchangeListings)
          .set({
            status: 'closed',
            moderationStatus: 'rejected',
            reviewNote: parsed.data.note || null,
            reviewedBy: moderator.id,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(exchangeListings.id, report.targetId));
        const expired = await tx
          .update(exchangeOffers)
          .set({ status: 'expired', decidedAt: now, updatedAt: now })
          .where(
            and(
              eq(exchangeOffers.listingId, report.targetId),
              eq(exchangeOffers.status, 'pending'),
            ),
          )
          .returning({
            id: exchangeOffers.id,
            proposerId: exchangeOffers.proposerId,
          });
        if (expired.length) {
          await tx.insert(notifications).values(
            expired.map((offer) => ({
              recipientId: offer.proposerId,
              actorId: moderator.id,
              type: 'offer_declined' as const,
              payload: {
                offerId: offer.id,
                listingId: report.targetId,
                reason: 'listing_moderated',
              },
            })),
          );
        }
      }
      await tx.insert(notifications).values({
        recipientId: report.reporterId,
        actorId: moderator.id,
        type: 'report_resolved',
        payload: { reportId: report.id, decision: parsed.data.decision },
      });
    }
  });
  revalidatePath('/admin/moderation');
}
