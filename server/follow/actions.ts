'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { follows, profiles } from '@/drizzle/schema';
import { internalPathSchema } from '@/lib/internal-path';
import { requireAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';

const inputSchema = z.object({
  followingId: z.string().uuid(),
  nextPath: internalPathSchema,
});

export async function toggleFollowAction(formData: FormData) {
  const parsed = inputSchema.safeParse({
    followingId: formData.get('followingId'),
    nextPath: formData.get('nextPath'),
  });
  if (!parsed.success) return;
  const user = await requireAuthUser(parsed.data.nextPath);
  if (user.id === parsed.data.followingId) return;
  const db = getDb();
  const target = (
    await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, parsed.data.followingId))
      .limit(1)
  )[0];
  if (!target) return;
  const existing = await db
    .select()
    .from(follows)
    .where(
      and(
        eq(follows.followerId, user.id),
        eq(follows.followingId, parsed.data.followingId),
      ),
    )
    .limit(1);
  if (existing.length) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, user.id),
          eq(follows.followingId, parsed.data.followingId),
        ),
      );
  } else {
    await db
      .insert(follows)
      .values({ followerId: user.id, followingId: parsed.data.followingId })
      .onConflictDoNothing({
        target: [follows.followerId, follows.followingId],
      });
  }
  revalidatePath(parsed.data.nextPath);
}
