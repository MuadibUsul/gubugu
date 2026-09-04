'use server';

import {
  confirmRecognitionCandidateInputSchema,
  type ConfirmRecognitionCandidateInput,
} from '@/lib/recognition';
import { consumeServerWrite } from '@/lib/rate-limit';
import { requireAuthUser } from '@/server/auth/session';
import {
  confirmRecognitionAttempt,
  type RecognitionConfirmationErrorCode,
} from '@/server/recognition/confirm';

type ActionErrorCode =
  | RecognitionConfirmationErrorCode
  | 'INVALID_INPUT'
  | 'RATE_LIMITED';

export type ConfirmRecognitionCandidateActionResult =
  | {
      success: true;
      goodsSlug: string;
      confirmedAt: string;
      alreadyConfirmed: boolean;
    }
  | {
      success: false;
      code: ActionErrorCode;
      message: string;
    };

/**
 * 用户从候选中确认一个 SKU。
 *
 * 这里只做「请求层」的事：入参校验、登录、限流。点亮本身连同资格校验、幂等与审计
 * 都在 confirmRecognitionAttempt 里，和高置信自动点亮共用同一段事务——两条路径不
 * 允许各写一份。
 */
export async function confirmRecognitionCandidateAction(
  input: ConfirmRecognitionCandidateInput,
): Promise<ConfirmRecognitionCandidateActionResult> {
  const parsed = confirmRecognitionCandidateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'INVALID_INPUT',
      message: '识别确认参数无效。',
    };
  }

  const user = await requireAuthUser('/recognition');
  if (
    !consumeServerWrite(`${user.id}:recognition-confirm`, {
      limit: 15,
      windowMs: 60_000,
    })
  ) {
    return {
      success: false,
      code: 'RATE_LIMITED',
      message: '确认操作过于频繁，请稍后重试。',
    };
  }

  try {
    return await confirmRecognitionAttempt({
      userId: user.id,
      requestId: parsed.data.requestId,
      candidateId: parsed.data.candidateId,
      scanId: parsed.data.scanId,
    });
  } catch (error) {
    console.error('[recognition] 确认候选失败', error);
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: '点亮收藏失败，请稍后重试。',
    };
  }
}
