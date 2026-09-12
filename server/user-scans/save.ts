import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { recognitionAttempts, userScans } from '@/drizzle/schema';
import { scanSaveInputSchema } from '@/lib/scan-batch';
import { recordAchievementsForGoods } from '@/server/data/achievements';
import { getDb } from '@/server/db/client';
import { confirmRecognitionInTransaction } from '@/server/recognition/confirm';
import { normalizeAndStoreUserScan } from './image-store';

export async function saveCapturedScan(input: {
  userId: string;
  captureId: string;
  requestId: string | null;
  candidateId: string | null;
  front: Buffer;
  back: Buffer | null;
}) {
  const metadata = scanSaveInputSchema.parse(input);
  const front = await normalizeAndStoreUserScan(input.front);
  const back = input.back ? await normalizeAndStoreUserScan(input.back) : null;
  const result = await getDb().transaction(async (tx) => {
    // Same client capture UUID serializes network retries, including concurrent retries.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.userId}:${metadata.captureId}`}, 0))`,
    );
    const existing = (
      await tx
        .select({ id: userScans.id })
        .from(userScans)
        .where(
          and(
            eq(userScans.userId, input.userId),
            eq(userScans.captureId, metadata.captureId),
          ),
        )
        .limit(1)
    )[0];
    if (existing)
      return { scanId: existing.id, goodsId: null, goodsSlug: null };
    if (metadata.requestId) {
      const attempt = (
        await tx
          .select({ id: recognitionAttempts.id })
          .from(recognitionAttempts)
          .where(
            and(
              eq(recognitionAttempts.id, metadata.requestId),
              eq(recognitionAttempts.userId, input.userId),
            ),
          )
          .limit(1)
      )[0];
      if (!attempt) throw new Error('识别记录不存在或不属于当前账号。');
    }
    const scan = (
      await tx
        .insert(userScans)
        .values({
          userId: input.userId,
          captureId: metadata.captureId,
          assetKey: front.assetKey,
          backAssetKey: back?.assetKey ?? null,
          recognitionAttemptId: metadata.requestId,
        })
        .returning({ id: userScans.id })
    )[0];
    let goodsId: string | null = null;
    let goodsSlug: string | null = null;
    if (metadata.candidateId && metadata.requestId) {
      const confirmed = await confirmRecognitionInTransaction(tx, {
        userId: input.userId,
        requestId: metadata.requestId,
        candidateId: metadata.candidateId,
        scanId: scan.id,
      });
      if (!confirmed.success) throw new Error(confirmed.message);
      if ('goodsId' in confirmed) goodsId = confirmed.goodsId;
      goodsSlug = confirmed.goodsSlug;
    }
    return { scanId: scan.id, goodsId, goodsSlug };
  });
  if (result.goodsId) {
    await recordAchievementsForGoods({
      userId: input.userId,
      goodsId: result.goodsId,
    }).catch((error) =>
      console.error('[scan-save] achievement update failed', error),
    );
  }
  revalidatePath('/me/collection');
  if (result.goodsSlug) revalidatePath(`/goods/${result.goodsSlug}`);
  revalidatePath('/matches');
  revalidatePath('/search');
  revalidatePath('/');
  return { scanId: result.scanId };
}

export async function saveScanBack(
  userId: string,
  scanId: string,
  image: Buffer,
) {
  const db = getDb();
  const own = and(eq(userScans.id, scanId), eq(userScans.userId, userId));
  if (
    !(
      await db.select({ id: userScans.id }).from(userScans).where(own).limit(1)
    )[0]
  )
    return null;
  const stored = await normalizeAndStoreUserScan(image);
  const updated = (
    await db
      .update(userScans)
      .set({ backAssetKey: stored.assetKey, updatedAt: new Date() })
      .where(own)
      .returning({ id: userScans.id })
  )[0];
  revalidatePath('/me/collection');
  return updated?.id ?? null;
}
