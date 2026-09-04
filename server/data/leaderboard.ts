import 'server-only';

import { unstable_cache } from 'next/cache';
import { and, eq, isNotNull, sql } from 'drizzle-orm';

import {
  goods,
  ips,
  profiles,
  series,
  userAchievements,
  userGoods,
} from '@/drizzle/schema';
import { getDb } from '@/server/db/client';
import {
  rankLeaderboard,
  type LeaderboardDimension,
  type Ranked,
} from '@/lib/leaderboard';

export type LeaderboardMetrics = {
  lit: number;
  breadth: number;
  works: number;
  momentum: number;
  badges: number;
};

export type LeaderboardEntry = Ranked<{
  userId: string;
  handle: string;
  displayName: string;
  avatarImageUrl: string | null;
  accentTitle: string | null;
  city: string | null;
  value: number;
  metrics: LeaderboardMetrics;
}>;

const MOMENTUM_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// 排行榜是滞后视图：每次请求全量算所有公开用户的指标再排序，成本随用户增长。点亮 / 成就 /
// 可见性会在多处 action 里变化，精确失效不划算，改用短窗口时间缓存——60 秒陈旧对榜单无感知。
const LEADERBOARD_REVALIDATE_SECONDS = 60;

/**
 * 某个维度的收藏排行榜。只有公开资料的用户参与（复用资料可见性）；点亮才计数。
 *
 * 现规模下一次算清所有公开用户的四项收藏指标 + 徽章数，再在内存里定名次取前 N。
 * 用户规模变大后可改为在 SQL 里按选定维度 order+limit，或预计算物化，不必现在拆。
 */
export async function getLeaderboard(
  dimension: LeaderboardDimension,
  options: { limit?: number } = {},
): Promise<LeaderboardEntry[]> {
  const limit = options.limit ?? 50;

  return unstable_cache(
    () => getLeaderboardUncached(dimension, limit),
    ['leaderboard', dimension, `${limit}`],
    { revalidate: LEADERBOARD_REVALIDATE_SECONDS },
  )();
}

async function getLeaderboardUncached(
  dimension: LeaderboardDimension,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const db = getDb();

  const published = and(
    eq(goods.status, 'published'),
    eq(series.status, 'published'),
    eq(ips.status, 'published'),
  );
  const litOwned = and(
    eq(userGoods.status, 'owned'),
    isNotNull(userGoods.litAt),
  );
  const momentumCutoff = new Date(Date.now() - MOMENTUM_WINDOW_MS);

  const collectionRows = await db
    .select({
      userId: profiles.id,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarImageUrl: profiles.avatarImageUrl,
      accentTitle: profiles.accentTitle,
      city: profiles.city,
      lit: sql<number>`count(*)::int`,
      breadth: sql<number>`count(distinct ${goods.goodsType})::int`,
      works: sql<number>`count(distinct ${series.ipId})::int`,
      momentum: sql<number>`count(*) filter (where ${userGoods.litAt} >= ${momentumCutoff})::int`,
    })
    .from(profiles)
    .innerJoin(userGoods, and(eq(userGoods.userId, profiles.id), litOwned))
    .innerJoin(goods, eq(goods.id, userGoods.goodsId))
    .innerJoin(series, eq(series.id, goods.seriesId))
    .innerJoin(ips, eq(ips.id, series.ipId))
    .where(and(eq(profiles.visibility, 'public'), published))
    .groupBy(profiles.id);

  const badgeRows = await db
    .select({
      userId: userAchievements.userId,
      badges: sql<number>`count(*)::int`,
    })
    .from(userAchievements)
    .groupBy(userAchievements.userId);
  const badgesByUser = new Map(
    badgeRows.map((row) => [row.userId, row.badges]),
  );

  const enriched = collectionRows.map((row) => {
    const metrics: LeaderboardMetrics = {
      lit: row.lit,
      breadth: row.breadth,
      works: row.works,
      momentum: row.momentum,
      badges: badgesByUser.get(row.userId) ?? 0,
    };

    return {
      userId: row.userId,
      handle: row.handle,
      displayName: row.displayName,
      avatarImageUrl: row.avatarImageUrl,
      accentTitle: row.accentTitle,
      city: row.city,
      value: metrics[dimension],
      metrics,
    };
  });

  return rankLeaderboard(enriched).slice(0, limit);
}
