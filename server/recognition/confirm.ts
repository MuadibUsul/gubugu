import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import {
  goods,
  recognitionAttempts,
  userGoods,
  userScans,
} from '@/drizzle/schema';
import {
  isRecognitionAttemptEligible,
  recognitionCandidateMapSchema,
} from '@/lib/recognition';
import { recordAchievementsForGoods } from '@/server/data/achievements';
import { getDb } from '@/server/db/client';

/**
 * 点亮的唯一入口。
 *
 * 高置信自动点亮与用户手动确认候选，走的是同一段事务：两者的差别只是候选 id 由
 * 谁选定，之后的资格校验、过期校验、幂等、SKU 解析、写入与审计都必须一致。此前
 * 自动点亮是在 Route Handler 里直接 upsert `user_goods` 的，既不进事务、不在
 * `recognition_attempts` 留确认记录，也漏掉了成就判定与缓存刷新——同一件事有两套
 * 实现，就一定会有一套是错的。
 *
 * 不变式：**goodsId 永远从锁定的 attempt 的 candidate_map 中解析**，绝不接受调用方
 * 传入的 SKU。浏览器拿不到、也不需要拿到 goodsId。
 */

export type RecognitionConfirmationErrorCode =
  | 'NOT_FOUND'
  | 'NOT_ELIGIBLE'
  | 'EXPIRED'
  | 'INVALID_CANDIDATE'
  | 'ALREADY_CONFIRMED'
  | 'GOODS_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type ConfirmRecognitionResult =
  | {
      success: true;
      goodsSlug: string;
      confirmedAt: string;
      alreadyConfirmed: boolean;
    }
  | {
      success: false;
      code: RecognitionConfirmationErrorCode;
      message: string;
    };

function failure(
  code: RecognitionConfirmationErrorCode,
  message: string,
): ConfirmRecognitionResult {
  return { success: false, code, message };
}

export async function confirmRecognitionAttempt({
  userId,
  requestId,
  candidateId,
  scanId,
}: {
  userId: string;
  requestId: string;
  candidateId: string;
  /** 由未鉴定项发起的确认：确认成功后把该扫描标记为已归属。 */
  scanId?: string;
}): Promise<ConfirmRecognitionResult> {
  const result = await getDb().transaction((tx) =>
    confirmRecognitionInTransaction(tx, {
      userId,
      requestId,
      candidateId,
      scanId,
    }),
  );

  if (!result.success) {
    return result;
  }

  if (!result.alreadyConfirmed && 'goodsId' in result) {
    try {
      await recordAchievementsForGoods({ userId, goodsId: result.goodsId });
    } catch (error) {
      // 成就判定失败不该让已经成立的点亮回滚——它在事务之外，本就是补充信息。
      console.error('[recognition] 点亮后的成就判定失败', error);
    }
  }

  revalidatePath(`/goods/${result.goodsSlug}`);
  revalidatePath('/me/collection');
  revalidatePath('/search');
  revalidatePath('/matches');
  revalidatePath('/');

  return {
    success: true,
    goodsSlug: result.goodsSlug,
    confirmedAt: result.confirmedAt,
    alreadyConfirmed: result.alreadyConfirmed,
  };
}

export type RecognitionTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>['transaction']>[0]
>[0];

/** Shared locked confirmation for single scans and atomic batch-item saves. */
export async function confirmRecognitionInTransaction(
  tx: RecognitionTransaction,
  {
    userId,
    requestId,
    candidateId,
    scanId,
  }: {
    userId: string;
    requestId: string;
    candidateId: string;
    scanId?: string;
  },
) {
  const attempt = (
    await tx
      .select({
        id: recognitionAttempts.id,
        source: recognitionAttempts.source,
        provider: recognitionAttempts.provider,
        candidateMap: recognitionAttempts.candidateMap,
        expiresAt: recognitionAttempts.expiresAt,
        confirmedCandidateId: recognitionAttempts.confirmedCandidateId,
        confirmedGoodsId: recognitionAttempts.confirmedGoodsId,
        confirmedAt: recognitionAttempts.confirmedAt,
      })
      .from(recognitionAttempts)
      .where(
        and(
          eq(recognitionAttempts.id, requestId),
          eq(recognitionAttempts.userId, userId),
        ),
      )
      .limit(1)
      // 行锁：同一次 attempt 的并发确认在这里串行化，避免重复点亮。
      .for('update')
  )[0];

  if (!attempt) {
    return failure('NOT_FOUND', '识别记录不存在或不属于当前账号。');
  }
  if (
    !isRecognitionAttemptEligible({
      source: attempt.source,
      provider: attempt.provider,
    })
  ) {
    return failure(
      'NOT_ELIGIBLE',
      '只有实时相机产生的真实图像匹配可以点亮收藏。',
    );
  }
  if (attempt.expiresAt.getTime() <= Date.now()) {
    return failure('EXPIRED', '这次识别已经过期，请重新扫描。');
  }

  // 幂等：重复提交同一候选返回既有结果，换候选则拒绝。
  if (attempt.confirmedAt) {
    if (
      attempt.confirmedCandidateId !== candidateId ||
      !attempt.confirmedGoodsId
    ) {
      return failure('ALREADY_CONFIRMED', '这次识别已经确认过其他候选。');
    }

    const confirmedGoods = (
      await tx
        .select({ slug: goods.slug })
        .from(goods)
        .where(eq(goods.id, attempt.confirmedGoodsId))
        .limit(1)
    )[0];

    if (confirmedGoods && scanId) {
      await tx
        .update(userScans)
        .set({ resolvedAt: attempt.confirmedAt, updatedAt: new Date() })
        .where(
          and(
            eq(userScans.id, scanId),
            eq(userScans.userId, userId),
            eq(userScans.recognitionAttemptId, requestId),
          ),
        );
    }
    return confirmedGoods
      ? {
          success: true as const,
          goodsSlug: confirmedGoods.slug,
          confirmedAt: attempt.confirmedAt.toISOString(),
          alreadyConfirmed: true,
        }
      : failure('GOODS_UNAVAILABLE', '对应的 SKU 已不可用。');
  }

  const candidateMap = recognitionCandidateMapSchema.safeParse(
    attempt.candidateMap,
  );
  if (!candidateMap.success) {
    return failure('INTERNAL_ERROR', '识别候选记录已损坏。');
  }
  const goodsId = candidateMap.data[candidateId];
  if (!goodsId) {
    return failure('INVALID_CANDIDATE', '该候选不属于这次识别。');
  }

  const selectedGoods = (
    await tx
      .select({ id: goods.id, slug: goods.slug })
      .from(goods)
      .where(and(eq(goods.id, goodsId), eq(goods.status, 'published')))
      .limit(1)
  )[0];
  if (!selectedGoods) {
    return failure('GOODS_UNAVAILABLE', '对应的 SKU 已不可用。');
  }

  const confirmedAt = new Date();

  await tx
    .insert(userGoods)
    .values({
      userId,
      goodsId: selectedGoods.id,
      status: 'owned',
      litAt: confirmedAt,
    })
    .onConflictDoUpdate({
      target: [userGoods.userId, userGoods.goodsId, userGoods.status],
      // 不改变数量，也保留第一次点亮时间。
      set: { litAt: sql`coalesce(${userGoods.litAt}, excluded.lit_at)` },
    });

  await tx
    .update(recognitionAttempts)
    .set({
      confirmedCandidateId: candidateId,
      confirmedGoodsId: selectedGoods.id,
      confirmedAt,
      updatedAt: confirmedAt,
    })
    .where(eq(recognitionAttempts.id, attempt.id));

  // 从未鉴定项确认而来：留下原图作识别审计，但不再显示为待鉴定。
  if (scanId) {
    await tx
      .update(userScans)
      .set({ resolvedAt: confirmedAt, updatedAt: confirmedAt })
      .where(
        and(
          eq(userScans.id, scanId),
          eq(userScans.userId, userId),
          eq(userScans.recognitionAttemptId, requestId),
        ),
      );
  }

  return {
    success: true as const,
    goodsId: selectedGoods.id,
    goodsSlug: selectedGoods.slug,
    confirmedAt: confirmedAt.toISOString(),
    alreadyConfirmed: false,
  };
}
