import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { profiles } from '@/drizzle/schema';
import { getDemoViewerByUserId } from '@/lib/config/demo-viewers';
import type { ProfileVisibility } from '@/lib/profile-visibility';
import { getDb } from '@/server/db/client';

export type ProfileSummary = {
  userId: string;
  handle: string;
  displayName: string;
  avatarImageUrl: string | null;
};

export type ProfileDetail = ProfileSummary & {
  bio: string | null;
  city: string | null;
  accentTitle: string | null;
  visibility: ProfileVisibility;
  collectionFramesPublic: boolean;
};

// Handles are stored lowercase and without the leading @, which is display
// only. Accept either spelling from a URL or a form.
export const profileHandleSchema = z
  .string()
  .trim()
  .min(1)
  .max(65)
  .transform((value) => value.replace(/^@/, '').toLowerCase());

const profileColumns = {
  userId: profiles.id,
  handle: profiles.handle,
  displayName: profiles.displayName,
  avatarImageUrl: profiles.avatarImageUrl,
  bio: profiles.bio,
  city: profiles.city,
  accentTitle: profiles.accentTitle,
  visibility: profiles.visibility,
  collectionFramesPublic: profiles.collectionFramesPublic,
};

export function formatProfileHandle(handle: string) {
  return `@${handle}`;
}

export async function getProfileByHandle(
  rawHandle: string,
): Promise<ProfileDetail | null> {
  const parsed = profileHandleSchema.safeParse(rawHandle);

  if (!parsed.success) {
    return null;
  }

  const rows = await getDb()
    .select(profileColumns)
    .from(profiles)
    .where(eq(profiles.handle, parsed.data))
    .limit(1);

  return rows[0] ?? null;
}

export async function getProfileByUserId(
  userId: string,
): Promise<ProfileDetail | null> {
  if (!z.string().uuid().safeParse(userId).success) {
    return null;
  }

  const rows = await getDb()
    .select(profileColumns)
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Resolves author identity for a batch of user ids in one query, so callers
 * rendering a list of posts or listings do not issue one lookup per row.
 *
 * Users without a profile row still need a label, so unresolved ids fall back
 * to the local demo viewers and then to a truncated id.
 */
export async function getProfileSummariesByUserIds(
  userIds: string[],
): Promise<Map<string, ProfileSummary>> {
  const uniqueIds = Array.from(new Set(userIds)).filter(
    (id) => z.string().uuid().safeParse(id).success,
  );

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await getDb()
    .select({
      userId: profiles.id,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarImageUrl: profiles.avatarImageUrl,
    })
    .from(profiles)
    .where(inArray(profiles.id, uniqueIds));

  return new Map(rows.map((row) => [row.userId, row]));
}

export function resolveCollectorLabel(
  userId: string,
  summaries?: Map<string, ProfileSummary>,
) {
  return (
    summaries?.get(userId)?.displayName ??
    getDemoViewerByUserId(userId)?.displayName ??
    `收藏者 ${userId.slice(0, 8)}`
  );
}
