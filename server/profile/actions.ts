'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { profiles } from '@/drizzle/schema';
import { requireAuthUser } from '@/server/auth/session';
import { getProfileByUserId } from '@/server/data/profiles';
import { getDb } from '@/server/db/client';

const inputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  bio: z.string().trim().max(600),
  city: z.string().trim().max(64),
  visibility: z.enum(['public', 'followers', 'private']),
});

export async function updateProfileAction(formData: FormData) {
  const parsed = inputSchema.safeParse({
    displayName: formData.get('displayName'),
    bio: formData.get('bio'),
    city: formData.get('city'),
    visibility: formData.get('visibility'),
  });
  if (!parsed.success) return;
  const user = await requireAuthUser('/me/profile');
  const value = parsed.data;
  await getDb()
    .update(profiles)
    .set({
      ...value,
      bio: value.bio || null,
      city: value.city || null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));
  revalidatePath('/me/profile');
  const profile = await getProfileByUserId(user.id);
  if (profile) revalidatePath(`/users/${profile.handle}`);
  redirect('/me/profile?saved=1');
}
