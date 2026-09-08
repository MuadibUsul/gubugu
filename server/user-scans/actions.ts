'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { userScans } from '@/drizzle/schema';
import { requireAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';

const updateUserScanNoteSchema = z.object({
  scanId: z.string().uuid(),
  note: z.string().trim().max(500),
});

export async function updateUserScanNoteAction(formData: FormData) {
  const input = updateUserScanNoteSchema.safeParse({
    scanId: formData.get('scanId'),
    note: formData.get('note'),
  });
  if (!input.success) return;

  const user = await requireAuthUser('/me/collection');
  await getDb()
    .update(userScans)
    .set({ note: input.data.note || null, updatedAt: new Date() })
    .where(
      and(eq(userScans.id, input.data.scanId), eq(userScans.userId, user.id)),
    );
  revalidatePath('/me/collection');
}
