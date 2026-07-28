'use server';

import { and, eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { goods, postImages, posts, ratings } from '@/drizzle/schema';
import {
  calculateGoodsRatingScore,
  goodsRatingValueSchema,
} from '@/lib/goods-rating';
import {
  getGoodsCommunityBucketName,
  goodsCommunityUploadLimits,
  sanitizeStorageFilename,
} from '@/lib/supabase/storage';
import { getDb } from '@/server/db/client';
import { requireAuthUser } from '@/server/auth/session';
import { getSupabaseAuthConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  CreateGoodsPostActionState,
  SaveGoodsRatingActionState,
} from '@/server/community/action-state';

type PostImageInsert = InferInsertModel<typeof postImages>;

const createGoodsPostInputSchema = z.object({
  goodsId: z.string().uuid(),
  nextPath: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((value) => value.startsWith('/'), {
      message: 'nextPath 必须是站内路由。',
    }),
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
  nextPath: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((value) => value.startsWith('/'), {
      message: 'nextPath must be an internal route.',
    }),
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
    if (!file.type.startsWith('image/')) {
      return '这里仅支持上传图片文件。';
    }

    if (file.size > goodsCommunityUploadLimits.maxFileSizeBytes) {
      return '每张图片大小都不能超过 5 MB。';
    }
  }

  return null;
}

async function createInlineImageRows({
  files,
  postId,
}: {
  files: File[];
  postId: string;
}) {
  const imageRows: PostImageInsert[] = [];

  for (const [index, file] of files.entries()) {
    const base64Payload = Buffer.from(await file.arrayBuffer()).toString(
      'base64',
    );

    imageRows.push({
      id: crypto.randomUUID(),
      postId,
      imageUrl: `data:${file.type};base64,${base64Payload}`,
      storagePath: [
        'local-inline',
        'goods-community',
        postId,
        `${index + 1}-${sanitizeStorageFilename(file.name)}`,
      ].join('/'),
      altText: null,
      status: 'visible' as const,
      moderationStatus: 'pending',
      sortOrder: index,
    });
  }

  return imageRows;
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
  const db = getDb();
  const targetGoods = await requirePublishedGoods(goodsId);

  if (!targetGoods) {
    return {
      status: 'error',
      message: '这个 SKU 当前已无法继续投稿。',
    };
  }

  const postId = crypto.randomUUID();
  const authConfigured = Boolean(getSupabaseAuthConfig());
  const bucketName = authConfigured ? getGoodsCommunityBucketName() : null;
  const supabase = authConfigured ? await createServerSupabaseClient() : null;
  const uploadedPaths: string[] = [];

  try {
    const imageRows: PostImageInsert[] = [];

    if (supabase && bucketName) {
      for (const [index, file] of imageFiles.entries()) {
        const storagePath = [
          'goods',
          goodsId,
          'posts',
          postId,
          `${index + 1}-${sanitizeStorageFilename(file.name)}`,
        ].join('/');

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, file, {
            cacheControl: '3600',
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPaths.push(storagePath);

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

        imageRows.push({
          id: crypto.randomUUID(),
          postId,
          imageUrl: publicUrl,
          storagePath,
          altText: null,
          status: 'visible' as const,
          moderationStatus: 'pending',
          sortOrder: index,
        });
      }
    } else {
      imageRows.push(
        ...(await createInlineImageRows({
          files: imageFiles,
          postId,
        })),
      );
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
    if (supabase && bucketName && uploadedPaths.length > 0) {
      await supabase.storage.from(bucketName).remove(uploadedPaths);
    }

    return {
      status: 'error',
      message: error instanceof Error ? error.message : '社区笔记发布失败。',
    };
  }

  revalidatePath(nextPath);
  revalidatePath('/me/collection');
  redirect(
    `${appendSearchParam(nextPath, 'communitySubmission', 'pending')}#community`,
  );
}
