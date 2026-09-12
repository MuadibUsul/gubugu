import { createHash, randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/data/achievements', () => ({
  recordAchievementsForGoods: vi.fn(async () => undefined),
}));
vi.mock('./image-store', () => ({
  normalizeAndStoreUserScan: vi.fn(async (image: Buffer) => ({
    assetKey: `${createHash('sha256').update(image).digest('hex')}.webp`,
  })),
}));
import {
  goods,
  recognitionAttempts,
  userGoods,
  userScans,
} from '@/drizzle/schema';
import { getDb, getDbPool } from '@/server/db/client';
import { getOwnedUserScanAssetKey } from '@/server/data/user-scans';
import { saveCapturedScan, saveScanBack } from './save';

// Run only against an explicitly enabled, migrated test database, never implicitly
// against a developer's configured database. Images are stubbed; SQL is real.
describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')(
  'paired scan transactions',
  () => {
    const owner = randomUUID();
    const other = randomUUID();
    const input = () => ({
      userId: owner,
      captureId: randomUUID(),
      requestId: null,
      candidateId: null,
      front: Buffer.from('front'),
      back: Buffer.from('back'),
    });
    afterAll(async () => {
      const db = getDb();
      await db
        .delete(userScans)
        .where(inArray(userScans.userId, [owner, other]));
      await db
        .delete(userGoods)
        .where(inArray(userGoods.userId, [owner, other]));
      await db
        .delete(recognitionAttempts)
        .where(inArray(recognitionAttempts.userId, [owner, other]));
      await getDbPool().end();
    });
    it('stores two sides once under concurrent network retries and protects both sides', async () => {
      const capture = input();
      const [first, second] = await Promise.all([
        saveCapturedScan(capture),
        saveCapturedScan(capture),
      ]);
      expect(first.scanId).toBe(second.scanId);
      const rows = await getDb()
        .select()
        .from(userScans)
        .where(eq(userScans.captureId, capture.captureId));
      expect(rows).toHaveLength(1);
      expect(rows[0].backAssetKey).toBeTruthy();
      expect(rows[0].assetKey).not.toBe(rows[0].backAssetKey);
      for (const side of ['front', 'back'] as const) {
        expect(
          await getOwnedUserScanAssetKey({
            userId: other,
            scanId: first.scanId,
            side,
          }),
        ).toBeNull();
        expect(
          await getOwnedUserScanAssetKey({
            userId: owner,
            scanId: first.scanId,
            side,
          }),
        ).toBeTruthy();
      }
      expect(
        await saveScanBack(other, first.scanId, Buffer.from('replacement')),
      ).toBeNull();
      expect(
        await saveScanBack(owner, first.scanId, Buffer.from('replacement')),
      ).toBe(first.scanId);
      const updated = await getDb()
        .select()
        .from(userScans)
        .where(eq(userScans.id, first.scanId));
      expect(updated[0].assetKey).toBe(rows[0].assetKey);
      expect(updated[0].backAssetKey).not.toBe(rows[0].backAssetKey);
    }, 10000);
    it('rolls back an invalid candidate and atomically confirms the correct SKU', async () => {
      const db = getDb();
      const [sku] = await db
        .select({ id: goods.id })
        .from(goods)
        .where(eq(goods.status, 'published'))
        .limit(1);
      expect(sku).toBeTruthy();
      const candidateId = randomUUID();
      const [attempt] = await db
        .insert(recognitionAttempts)
        .values({
          userId: owner,
          source: 'camera',
          provider: 'embedding-search',
          candidateMap: { [candidateId]: sku.id },
          expiresAt: new Date(Date.now() + 60000),
        })
        .returning();
      const capture = {
        ...input(),
        requestId: attempt.id,
        candidateId: randomUUID(),
      };
      await expect(saveCapturedScan(capture)).rejects.toThrow();
      expect(
        await db
          .select()
          .from(userScans)
          .where(eq(userScans.captureId, capture.captureId)),
      ).toHaveLength(0);
      await expect(
        saveCapturedScan({ ...capture, userId: other, candidateId }),
      ).rejects.toThrow();
      const saved = await saveCapturedScan({ ...capture, candidateId });
      const [scan] = await db
        .select()
        .from(userScans)
        .where(eq(userScans.id, saved.scanId));
      expect(scan.resolvedAt).not.toBeNull();
      expect(scan.backAssetKey).toBeTruthy();
      await saveCapturedScan({ ...capture, candidateId });
      const owned = await db
        .select()
        .from(userGoods)
        .where(
          and(
            eq(userGoods.userId, owner),
            eq(userGoods.goodsId, sku.id),
            eq(userGoods.status, 'owned'),
          ),
        );
      expect(owned).toHaveLength(1);
      expect(owned[0].quantity).toBe(1);
    }, 10000);
  },
);
