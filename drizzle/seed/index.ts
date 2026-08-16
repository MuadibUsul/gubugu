import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';

import {
  catalogSubmissions,
  characters,
  exchangeListings,
  goods,
  goodsCharacters,
  goodsImages,
  goodsTags,
  ips,
  postImages,
  posts,
  profiles,
  ratings,
  series,
  achievements,
  tags,
  userGoods,
} from '../schema';
import {
  catalogSubmissionSeed,
  characterSeed,
  exchangeListingSeed,
  goodsCharacterSeed,
  goodsImageSeed,
  goodsSeed,
  goodsTagSeed,
  ipSeed,
  postImageSeed,
  postSeed,
  ratingSeed,
  seriesSeed,
  tagSeed,
  userGoodsSeed,
} from './data';
import {
  expandedCatalogSubmissionSeed,
  expandedCharacterSeed,
  expandedExchangeListingSeed,
  expandedGoodsCharacterSeed,
  expandedGoodsImageSeed,
  expandedGoodsSeed,
  expandedGoodsTagSeed,
  expandedIpSeed,
  expandedPostImageSeed,
  expandedPostSeed,
  expandedRatingSeed,
  expandedSeriesSeed,
  expandedTagSeed,
  expandedUserGoodsSeed,
} from './expanded-data';
import { achievementSeed } from './achievements';
import { syncLocalSampleImages } from './local-sample-images';
import { profileSeed } from './profiles';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const db = drizzle(pool);

const allIpSeed = [...ipSeed, ...expandedIpSeed];
const allCharacterSeed = [...characterSeed, ...expandedCharacterSeed];
const allSeriesSeed = [...seriesSeed, ...expandedSeriesSeed];
const allGoodsSeed = [...goodsSeed, ...expandedGoodsSeed];
const allGoodsImageSeed = [...goodsImageSeed, ...expandedGoodsImageSeed];
const allTagSeed = [...tagSeed, ...expandedTagSeed];
const allGoodsTagSeed = [...goodsTagSeed, ...expandedGoodsTagSeed];
const allGoodsCharacterSeed = [
  ...goodsCharacterSeed,
  ...expandedGoodsCharacterSeed,
];
const allUserGoodsSeed = [...userGoodsSeed, ...expandedUserGoodsSeed];
const allRatingSeed = [...ratingSeed, ...expandedRatingSeed];
const allCatalogSubmissionSeed = [
  ...catalogSubmissionSeed,
  ...expandedCatalogSubmissionSeed,
];
const allPostSeed = [...postSeed, ...expandedPostSeed];
const allPostImageSeed = [...postImageSeed, ...expandedPostImageSeed];
const allExchangeListingSeed = [
  ...exchangeListingSeed,
  ...expandedExchangeListingSeed,
];

const demoSeedSummary = {
  profiles: profileSeed.length,
  ips: allIpSeed.length,
  characters: allCharacterSeed.length,
  series: allSeriesSeed.length,
  goods: allGoodsSeed.length,
  goodsImages: allGoodsImageSeed.length,
  tags: allTagSeed.length,
  goodsTags: allGoodsTagSeed.length,
  goodsCharacters: allGoodsCharacterSeed.length,
  userGoods: allUserGoodsSeed.length,
  ratings: allRatingSeed.length,
  catalogSubmissions: allCatalogSubmissionSeed.length,
  posts: allPostSeed.length,
  postImages: allPostImageSeed.length,
  exchangeListings: allExchangeListingSeed.length,
} as const;

function withTimestamps<T extends Record<string, unknown>>(row: T, now: Date) {
  return {
    ...row,
    createdAt: now,
    updatedAt: now,
  };
}

async function seed() {
  const now = new Date();
  const syncedLocalSampleImages = syncLocalSampleImages();

  await db.transaction(async (tx) => {
    for (const row of profileSeed) {
      await tx
        .insert(profiles)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            handle: row.handle,
            displayName: row.displayName,
            avatarImageUrl: row.avatarImageUrl,
            bio: row.bio,
            city: row.city,
            accentTitle: row.accentTitle,
            visibility: row.visibility,
            updatedAt: now,
          },
        });
    }

    for (const row of allIpSeed) {
      await tx
        .insert(ips)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: ips.id,
          set: {
            slug: row.slug,
            name: row.name,
            nameLocalized: row.nameLocalized,
            description: row.description,
            coverImageUrl: row.coverImageUrl,
            status: row.status,
            updatedAt: now,
          },
        });
    }

    for (const row of allCharacterSeed) {
      await tx
        .insert(characters)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: characters.id,
          set: {
            ipId: row.ipId,
            slug: row.slug,
            name: row.name,
            nameLocalized: row.nameLocalized,
            description: row.description,
            avatarImageUrl: row.avatarImageUrl,
            status: row.status,
            updatedAt: now,
          },
        });
    }

    for (const row of allSeriesSeed) {
      await tx
        .insert(series)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: series.id,
          set: {
            ipId: row.ipId,
            slug: row.slug,
            name: row.name,
            description: row.description,
            coverImageUrl: row.coverImageUrl,
            seriesType: row.seriesType,
            releaseDate: row.releaseDate,
            status: row.status,
            updatedAt: now,
          },
        });
    }

    for (const row of allGoodsSeed) {
      await tx
        .insert(goods)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: goods.id,
          set: {
            seriesId: row.seriesId,
            skuCode: row.skuCode,
            slug: row.slug,
            name: row.name,
            description: row.description,
            goodsType: row.goodsType,
            material: row.material,
            sizeLabel: row.sizeLabel,
            edition: row.edition,
            releaseDate: row.releaseDate,
            msrpAmount: row.msrpAmount,
            currencyCode: row.currencyCode,
            metadata: row.metadata,
            status: row.status,
            updatedAt: now,
          },
        });
    }

    for (const row of allGoodsImageSeed) {
      await tx
        .insert(goodsImages)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: goodsImages.id,
          set: {
            goodsId: row.goodsId,
            imageUrl: row.imageUrl,
            altText: row.altText,
            sortOrder: row.sortOrder,
            isPrimary: row.isPrimary,
            updatedAt: now,
          },
        });
    }

    for (const row of allTagSeed) {
      await tx
        .insert(tags)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: tags.id,
          set: {
            slug: row.slug,
            name: row.name,
            updatedAt: now,
          },
        });
    }

    for (const row of allGoodsTagSeed) {
      await tx
        .insert(goodsTags)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: [goodsTags.goodsId, goodsTags.tagId],
          set: {
            updatedAt: now,
          },
        });
    }

    for (const row of allGoodsCharacterSeed) {
      await tx
        .insert(goodsCharacters)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: [goodsCharacters.goodsId, goodsCharacters.characterId],
          set: {
            sortOrder: row.sortOrder,
            isPrimary: row.isPrimary,
            updatedAt: now,
          },
        });
    }

    for (const row of allUserGoodsSeed) {
      await tx
        .insert(userGoods)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: [userGoods.userId, userGoods.goodsId, userGoods.status],
          set: {
            note: row.note,
            updatedAt: now,
          },
        });
    }

    for (const row of allRatingSeed) {
      await tx
        .insert(ratings)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.goodsId],
          set: {
            score: row.score,
            artworkScore: row.artworkScore,
            craftsmanshipScore: row.craftsmanshipScore,
            valueScore: row.valueScore,
            rarityScore: row.rarityScore,
            satisfactionScore: row.satisfactionScore,
            worthBuying: row.worthBuying,
            overallTag: row.overallTag,
            updatedAt: now,
          },
        });
    }

    for (const row of allCatalogSubmissionSeed) {
      await tx
        .insert(catalogSubmissions)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: catalogSubmissions.id,
          set: {
            userId: row.userId,
            submissionType: row.submissionType,
            targetEntityType: row.targetEntityType,
            targetEntityId: row.targetEntityId,
            title: row.title,
            body: row.body,
            payload: row.payload,
            moderationStatus: row.moderationStatus ?? 'pending',
            reviewNote: row.reviewNote ?? null,
            reviewedBy: row.reviewedBy ?? null,
            reviewedAt: row.reviewedAt ?? null,
            updatedAt: now,
          },
        });
    }

    for (const row of allPostSeed) {
      await tx
        .insert(posts)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: posts.id,
          set: {
            goodsId: row.goodsId,
            userId: row.userId,
            body: row.body,
            status: row.status,
            moderationStatus: row.moderationStatus ?? 'pending',
            reviewNote: row.reviewNote ?? null,
            reviewedBy: row.reviewedBy ?? null,
            reviewedAt: row.reviewedAt ?? null,
            updatedAt: now,
          },
        });
    }

    for (const row of allPostImageSeed) {
      await tx
        .insert(postImages)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: postImages.id,
          set: {
            postId: row.postId,
            imageUrl: row.imageUrl,
            storagePath: row.storagePath,
            altText: row.altText,
            status: row.status ?? 'visible',
            moderationStatus: row.moderationStatus ?? 'pending',
            reviewNote: row.reviewNote ?? null,
            reviewedBy: row.reviewedBy ?? null,
            reviewedAt: row.reviewedAt ?? null,
            sortOrder: row.sortOrder,
            updatedAt: now,
          },
        });
    }

    for (const row of allExchangeListingSeed) {
      await tx
        .insert(exchangeListings)
        .values(withTimestamps(row, now))
        .onConflictDoUpdate({
          target: exchangeListings.id,
          set: {
            goodsId: row.goodsId,
            wantedGoodsId: row.wantedGoodsId,
            userId: row.userId,
            status: row.status,
            description: row.description,
            conditionNote: row.conditionNote,
            locationHint: row.locationHint,
            allowMulti: row.allowMulti,
            allowCash: row.allowCash,
            fulfillmentMethod: row.fulfillmentMethod,
            moderationStatus: row.moderationStatus ?? 'pending',
            reviewNote: row.reviewNote ?? null,
            reviewedBy: row.reviewedBy ?? null,
            reviewedAt: row.reviewedAt ?? null,
            updatedAt: now,
          },
        });
    }

    // 収蔵記録的定义是产品内容，不是演示数据 —— 生产库也需要它们，所以按
    // code 幂等 upsert，不带演示前缀。
    for (const row of achievementSeed) {
      await tx
        .insert(achievements)
        .values({ ...row, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: achievements.code,
          set: {
            name: row.name,
            description: row.description,
            kind: row.kind,
            threshold: row.threshold,
            sortOrder: row.sortOrder,
            updatedAt: now,
          },
        });
    }
  });

  console.log('Demo seed completed.');
  if (syncedLocalSampleImages.length > 0) {
    console.log(
      `Imported ${syncedLocalSampleImages.length} local sample image(s) into public/local-sample-images.`,
    );
  } else {
    console.log('No local sample images were found in images/.');
  }
  console.table(demoSeedSummary);
}

seed()
  .catch((error) => {
    console.error('Seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
