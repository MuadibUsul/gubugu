'use server';

import { and, eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';

import { goods, postImages, posts, ratings } from '@/drizzle/schema';
import { goodsCacheTag } from '@/lib/cache-tags';
import { internalPathSchema } from '@/lib/internal-path';
import { isAcceptedImageMimeType } from '@/lib/image-upload';
import {
  calculateGoodsRatingScore,
  goodsRatingValueSchema,
} from '@/lib/goods-rating';
import { goodsCommunityUploadLimits } from '@/lib/community-upload';
import { normalizeAndStoreCommunityImage } from '@/server/community/image-store';
import { getDb } from '@/server/db/client';
import { requireAuthUser } from '@/server/auth/session';
import type {
  CreateGoodsPostActionState,
  SaveGoodsRatingActionState,
} from '@/server/community/action-state';
import { consumeServerWrite } from '@/lib/rate-limit';

type PostImageInsert = InferInsertModel<typeof postImages>;

const createGoodsPostInputSchema = z.object({
  goodsId: z.string().uuid(),
  nextPath: internalPathSchema,
  body: z
    .string()
    .trim()
    .min(1, '请先填写一段笔记内容。')
    .max(1200, '笔记内容请控制在 1200 字以内。'),
});

const worthBuyingFormValueSchema = z
  .union([z.literal('1'), z.literal('true'), z.undefined(), z.null()])
  .transform((value) => value === '1' || value === 'true');

const saveGoodsRatingInputSchema = z.object({
  goodsId: z.string().uuid(),
  nextPath: internalPathSchema,
  artworkScore: goodsRatingValueSchema.shape.artworkScore,
  craftsmanshipScore: goodsRatingValueSchema.shape.craftsmanshipScore,
  valueScore: goodsRatingValueSchema.shape.valueScore,
  rarityScore: goodsRatingValueSchema.shape.rarityScore,
  satisfactionScore: goodsRatingValueSchema.shape.satisfactionScore,
  worthBuying: worthBuyingFormValueSchema,
  overallTag: goodsRatingValueSchema.shape.overallTag,
});

function normalizeImageFiles(value: FormDataEntryValue[]) {
  return value.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );
}

function validateImageFiles(files: File[]) {
  if (files.length > goodsCommunityUploadLimits.maxFiles) {
    return `每条笔记最多上传 ${goodsCommunityUploadLimits.maxFiles} 张图片。`;
  }

  for (const file of files) {
    if (!isAcceptedImageMimeType(file.type)) {
      return '仅支持 JPG、PNG 或 WebP 图片。';
    }

    if (file.size > goodsCommunityUploadLimits.maxFileSizeBytes) {
      return '每张图片大小都不能超过 5 MB。';
    }
  }

  return null;
}

function appendSearchParam(pathname: string, key: string, value: string) {
  const url = new URL(pathname, 'http://localhost');
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}${url.hash}`;
}

async function requirePublishedGoods(goodsId: string) {
  const db = getDb();
  const goodsRows = await db
    .select({
      id: goods.id,
      slug: goods.slug,
    })
    .from(goods)
    .where(and(eq(goods.id, goodsId), eq(goods.status, 'published')))
    .limit(1);

  return goodsRows[0] ?? null;
}

export async function saveGoodsRatingAction(
  _previousState: SaveGoodsRatingActionState,
  formData: FormData,
): Promise<SaveGoodsRatingActionState> {
  const parsed = saveGoodsRatingInputSchema.safeParse({
    goodsId: formData.get('goodsId'),
    nextPath: formData.get('nextPath'),
    artworkScore: formData.get('artworkScore'),
    craftsmanshipScore: formData.get('craftsmanshipScore'),
    valueScore: formData.get('valueScore'),
    rarityScore: formData.get('rarityScore'),
    satisfactionScore: formData.get('satisfactionScore'),
    worthBuying: formData.get('worthBuying'),
    overallTag: formData.get('overallTag'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? '评分请求参数无效。',
    };
  }

  const {
    goodsId,
    nextPath,
    artworkScore,
    craftsmanshipScore,
    valueScore,
    rarityScore,
    satisfactionScore,
    worthBuying,
    overallTag,
  } = parsed.data;
  const user = await requireAuthUser(nextPath);
  const targetGoods = await requirePublishedGoods(goodsId);

  if (!targetGoods) {
    return {
      status: 'error',
      message: '这个 SKU 当前已无法继续评分。',
    };
  }

  const overallScore = calculateGoodsRatingScore({
    artworkScore,
    craftsmanshipScore,
    valueScore,
    rarityScore,
    satisfactionScore,
  });

  await getDb()
    .insert(ratings)
    .values({
      id: crypto.randomUUID(),
      goodsId,
      userId: user.id,
      score: overallScore,
      artworkScore,
      craftsmanshipScore,
      valueScore,
      rarityScore,
      satisfactionScore,
      worthBuying,
      overallTag,
    })
    .onConflictDoUpdate({
      target: [ratings.userId, ratings.goodsId],
      set: {
        score: overallScore,
        artworkScore,
        craftsmanshipScore,
        valueScore,
        rarityScore,
        satisfactionScore,
        worthBuying,
        overallTag,
        updatedAt: new Date(),
      },
    });

  // The cached goods detail carries the rating aggregate.
  updateTag(goodsCacheTag(targetGoods.slug));
  revalidatePath(nextPath);
  revalidatePath('/me/collection');
  redirect(`${nextPath}#community`);
}

export async function createGoodsPostAction(
  _previousState: CreateGoodsPostActionState,
  formData: FormData,
): Promise<CreateGoodsPostActionState> {
  const parsed = createGoodsPostInputSchema.safeParse({
    goodsId: formData.get('goodsId'),
    nextPath: formData.get('nextPath'),
    body: formData.get('body'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? '社区投稿参数无效。',
    };
  }

  const imageFiles = normalizeImageFiles(formData.getAll('images'));
  const imageFileError = validateImageFiles(imageFiles);

  if (imageFileError) {
    return {
      status: 'error',
      message: imageFileError,
    };
  }

  const { goodsId, nextPath, body } = parsed.data;
  const user = await requireAuthUser(nextPath);
  if (
    !consumeServerWrite(`${user.id}:community-post`, {
      limit: 5,
      windowMs: 60_000,
    })
  ) {
    return { status: 'error', message: '发布过于频繁，请稍后再试。' };
  }
  const db = getDb();
  const targetGoods = await requirePublishedGoods(goodsId);

  if (!targetGoods) {
    return {
      status: 'error',
      message: '这个 SKU 当前已无法继续投稿。',
    };
  }

  const postId = crypto.randomUUID();

  try {
    const imageRows: PostImageInsert[] = [];

    // 图片存到自有 VPS 的私密资产目录：内容寻址、统一转 webp。此前没有 Supabase 时
    // 走的是把整张图以 base64 data URI 塞进数据库的分支，那会让 post_images 行随图片
    // 体积膨胀，也拿不到任何缓存。
    //
    // 文件不在 public/ 下，只能经 `/api/post-images/[imageId]` 读取；那条路由按
    // `getPostImageAccess` 判定可见性，待审核的图只有作者本人和管理员能看到。
    for (const [index, file] of imageFiles.entries()) {
      const imageId = crypto.randomUUID();
      const stored = await normalizeAndStoreCommunityImage(
        Buffer.from(await file.arrayBuffer()),
        { maxInputBytes: goodsCommunityUploadLimits.maxFileSizeBytes },
      );

      imageRows.push({
        id: imageId,
        postId,
        imageUrl: `/api/post-images/${imageId}`,
        storagePath: stored.fileName,
        altText: null,
        status: 'visible' as const,
        moderationStatus: 'pending',
        sortOrder: index,
      });
    }

    await db.transaction(async (tx) => {
      await tx.insert(posts).values({
        id: postId,
        goodsId,
        userId: user.id,
        body,
        status: 'visible',
        moderationStatus: 'pending',
      });

      if (imageRows.length > 0) {
        await tx.insert(postImages).values(imageRows);
      }
    });
  } catch (error) {
    // 落盘的图片是内容寻址的，写库失败时留下的孤儿文件不会被任何行引用，
    // 由目录资产的清理流程统一回收，不在这里做即时删除。
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '社区笔记发布失败。',
    };
  }

  // The post is pending moderation so it is not public yet, but the cached
  // goods detail counts approved posts and must be refreshed on approval too;
  // see server/admin/moderation/actions.ts.
  updateTag(goodsCacheTag(targetGoods.slug));
  revalidatePath(nextPath);
  revalidatePath('/me/collection');
  redirect(
    `${appendSearchParam(nextPath, 'communitySubmission', 'pending')}#community`,
  );
}
