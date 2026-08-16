import { z } from 'zod';

export const achievementKindValues = [
  'owned_count',
  'character_complete',
  'series_complete',
  'ip_complete',
] as const;

export const achievementKindSchema = z.enum(achievementKindValues);

export type AchievementKind = (typeof achievementKindValues)[number];

export type AchievementDefinition = {
  id: string;
  code: string;
  name: string;
  description: string;
  kind: AchievementKind;
  threshold: number | null;
};

export type AchievementUnlock = {
  achievementId: string;
  /** 角色 / 系列 / 作品的 id；`owned_count` 类为 null。 */
  scopeId: string | null;
};

/** 某个作用域（角色、系列或作品）下的收录进度。 */
export type ScopeProgress = {
  kind: Exclude<AchievementKind, 'owned_count'>;
  scopeId: string;
  ownedCount: number;
  totalCount: number;
};

type EvaluateInput = {
  definitions: readonly AchievementDefinition[];
  /** 全站累计已收录件数。 */
  ownedTotal: number;
  /** 本次操作触及的作用域进度。只算被触及的，不是全部。 */
  scopes: readonly ScopeProgress[];
  /** 已经解锁过的，避免重复。 */
  alreadyUnlocked: ReadonlySet<string>;
};

/**
 * 拼出解锁记录的去重键。scope 为 null 时也要有稳定的键，否则全局成就无法
 * 与作用域成就区分。
 */
export function unlockKey(achievementId: string, scopeId: string | null) {
  return `${achievementId}:${scopeId ?? ''}`;
}

/**
 * 判定这次变更带来了哪些新解锁。
 *
 * 纯函数：调用方负责查库与写入。这样判定规则本身可以直接测试，不需要数据库。
 */
export function evaluateAchievements({
  definitions,
  ownedTotal,
  scopes,
  alreadyUnlocked,
}: EvaluateInput): AchievementUnlock[] {
  const unlocks: AchievementUnlock[] = [];
  const seen = new Set(alreadyUnlocked);

  for (const definition of definitions) {
    if (definition.kind === 'owned_count') {
      // 阈值缺失的定义是坏数据，跳过而不是当成 0 件即达成。
      if (definition.threshold === null || definition.threshold <= 0) {
        continue;
      }

      if (ownedTotal < definition.threshold) {
        continue;
      }

      const key = unlockKey(definition.id, null);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unlocks.push({ achievementId: definition.id, scopeId: null });
      continue;
    }

    for (const scope of scopes) {
      if (scope.kind !== definition.kind) {
        continue;
      }

      // 一个还没有任何条目的作用域不算"已补全"，否则空系列会在第一次收藏时
      // 就把补全成就送出去。
      if (scope.totalCount <= 0 || scope.ownedCount < scope.totalCount) {
        continue;
      }

      const key = unlockKey(definition.id, scope.scopeId);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unlocks.push({ achievementId: definition.id, scopeId: scope.scopeId });
    }
  }

  return unlocks;
}
