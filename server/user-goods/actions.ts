'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  sortUserGoodsStatuses,
  userGoodsStatusMeta,
  userGoodsStatusSchema,
  type UserGoodsStatus,
} from '@/lib/user-goods-status';
import { internalPathSchema } from '@/lib/internal-path';
import {
  toggleUserGoodsStatus,
  updateUserGoodsDetails,
} from '@/server/data/user-goods';
import { requireAuthUser } from '@/server/auth/session';
import { notifyGoodsWatchers } from '@/server/notifications/watch';

const toggleUserGoodsStatusInputSchema = z.object({
  goodsId: z.string().uuid(),
  status: userGoodsStatusSchema,
  nextPath: internalPathSchema,
});

const updateUserGoodsDetailsActionInputSchema = z.object({
  goodsId: z.string().uuid(),
  status: userGoodsStatusSchema,
  quantity: z.coerce.number().int().min(1).max(999),
  tradableQuantity: z.coerce.number().int().min(0).max(999),
  wishlistPriority: z.enum(['normal', 'super_want']),
  nextPath: internalPathSchema,
});

export async function updateUserGoodsDetailsAction(formData: FormData) {
  const parsed = updateUserGoodsDetailsActionInputSchema.safeParse({
    goodsId: formData.get('goodsId'),
    status: formData.get('status'),
    quantity: formData.get('quantity'),
    tradableQuantity: formData.get('tradableQuantity'),
    wishlistPriority: formData.get('wishlistPriority'),
    nextPath: formData.get('nextPath'),
  });
  if (!parsed.success) return;

  const user = await requireAuthUser(parsed.data.nextPath);
  try {
    await updateUserGoodsDetails({ ...parsed.data, userId: user.id });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'RESERVED_TRADE_INVENTORY') {
        redirect(`${parsed.data.nextPath}?collectionUpdate=reserved`);
      }
      if (error.message === 'UNLIT_GOODS') {
        redirect(`${parsed.data.nextPath}?collectionUpdate=unlit`);
      }
      if (error.message === 'ACTIVE_EXCHANGE_STATUS') {
        redirect(`${parsed.data.nextPath}?collectionUpdate=active`);
      }
    }
    throw error;
  }
  revalidatePath(parsed.data.nextPath);
  revalidatePath('/me/collection');
  revalidatePath('/matches');
  redirect(`${parsed.data.nextPath}?collectionUpdate=saved`);
}

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
  let snapshot: Awaited<ReturnType<typeof toggleUserGoodsStatus>>;
  try {
    snapshot = await toggleUserGoodsStatus({
      userId: user.id,
      goodsId,
      status,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';

    return {
      status: 'error',
      message:
        code === 'UNLIT_GOODS'
          ? '这件谷子还没有通过实物识别点亮，暂时不能设为可换。'
          : code === 'ACTIVE_EXCHANGE_STATUS'
            ? '请先移除可换状态，再调整或移出谷柜。'
            : '这件谷子已有进行中的换谷单，完成或取消后才能修改。',
      activeStatuses: previousState.activeStatuses,
    };
  }
  const activeStatuses = sortUserGoodsStatuses(
    snapshot.statuses.map(({ status: activeStatus }) => activeStatus),
  );
  const justBecameExchange =
    status === 'exchange' && activeStatuses.includes('exchange');

  if (justBecameExchange) {
    await notifyGoodsWatchers(goodsId, user.id);
  }

  revalidatePath(nextPath);
  revalidatePath('/me/collection');
  revalidatePath('/matches');

  return {
    status: 'success',
    message: activeStatuses.includes(status)
      ? status === 'owned'
        ? '已收藏进谷柜。扫描现实中的谷子后，缩略图才会点亮。'
        : `已加入“${userGoodsStatusMeta[status].label}”状态。`
      : `已从“${userGoodsStatusMeta[status].label}”状态中移除。`,
    activeStatuses,
  };
}
