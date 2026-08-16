/**
 * Builds CLIP embeddings for catalogue images.
 *
 * Run offline, not on the request path: loading the model takes roughly two
 * minutes while embedding an image once loaded takes under 100ms. Only the
 * single uploaded image is embedded per request.
 *
 * Idempotent — an image whose checksum already has a ready embedding for this
 * provider and model is skipped, so re-running only picks up new or changed
 * images. Pass --force to rebuild everything.
 */
import { createHash } from 'node:crypto';

import { config as loadEnv } from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '../schema';
import { goodsImageEmbeddings, goodsImages } from '../schema';
import {
  embedImage,
  embeddingDimensions,
  embeddingModel,
  embeddingProvider,
} from '../../server/recognition/embedding';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

const force = process.argv.includes('--force');

async function fetchImageBlob(imageUrl: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  // Same-origin paths are what the seed writes; resolve them against the app.
  const absolute = imageUrl.startsWith('/')
    ? new URL(imageUrl, appUrl).toString()
    : imageUrl;

  const response = await fetch(absolute);

  if (!response.ok) {
    throw new Error(`拉取图片失败 (${response.status}): ${absolute}`);
  }

  return response.blob();
}

function checksumOf(imageUrl: string) {
  return createHash('sha256').update(imageUrl).digest('hex').slice(0, 128);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('需要 DATABASE_URL 才能建立图像索引。');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    const images = await db
      .select({ id: goodsImages.id, imageUrl: goodsImages.imageUrl })
      .from(goodsImages);

    console.log(`待处理图片: ${images.length}`);

    let embedded = 0;
    let skipped = 0;
    let failed = 0;

    for (const image of images) {
      const checksum = checksumOf(image.imageUrl);

      const [existing] = await db
        .select({
          id: goodsImageEmbeddings.id,
          status: goodsImageEmbeddings.status,
          sourceChecksum: goodsImageEmbeddings.sourceChecksum,
        })
        .from(goodsImageEmbeddings)
        .where(
          and(
            eq(goodsImageEmbeddings.goodsImageId, image.id),
            eq(goodsImageEmbeddings.provider, embeddingProvider),
            eq(goodsImageEmbeddings.model, embeddingModel),
          ),
        )
        .limit(1);

      if (
        !force &&
        existing?.status === 'ready' &&
        existing.sourceChecksum === checksum
      ) {
        skipped += 1;
        continue;
      }

      try {
        const blob = await fetchImageBlob(image.imageUrl);
        const vector = await embedImage(blob);

        const row = {
          goodsImageId: image.id,
          status: 'ready' as const,
          provider: embeddingProvider,
          model: embeddingModel,
          dimensions: vector.length,
          sourceChecksum: checksum,
          embeddingPayload: vector,
          indexedAt: new Date(),
          lastError: null,
        };

        if (existing) {
          await db
            .update(goodsImageEmbeddings)
            .set(row)
            .where(eq(goodsImageEmbeddings.id, existing.id));
        } else {
          await db.insert(goodsImageEmbeddings).values(row);
        }

        if (vector.length !== embeddingDimensions) {
          console.warn(
            `  维度异常: ${image.imageUrl} 得到 ${vector.length}，预期 ${embeddingDimensions}`,
          );
        }

        embedded += 1;
        console.log(`  已索引 ${image.imageUrl}`);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);

        console.error(`  失败 ${image.imageUrl}: ${message}`);

        // Record the failure so the row is not silently missing from search.
        const failureRow = {
          goodsImageId: image.id,
          status: 'failed' as const,
          provider: embeddingProvider,
          model: embeddingModel,
          sourceChecksum: checksum,
          lastError: message.slice(0, 1000),
        };

        if (existing) {
          await db
            .update(goodsImageEmbeddings)
            .set(failureRow)
            .where(eq(goodsImageEmbeddings.id, existing.id));
        } else {
          await db.insert(goodsImageEmbeddings).values(failureRow);
        }
      }
    }

    console.log(`完成: 新建/更新 ${embedded}，跳过 ${skipped}，失败 ${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
