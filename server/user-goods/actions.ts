'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  sortUserGoodsStatuses,
  userGoodsStatusMeta,
  userGoodsStatusSchema,
  type UserGoodsStatus,
} from '@/lib/user-goods-status';
import {
  recordAchievementsForGoods,
  type RecordedUnlock,
} from '@/server/data/achievements';
import {
  getUserGoodsStateFlags,
  toggleUserGoodsStatus,
} from '@/server/data/user-goods';
import { requireAuthUser } from '@/server/auth/session';

const toggleUserGoodsStatusInputSchema = z.object({
  goodsId: z.string().uuid(),
  status: userGoodsStatusSchema,
  nextPath: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((value) => value.startsWith('/'), {
      message: 'nextPath 必须是站内路径。',
    }),
});

export type ToggleUserGoodsStatusActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  activeStatuses: UserGoodsStatus[];
  /** 本次操作新达成的収蔵記録，用于展示纸条。 */
  unlocked?: RecordedUnlock[];
};

export async function toggleUserGoodsStatusAction(
  previousState: ToggleUserGoodsStatusActionState,
  formData: FormData,
): Promise<ToggleUserGoodsStatusActionState> {
  const parsed = toggleUserGoodsStatusInputSchema.safeParse({
    goodsId: formData.get('goodsId'),
    status: formData.get('status'),
    nextPath: formData.get('nextPath'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: '收藏状态请求参数无效。',
      activeStatuses: previousState.activeStatuses,
    };
  }

  const { goodsId, status, nextPath } = parsed.data;
  const user = await requireAuthUser(nextPath);
  const snapshot = await toggleUserGoodsStatus({
    userId: user.id,
    goodsId,
    status,
  });
  const flags = getUserGoodsStateFlags(snapshot);
  const nowOwned = flags.activeStatuses.includes('owned');

  // 只在刚变成「已拥有」时判定；移除状态不该撤销已经记下的収蔵記録，那是
  // 一条历史记录，不是当前状态的镜像。
  let unlocked: RecordedUnlock[] = [];

  if (nowOwned) {
    try {
      unlocked = await recordAchievementsForGoods({
        userId: user.id,
        goodsId,
      });
    } catch (error) {
      // 収蔵記録判定失败不该让收藏动作失败 —— 标记拥有比记录重要。
      console.error('[achievements] 判定失败', error);
    }
  }

  revalidatePath(nextPath);
  revalidatePath('/me/collection');

  return {
    status: 'success',
    message: flags.activeStatuses.includes(status)
      ? `已加入“${userGoodsStatusMeta[status].label}”状态。`
      : `已从“${userGoodsStatusMeta[status].label}”状态中移除。`,
    activeStatuses: sortUserGoodsStatuses(flags.activeStatuses),
    unlocked,
  };
}
