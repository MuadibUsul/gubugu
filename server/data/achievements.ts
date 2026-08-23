import 'server-only';

import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import {
  evaluateAchievements,
  unlockKey,
  type AchievementDefinition,
  type ScopeProgress,
} from '@/lib/achievements';
import {
  achievements,
  goods,
  goodsCharacters,
  ips,
  series,
  userAchievements,
  userGoods,
} from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export type RecordedUnlock = {
  code: string;
  name: string;
  description: string;
};

/**
 * 只统计已发布的条目。草稿和归档不该计入分母，否则补全度会被后台的未发布
 * 记录拖住，用户永远差最后一件。
 */
const publishedGoods = and(
  eq(goods.status, 'published'),
  eq(series.status, 'published'),
  eq(ips.status, 'published'),
);

async function loadScopeProgress(
  db: ReturnType<typeof getDb>,
  userId: string,
  goodsId: string,
): Promise<ScopeProgress[]> {
  // 只看这次操作触及的作用域 —— 改一件商品不该扫全库。
  const [touched] = await db
    .select({ seriesId: goods.seriesId, ipId: series.ipId })
    .from(goods)
    .innerJoin(series, eq(series.id, goods.seriesId))
    .where(eq(goods.id, goodsId))
    .limit(1);

  if (!touched) {
    return [];
  }

  const characterRows = await db
    .select({ characterId: goodsCharacters.characterId })
    .from(goodsCharacters)
    .where(eq(goodsCharacters.goodsId, goodsId));

  const characterIds = characterRows.map((row) => row.characterId);

  const scopes: ScopeProgress[] = [];

  // 角色：一件商品可以关联多个角色，逐个统计。
  for (const characterId of characterIds) {
    const [row] = await db
      .select({
        total: sql<number>`count(distinct ${goods.id})::int`,
        owned: sql<number>`count(distinct ${userGoods.goodsId})::int`,
      })
      .from(goodsCharacters)
      .innerJoin(goods, eq(goods.id, goodsCharacters.goodsId))
      .innerJoin(series, eq(series.id, goods.seriesId))
      .innerJoin(ips, eq(ips.id, series.ipId))
      .leftJoin(
        userGoods,
        and(
          eq(userGoods.goodsId, goods.id),
          eq(userGoods.userId, userId),
          eq(userGoods.status, 'owned'),
          isNotNull(userGoods.litAt),
        ),
      )
      .where(and(eq(goodsCharacters.characterId, characterId), publishedGoods));

    if (row) {
      scopes.push({
        kind: 'character_complete',
        scopeId: characterId,
        ownedCount: row.owned,
        totalCount: row.total,
      });
    }
  }

  const [seriesRow] = await db
    .select({
      total: sql<number>`count(distinct ${goods.id})::int`,
      owned: sql<number>`count(distinct ${userGoods.goodsId})::int`,
    })
    .from(goods)
    .innerJoin(series, eq(series.id, goods.seriesId))
    .innerJoin(ips, eq(ips.id, series.ipId))
    .leftJoin(
      userGoods,
      and(
        eq(userGoods.goodsId, goods.id),
        eq(userGoods.userId, userId),
        eq(userGoods.status, 'owned'),
        isNotNull(userGoods.litAt),
      ),
    )
    .where(and(eq(goods.seriesId, touched.seriesId), publishedGoods));

  if (seriesRow) {
    scopes.push({
      kind: 'series_complete',
      scopeId: touched.seriesId,
      ownedCount: seriesRow.owned,
      totalCount: seriesRow.total,
    });
  }

  const [ipRow] = await db
    .select({
      total: sql<number>`count(distinct ${goods.id})::int`,
      owned: sql<number>`count(distinct ${userGoods.goodsId})::int`,
    })
    .from(goods)
    .innerJoin(series, eq(series.id, goods.seriesId))
    .innerJoin(ips, eq(ips.id, series.ipId))
    .leftJoin(
      userGoods,
      and(
        eq(userGoods.goodsId, goods.id),
        eq(userGoods.userId, userId),
        eq(userGoods.status, 'owned'),
        isNotNull(userGoods.litAt),
      ),
    )
    .where(and(eq(series.ipId, touched.ipId), publishedGoods));

  if (ipRow) {
    scopes.push({
      kind: 'ip_complete',
      scopeId: touched.ipId,
      ownedCount: ipRow.owned,
      totalCount: ipRow.total,
    });
  }

  return scopes;
}

/**
 * 在收藏状态变更后判定并落记解锁。
 *
 * 返回本次新达成的记录，供界面展示。判定错误不应该让收藏动作失败 —— 调用方
 * 会吞掉异常，因为「标记为已拥有」比「記録」重要。
 */
export async function recordAchievementsForGoods({
  userId,
  goodsId,
}: {
  userId: string;
  goodsId: string;
}): Promise<RecordedUnlock[]> {
  const db = getDb();

  const definitionRows = await db
    .select({
      id: achievements.id,
      code: achievements.code,
      name: achievements.name,
      description: achievements.description,
      kind: achievements.kind,
      threshold: achievements.threshold,
    })
    .from(achievements);

  if (definitionRows.length === 0) {
    return [];
  }

  const definitions: AchievementDefinition[] = definitionRows;

  const [ownedRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      // 品类广度：已点亮收藏覆盖的不同 goods_type 数量。
      typeBreadth: sql<number>`count(distinct ${goods.goodsType})::int`,
    })
    .from(userGoods)
    .innerJoin(goods, eq(goods.id, userGoods.goodsId))
    .innerJoin(series, eq(series.id, goods.seriesId))
    .innerJoin(ips, eq(ips.id, series.ipId))
    .where(
      and(
        eq(userGoods.userId, userId),
        eq(userGoods.status, 'owned'),
        isNotNull(userGoods.litAt),
        publishedGoods,
      ),
    );

  const existing = await db
    .select({
      achievementId: userAchievements.achievementId,
      scopeId: userAchievements.scopeId,
    })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const alreadyUnlocked = new Set(
    existing.map((row) => unlockKey(row.achievementId, row.scopeId)),
  );

  const scopes = await loadScopeProgress(db, userId, goodsId);

  const unlocks = evaluateAchievements({
    definitions,
    ownedTotal: ownedRow?.total ?? 0,
    typeBreadthTotal: ownedRow?.typeBreadth ?? 0,
    scopes,
    alreadyUnlocked,
  });

  if (unlocks.length === 0) {
    return [];
  }

  // 并发的两次收藏可能同时判出同一条记录，唯一索引会挡住第二次写入；忽略
  // 冲突比让收藏动作报错要好。
  const inserted = await db
    .insert(userAchievements)
    .values(
      unlocks.map((unlock) => ({
        userId,
        achievementId: unlock.achievementId,
        scopeId: unlock.scopeId,
      })),
    )
    .onConflictDoNothing()
    .returning({ achievementId: userAchievements.achievementId });

  if (inserted.length === 0) {
    return [];
  }

  const insertedIds = new Set(inserted.map((row) => row.achievementId));

  return definitions
    .filter((definition) => insertedIds.has(definition.id))
    .map((definition) => ({
      code: definition.code,
      name: definition.name,
      description: definition.description,
    }));
}

export type LedgerEntry = {
  code: string;
  name: string;
  description: string;
  kind: AchievementDefinition['kind'];
  threshold: number | null;
  achievedAt: Date | null;
  /** 同一条成就可以在多个作用域上达成，这里是达成次数。 */
  achievedCount: number;
};

/** 収蔵記録：全部定义，加上这位用户的达成情况。 */
export async function listAchievementLedger(
  userId: string | null,
): Promise<LedgerEntry[]> {
  const db = getDb();

  const definitions = await db
    .select({
      id: achievements.id,
      code: achievements.code,
      name: achievements.name,
      description: achievements.description,
      kind: achievements.kind,
      threshold: achievements.threshold,
      sortOrder: achievements.sortOrder,
    })
    .from(achievements)
    .orderBy(achievements.sortOrder, achievements.code);

  if (definitions.length === 0) {
    return [];
  }

  if (!userId) {
    return definitions.map((definition) => ({
      code: definition.code,
      name: definition.name,
      description: definition.description,
      kind: definition.kind,
      threshold: definition.threshold,
      achievedAt: null,
      achievedCount: 0,
    }));
  }

  const unlocks = await db
    .select({
      achievementId: userAchievements.achievementId,
      achievedAt: userAchievements.achievedAt,
    })
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, userId),
        inArray(
          userAchievements.achievementId,
          definitions.map((definition) => definition.id),
        ),
      ),
    );

  const byAchievement = new Map<string, { first: Date; count: number }>();

  for (const unlock of unlocks) {
    const current = byAchievement.get(unlock.achievementId);

    if (!current) {
      byAchievement.set(unlock.achievementId, {
        first: unlock.achievedAt,
        count: 1,
      });
      continue;
    }

    current.count += 1;

    if (unlock.achievedAt < current.first) {
      current.first = unlock.achievedAt;
    }
  }

  return definitions.map((definition) => {
    const unlock = byAchievement.get(definition.id);

    return {
      code: definition.code,
      name: definition.name,
      description: definition.description,
      kind: definition.kind,
      threshold: definition.threshold,
      achievedAt: unlock?.first ?? null,
      achievedCount: unlock?.count ?? 0,
    };
  });
}
