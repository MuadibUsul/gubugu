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
      message: 'nextPath 必须是站内路由。',
    }),
});

export type ToggleUserGoodsStatusActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  activeStatuses: UserGoodsStatus[];
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

  revalidatePath(nextPath);
  revalidatePath('/me/collection');

  return {
    status: 'success',
    message: flags.activeStatuses.includes(status)
      ? `已加入「${userGoodsStatusMeta[status].label}」状态。`
      : `已从「${userGoodsStatusMeta[status].label}」状态中移除。`,
    activeStatuses: sortUserGoodsStatuses(flags.activeStatuses),
  };
}
