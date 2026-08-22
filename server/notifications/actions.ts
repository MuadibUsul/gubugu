'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { notifications } from '@/drizzle/schema';
import { requireAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';

const markReadInputSchema = z.object({ notificationId: z.string().uuid() });

export async function markNotificationReadAction(formData: FormData) {
  const parsed = markReadInputSchema.safeParse({
    notificationId: formData.get('notificationId'),
  });
  if (!parsed.success) return;

  const user = await requireAuthUser('/me/notifications');
  const now = new Date();
  await getDb()
    .update(notifications)
    .set({ readAt: now, updatedAt: now })
    .where(
      and(
        eq(notifications.id, parsed.data.notificationId),
        eq(notifications.recipientId, user.id),
      ),
    );
  revalidatePath('/me/notifications');
}
