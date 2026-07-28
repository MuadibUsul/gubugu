'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { exchangeListings, goods, userGoods } from '@/drizzle/schema';
import { findDemoViewerKeyByUserId } from '@/lib/config/demo-viewers';
import { exchangeFulfillmentMethodSchema } from '@/lib/exchange-listing';
import type { CreateExchangeListingActionState } from '@/server/exchange/action-state';
import { requireAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';

const checkboxValueSchema = z
  .union([z.literal('1'), z.literal('true'), z.undefined(), z.null()])
  .transform((value) => value === '1' || value === 'true');

const nextPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine((value) => value.startsWith('/'), {
    message: 'nextPath 必须是站内路由。',
  });

const optionalTextSchema = (maxLength: number) =>
  z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => (typeof value === 'string' ? value.trim() : ''))
    .refine((value) => value.length <= maxLength, {
      message: `文本内容请控制在 ${maxLength} 字以内。`,
    })
    .transform((value) => (value.length > 0 ? value : null));

const createExchangeListingInputSchema = z
  .object({
    goodsId: z.string().uuid(),
    wantedGoodsId: z.string().uuid(),
    nextPath: nextPathSchema,
    note: z
      .string()
      .trim()
      .min(1, '请填写一段交换说明。')
      .max(600, '交换说明请控制在 600 字以内。'),
    conditionNote: optionalTextSchema(280),
    locationHint: optionalTextSchema(128),
    allowMulti: checkboxValueSchema,
    allowCash: checkboxValueSchema,
    fulfillmentMethod: exchangeFulfillmentMethodSchema,
  })
  .refine((value) => value.goodsId !== value.wantedGoodsId, {
    message: '请换一个不同的目标 SKU。',
    path: ['wantedGoodsId'],
  });

function appendSearchParam(pathname: string, key: string, value: string) {
  const url = new URL(pathname, 'http://localhost');
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}${url.hash}`;
}

async function requirePublishedGoods(goodsId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: goods.id,
      slug: goods.slug,
    })
    .from(goods)
    .where(and(eq(goods.id, goodsId), eq(goods.status, 'published')))
    .limit(1);

  return rows[0] ?? null;
}

export async function createExchangeListingAction(
  _previousState: CreateExchangeListingActionState,
  formData: FormData,
): Promise<CreateExchangeListingActionState> {
  const parsed = createExchangeListingInputSchema.safeParse({
    goodsId: formData.get('goodsId'),
    wantedGoodsId: formData.get('wantedGoodsId'),
    nextPath: formData.get('nextPath'),
    note: formData.get('note'),
    conditionNote: formData.get('conditionNote'),
    locationHint: formData.get('locationHint'),
    allowMulti: formData.get('allowMulti'),
    allowCash: formData.get('allowCash'),
    fulfillmentMethod: formData.get('fulfillmentMethod'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? '交换意向参数无效。',
    };
  }

  const {
    goodsId,
    wantedGoodsId,
    nextPath,
    note,
    conditionNote,
    locationHint,
    allowMulti,
    allowCash,
    fulfillmentMethod,
  } = parsed.data;
  const user = await requireAuthUser(nextPath);
  const [offeredGoods, wantedGoods] = await Promise.all([
    requirePublishedGoods(goodsId),
    requirePublishedGoods(wantedGoodsId),
  ]);

  if (!offeredGoods || !wantedGoods) {
    return {
      status: 'error',
      message: '你选择的 SKU 中有一项当前已不可用。',
    };
  }

  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.insert(exchangeListings).values({
      id: crypto.randomUUID(),
      goodsId,
      wantedGoodsId,
      userId: user.id,
      status: 'open',
      description: note,
      conditionNote,
      locationHint,
      allowMulti,
      allowCash,
      fulfillmentMethod,
      moderationStatus: 'pending',
    });

    await tx
      .insert(userGoods)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        goodsId,
        status: 'exchange',
        note: '已通过轻量交换台发布。',
      })
      .onConflictDoNothing({
        target: [userGoods.userId, userGoods.goodsId, userGoods.status],
      });
  });

  revalidatePath(nextPath);
  revalidatePath('/me/collection');

  const demoViewerKey = findDemoViewerKeyByUserId(user.id);

  if (demoViewerKey) {
    revalidatePath(`/users/${demoViewerKey}`);
  }

  redirect(
    `${appendSearchParam(nextPath, 'exchangeSubmission', 'pending')}#exchange-desk`,
  );
}
