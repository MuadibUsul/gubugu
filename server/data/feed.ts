import 'server-only';

import { and, desc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { follows, goods, posts, profiles } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

const inputSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(48).default(24),
  page: z.number().int().min(1).default(1),
});

export async function listFollowingFeed(input: z.input<typeof inputSchema>) {
  const { userId, limit, page } = inputSchema.parse(input);
  return getDb()
    .select({
      id: posts.id,
      body: posts.body,
      createdAt: posts.createdAt,
      author: profiles.displayName,
      handle: profiles.handle,
      goodsName: goods.name,
      goodsSlug: goods.slug,
    })
    .from(follows)
    .innerJoin(posts, eq(follows.followingId, posts.userId))
    .innerJoin(profiles, eq(posts.userId, profiles.id))
    .innerJoin(goods, eq(posts.goodsId, goods.id))
    .where(
      and(
        eq(follows.followerId, userId),
        eq(posts.status, 'visible'),
        eq(posts.moderationStatus, 'approved'),
        eq(goods.status, 'published'),
        ne(profiles.visibility, 'private'),
      ),
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}
