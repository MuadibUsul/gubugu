import 'server-only';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { postImages, posts } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export async function getPostImageAccess(
  imageId: string,
  viewerId?: string,
  allowPending = false,
) {
  if (!z.string().uuid().safeParse(imageId).success) return null;

  const row = (
    await getDb()
      .select({
        assetKey: postImages.storagePath,
        imageStatus: postImages.status,
        imageModerationStatus: postImages.moderationStatus,
        postStatus: posts.status,
        postModerationStatus: posts.moderationStatus,
        ownerId: posts.userId,
      })
      .from(postImages)
      .innerJoin(posts, eq(postImages.postId, posts.id))
      .where(and(eq(postImages.id, imageId)))
      .limit(1)
  )[0];
  if (!row?.assetKey) return null;

  const isPublic =
    row.imageStatus === 'visible' &&
    row.imageModerationStatus === 'approved' &&
    row.postStatus === 'visible' &&
    row.postModerationStatus === 'approved';

  return isPublic || row.ownerId === viewerId || allowPending
    ? { ...row, isPublic }
    : null;
}
