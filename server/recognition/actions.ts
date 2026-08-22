'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { goods, recognitionAttempts, userGoods } from '@/drizzle/schema';
import {
  confirmRecognitionCandidateInputSchema,
  isRecognitionAttemptEligible,
  recognitionCandidateMapSchema,
  type ConfirmRecognitionCandidateInput,
} from '@/lib/recognition';
import { consumeServerWrite } from '@/lib/rate-limit';
import { requireAuthUser } from '@/server/auth/session';
import { recordAchievementsForGoods } from '@/server/data/achievements';
import { getDb } from '@/server/db/client';

type RecognitionConfirmationErrorCode =
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'NOT_ELIGIBLE'
  | 'EXPIRED'
  | 'INVALID_CANDIDATE'
  | 'ALREADY_CONFIRMED'
  | 'GOODS_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type ConfirmRecognitionCandidateActionResult =
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
): ConfirmRecognitionCandidateActionResult {
  return { success: false, code, message };
}

/**
 * 确认服务端已经生成的识别候选。goodsId 永远从锁定的 attempt 中取得，不能由
 * 浏览器提交；同一次 attempt 的并发确认也会在行锁上串行化。
 */
export async function confirmRecognitionCandidateAction(
  input: ConfirmRecognitionCandidateInput,
): Promise<ConfirmRecognitionCandidateActionResult> {
  const parsed = confirmRecognitionCandidateInputSchema.safeParse(input);
  if (!parsed.success) {
    return failure('INVALID_INPUT', '识别确认参数无效。');
  }

  const user = await requireAuthUser('/recognition');
  if (
    !consumeServerWrite(`${user.id}:recognition-confirm`, {
      limit: 15,
      windowMs: 60_000,
    })
  ) {
    return failure('RATE_LIMITED', '确认操作过于频繁，请稍后重试。');
  }

  try {
    const result = await getDb().transaction(async (tx) => {
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
              eq(recognitionAttempts.id, parsed.data.requestId),
              eq(recognitionAttempts.userId, user.id),
            ),
          )
          .limit(1)
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

      if (attempt.confirmedAt) {
        if (
          attempt.confirmedCandidateId !== parsed.data.candidateId ||
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
      const goodsId = candidateMap.data[parsed.data.candidateId];
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
          userId: user.id,
          goodsId: selectedGoods.id,
          status: 'owned',
          litAt: confirmedAt,
        })
        .onConflictDoUpdate({
          target: [userGoods.userId, userGoods.goodsId, userGoods.status],
          // 不改变数量，也保留第一次点亮时间。
          set: {
            litAt: sql`coalesce(${userGoods.litAt}, excluded.lit_at)`,
          },
        });

      await tx
        .update(recognitionAttempts)
        .set({
          confirmedCandidateId: parsed.data.candidateId,
          confirmedGoodsId: selectedGoods.id,
          confirmedAt,
          updatedAt: confirmedAt,
        })
        .where(eq(recognitionAttempts.id, attempt.id));

      return {
        success: true as const,
        goodsId: selectedGoods.id,
        goodsSlug: selectedGoods.slug,
        confirmedAt: confirmedAt.toISOString(),
        alreadyConfirmed: false,
      };
    });

    if (!result.success) {
      return result;
    }

    if (!result.alreadyConfirmed && 'goodsId' in result) {
      try {
        await recordAchievementsForGoods({
          userId: user.id,
          goodsId: result.goodsId,
        });
      } catch (error) {
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
  } catch (error) {
    console.error('[recognition] 确认候选失败', error);
    return failure('INTERNAL_ERROR', '点亮收藏失败，请稍后重试。');
  }
}
