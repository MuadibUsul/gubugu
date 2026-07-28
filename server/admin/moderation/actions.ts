'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  catalogSubmissions,
  exchangeListings,
  goods,
  postImages,
  posts,
} from '@/drizzle/schema';
import {
  moderationQueueModuleSchema,
  moderationStatusSchema,
  moderationSubjectTypeSchema,
  type ModerationQueueModule,
  type ModerationSubjectType,
} from '@/lib/moderation';
import type { SaveModerationDecisionActionState } from '@/server/admin/moderation/action-state';
import { requireModeratorAccess } from '@/server/auth/admin';
import { getDb } from '@/server/db/client';

const reviewNoteSchema = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => (typeof value === 'string' ? value.trim() : ''))
  .refine((value) => value.length <= 500, {
    message: '审核备注请控制在 500 个字符以内。',
  })
  .transform((value) => (value.length > 0 ? value : null));

const internalRoutePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine((value) => value.startsWith('/'), {
    message: '路径必须是站内路由。',
  });

const reviewModerationItemInputSchema = z.object({
  module: moderationQueueModuleSchema,
  itemId: z.string().uuid(),
  decision: moderationStatusSchema,
  reviewNote: reviewNoteSchema,
  nextPath: internalRoutePathSchema,
});

const saveModerationDecisionInputSchema = z.object({
  subjectType: moderationSubjectTypeSchema,
  subjectId: z.string().uuid(),
  decision: moderationStatusSchema,
  reviewNote: reviewNoteSchema,
  returnPath: internalRoutePathSchema,
});

async function revalidateGoodsPathForModule(input: {
  module: z.infer<typeof moderationQueueModuleSchema>;
  itemId: string;
}) {
  const db = getDb();

  if (input.module === 'catalog-submission') {
    return;
  }

  if (input.module === 'comment') {
    const rows = await db
      .select({
        goodsSlug: goods.slug,
      })
      .from(posts)
      .innerJoin(goods, eq(posts.goodsId, goods.id))
      .where(eq(posts.id, input.itemId))
      .limit(1);

    if (rows[0]?.goodsSlug) {
      revalidatePath(`/goods/${rows[0].goodsSlug}`);
    }

    return;
  }

  if (input.module === 'photo-upload') {
    const rows = await db
      .select({
        goodsSlug: goods.slug,
      })
      .from(postImages)
      .innerJoin(posts, eq(postImages.postId, posts.id))
      .innerJoin(goods, eq(posts.goodsId, goods.id))
      .where(eq(postImages.id, input.itemId))
      .limit(1);

    if (rows[0]?.goodsSlug) {
      revalidatePath(`/goods/${rows[0].goodsSlug}`);
    }

    return;
  }

  const rows = await db
    .select({
      goodsSlug: goods.slug,
    })
    .from(exchangeListings)
    .innerJoin(goods, eq(exchangeListings.goodsId, goods.id))
    .where(eq(exchangeListings.id, input.itemId))
    .limit(1);

  if (rows[0]?.goodsSlug) {
    revalidatePath(`/goods/${rows[0].goodsSlug}`);
  }
}

function mapSubjectTypeToModule(
  subjectType: ModerationSubjectType,
): ModerationQueueModule {
  switch (subjectType) {
    case 'catalogSubmission':
      return 'catalog-submission';
    case 'photoUpload':
      return 'photo-upload';
    case 'comment':
      return 'comment';
    case 'exchangeIntent':
      return 'exchange-intent';
    default:
      return 'comment';
  }
}

async function applyModerationDecision(input: {
  module: z.infer<typeof moderationQueueModuleSchema>;
  itemId: string;
  decision: z.infer<typeof moderationStatusSchema>;
  reviewNote: string | null;
  nextPath: string;
  reviewerId: string;
}) {
  const { module, itemId, decision, reviewNote, nextPath, reviewerId } = input;
  const db = getDb();
  const reviewPatch = {
    moderationStatus: decision,
    reviewNote,
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  };

  if (module === 'catalog-submission') {
    await db
      .update(catalogSubmissions)
      .set(reviewPatch)
      .where(eq(catalogSubmissions.id, itemId));
  } else if (module === 'comment') {
    await db.update(posts).set(reviewPatch).where(eq(posts.id, itemId));
  } else if (module === 'photo-upload') {
    await db
      .update(postImages)
      .set(reviewPatch)
      .where(eq(postImages.id, itemId));
  } else {
    await db
      .update(exchangeListings)
      .set(reviewPatch)
      .where(eq(exchangeListings.id, itemId));
  }

  revalidatePath('/admin');
  revalidatePath('/admin/moderation');
  revalidatePath(nextPath);
  revalidatePath('/me/collection');
  await revalidateGoodsPathForModule({ module, itemId });
}

export async function reviewModerationItemAction(formData: FormData) {
  const reviewer = await requireModeratorAccess('/admin/moderation');

  const parsed = reviewModerationItemInputSchema.safeParse({
    module: formData.get('module'),
    itemId: formData.get('itemId'),
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote'),
    nextPath: formData.get('nextPath'),
  });

  if (!parsed.success) {
    return;
  }

  await applyModerationDecision({
    ...parsed.data,
    reviewerId: reviewer.id,
  });
}

export async function saveModerationDecisionAction(
  _previousState: SaveModerationDecisionActionState,
  formData: FormData,
): Promise<SaveModerationDecisionActionState> {
  const reviewer = await requireModeratorAccess('/admin/moderation');
  const parsed = saveModerationDecisionInputSchema.safeParse({
    subjectType: formData.get('subjectType'),
    subjectId: formData.get('subjectId'),
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote'),
    returnPath: formData.get('returnPath'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? '审核决定请求参数无效。',
    };
  }

  await applyModerationDecision({
    module: mapSubjectTypeToModule(parsed.data.subjectType),
    itemId: parsed.data.subjectId,
    decision: parsed.data.decision,
    reviewNote: parsed.data.reviewNote,
    nextPath: parsed.data.returnPath,
    reviewerId: reviewer.id,
  });

  return {
    status: 'idle',
  };
}
