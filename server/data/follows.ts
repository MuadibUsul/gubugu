import 'server-only';

import { and, count, desc, eq, inArray } from 'drizzle-orm';

import { follows, profiles } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export async function isFollowing(
  followerId: string | null,
  followingId: string,
) {
  if (!followerId || followerId === followingId) return false;
  const rows = await getDb()
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getFollowNetwork(
  userId: string,
  {
    followingPage = 1,
    followersPage = 1,
    pageSize = 12,
  }: {
    followingPage?: number;
    followersPage?: number;
    pageSize?: number;
  } = {},
) {
  const db = getDb();
  const safeFollowingPage = Math.max(1, Math.trunc(followingPage));
  const safeFollowersPage = Math.max(1, Math.trunc(followersPage));
  const safePageSize = Math.min(48, Math.max(1, Math.trunc(pageSize)));
  const [followingRows, followerRows, followingCount, followerCount] =
    await Promise.all([
      db
        .select({ userId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId))
        .orderBy(desc(follows.createdAt))
        .limit(safePageSize)
        .offset((safeFollowingPage - 1) * safePageSize),
      db
        .select({ userId: follows.followerId })
        .from(follows)
        .where(eq(follows.followingId, userId))
        .orderBy(desc(follows.createdAt))
        .limit(safePageSize)
        .offset((safeFollowersPage - 1) * safePageSize),
      db
        .select({ value: count() })
        .from(follows)
        .where(eq(follows.followerId, userId)),
      db
        .select({ value: count() })
        .from(follows)
        .where(eq(follows.followingId, userId)),
    ]);
  const ids = Array.from(
    new Set([...followingRows, ...followerRows].map((row) => row.userId)),
  );
  const profileRows = ids.length
    ? await db
        .select({
          userId: profiles.id,
          handle: profiles.handle,
          displayName: profiles.displayName,
        })
        .from(profiles)
        .where(inArray(profiles.id, ids))
    : [];
  const byId = new Map(profileRows.map((row) => [row.userId, row]));
  return {
    following: followingRows.flatMap((row) => byId.get(row.userId) ?? []),
    followers: followerRows.flatMap((row) => byId.get(row.userId) ?? []),
    followingTotal: followingCount[0]?.value ?? 0,
    followersTotal: followerCount[0]?.value ?? 0,
    followingPage: safeFollowingPage,
    followersPage: safeFollowersPage,
    pageSize: safePageSize,
  };
}

export async function getFollowingIdsAmong(
  followerId: string,
  followingIds: string[],
) {
  const uniqueIds = Array.from(new Set(followingIds));
  if (uniqueIds.length === 0) return new Set<string>();

  const rows = await getDb()
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        inArray(follows.followingId, uniqueIds),
      ),
    );
  return new Set(rows.map((row) => row.followingId));
}

export async function getFollowCounts(userId: string) {
  const db = getDb();
  const [followingRows, followerRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followerId, userId)),
    db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followingId, userId)),
  ]);
  return {
    following: followingRows[0]?.value ?? 0,
    followers: followerRows[0]?.value ?? 0,
  };
}
