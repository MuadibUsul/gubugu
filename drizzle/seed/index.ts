import { config as loadEnv } from 'dotenv';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';

import {
  catalogSubmissions,
  characters,
  directConversations,
  directMessages,
  exchangeListings,
  exchangeOfferRevisions,
  exchangeOffers,
  exchangeReviews,
  exchanges,
  follows,
  goods,
  goodsCharacters,
  goodsImages,
  goodsTags,
  ips,
  localAuthAccounts,
  notifications,
  postImages,
  posts,
  profiles,
  ratings,
  series,
  achievements,
  tags,
  userAchievements,
  userGoods,
} from '../schema';
import { evaluateAchievements } from '../../lib/achievements';
import { localDemoAuthEmailByKey } from '../../lib/auth/local-demo';
import { hashPassword } from '../../lib/auth/password';
import {
  demoViewerEntries,
  demoViewers,
  type DemoViewerKey,
} from '../../lib/config/demo-viewers';
import {
  catalogSubmissionSeed,
  characterSeed,
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
  backfilledPostSeed,
  backfilledPostImageSeed,
} from './expanded-data';
import { achievementSeed } from './achievements';
import { syncLocalSampleImages } from './local-sample-images';
import { buildMatchingUserGoods, matchingSeedSlugs } from './matching';
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

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

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
const allPostSeed = [...postSeed, ...expandedPostSeed, ...backfilledPostSeed];
const allPostImageSeed = [
  ...postImageSeed,
  ...expandedPostImageSeed,
  ...backfilledPostImageSeed,
];

const demoSeedSummary = {
  profiles: profileSeed.length,
  localAccounts: profileSeed.length,
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
  matchingSkus: matchingSeedSlugs.length,
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
  const demoPasswordHash = await hashPassword('gubugu-demo');

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

    for (const [key, viewer] of demoViewerEntries as Array<
      [DemoViewerKey, (typeof demoViewers)[DemoViewerKey]]
    >) {
      await tx
        .insert(localAuthAccounts)
        .values({
          userId: viewer.userId,
          email: localDemoAuthEmailByKey[key],
          passwordHash: demoPasswordHash,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
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
            quantity: row.quantity ?? 1,
            tradableQuantity: row.tradableQuantity ?? 0,
            wishlistPriority: row.wishlistPriority ?? 'normal',
            note: row.note,
            litAt: row.litAt ?? null,
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

    const matchingGoodsRows = await tx
      .select({
        id: goods.id,
        name: goods.name,
        slug: goods.slug,
        skuCode: goods.skuCode,
        goodsType: goods.goodsType,
      })
      .from(goods)
      .where(inArray(goods.slug, [...matchingSeedSlugs]));

    const goodsBySlug = new Map(
      matchingGoodsRows.map((row) => [
        row.slug,
        {
          id: row.id,
          name: row.name,
          slug: row.slug,
          skuCode: row.skuCode,
          goodsType: row.goodsType,
          primaryImageUrl: null,
        },
      ]),
    );

    // 换谷匹配演示：布置 exchange / wanted 关系，保证匹配引擎能算出双向 + 三方。
    for (const row of buildMatchingUserGoods(goodsBySlug)) {
      await tx
        .insert(userGoods)
        .values(row as typeof userGoods.$inferInsert)
        .onConflictDoUpdate({
          target: [userGoods.userId, userGoods.goodsId, userGoods.status],
          set: {
            quantity: row.quantity,
            tradableQuantity: row.tradableQuantity,
            wishlistPriority: row.wishlistPriority,
            note: row.note,
            litAt: row.litAt ?? null,
            updatedAt: now,
          },
        });
    }

    // 固定一笔已完成的双账号验收单与双向评价，便于验证信誉聚合；其余三账号
    // exchange/wanted 关系继续用于实时双向与三方匹配验收。
    const completedOffered = goodsBySlug.get(matchingSeedSlugs[0]);
    const completedRequested = goodsBySlug.get(matchingSeedSlugs[1]);
    const completedExchangeId = '40000000-0000-4000-8000-000000000001';
    if (completedOffered && completedRequested) {
      await tx
        .insert(exchanges)
        .values({
          id: completedExchangeId,
          initiatorId: demoViewers.collector.userId,
          recipientId: demoViewers.trader.userId,
          offeredGoodsId: completedOffered.id,
          requestedGoodsId: completedRequested.id,
          status: 'completed',
          fulfillmentMethod: 'shipping',
          offeredGoodsSnapshot: {
            ...completedOffered,
            exchangeQuantity: 1,
          },
          requestedGoodsSnapshot: {
            ...completedRequested,
            exchangeQuantity: 1,
          },
          initiatorConditionSnapshot: { note: '演示品相：近全新' },
          recipientConditionSnapshot: { note: '演示品相：未拆封' },
          note: '用于重复执行迁移与种子后的换谷闭环验收。',
          proposedAt: daysAgo(now, 8),
          acceptedAt: daysAgo(now, 7),
          shippedAt: daysAgo(now, 5),
          receivedAt: daysAgo(now, 2),
          completedAt: daysAgo(now, 2),
          initiatorShippedAt: daysAgo(now, 5),
          recipientShippedAt: daysAgo(now, 5),
          initiatorReceivedAt: daysAgo(now, 2),
          recipientReceivedAt: daysAgo(now, 2),
          createdAt: daysAgo(now, 8),
          updatedAt: daysAgo(now, 2),
        })
        .onConflictDoNothing({ target: exchanges.id });

      for (const review of [
        {
          id: '41000000-0000-4000-8000-000000000001',
          reviewerId: demoViewers.collector.userId,
          revieweeId: demoViewers.trader.userId,
          score: 5,
          note: '演示评价：沟通顺畅，包装仔细。',
        },
        {
          id: '41000000-0000-4000-8000-000000000002',
          reviewerId: demoViewers.trader.userId,
          revieweeId: demoViewers.collector.userId,
          score: 5,
          note: '演示评价：确认与收货都很及时。',
        },
      ]) {
        await tx
          .insert(exchangeReviews)
          .values({ ...review, exchangeId: completedExchangeId })
          .onConflictDoUpdate({
            target: [exchangeReviews.exchangeId, exchangeReviews.reviewerId],
            set: { score: review.score, note: review.note, updatedAt: now },
          });
      }
    }

    // 公开换谷帖 + 正式议价 + 私信：全部使用固定 id，重复 seed 不会生成
    // 重复协商或未读消息。初始出价不计议价，演示链停在第 1/3 次反提。
    const collectorOffer = goodsBySlug.get(matchingSeedSlugs[0]);
    const traderOffer = goodsBySlug.get(matchingSeedSlugs[1]);
    const reviewerOffer = goodsBySlug.get(matchingSeedSlugs[2]);
    const reviewerAlternative = goodsBySlug.get(matchingSeedSlugs[3]);
    if (collectorOffer && traderOffer && reviewerOffer && reviewerAlternative) {
      const strictListingId = '50000000-0000-4000-8000-000000000001';
      const openListingId = '50000000-0000-4000-8000-000000000002';
      for (const listing of [
        {
          id: strictListingId,
          goodsId: traderOffer.id,
          wantedGoodsId: reviewerOffer.id,
          userId: demoViewers.trader.userId,
          offerPolicy: 'wishlist_only' as const,
          description: '未拆封重复吧唧，优先换愿望单里的双人色纸。',
          conditionNote: '未拆封，外袋平整。',
          locationHint: '上海，可邮寄或市区面交。',
        },
        {
          id: openListingId,
          goodsId: collectorOffer.id,
          wantedGoodsId: traderOffer.id,
          userId: demoViewers.collector.userId,
          offerPolicy: 'open_to_offers' as const,
          description: '重复入手的立牌；愿望单优先，也愿意看看同系列其他谷。',
          conditionNote: '拆检后回袋，无明显瑕疵。',
          locationHint: '杭州，邮寄优先。',
        },
      ]) {
        await tx
          .insert(exchangeListings)
          .values({
            ...listing,
            status: 'open',
            offeredQuantity: 1,
            allowMulti: false,
            allowCash: false,
            fulfillmentMethod: 'either',
            moderationStatus: 'approved',
            createdAt: daysAgo(now, 3),
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: exchangeListings.id,
            set: {
              goodsId: listing.goodsId,
              wantedGoodsId: listing.wantedGoodsId,
              userId: listing.userId,
              status: 'open',
              offeredQuantity: 1,
              offerPolicy: listing.offerPolicy,
              description: listing.description,
              conditionNote: listing.conditionNote,
              locationHint: listing.locationHint,
              allowCash: false,
              fulfillmentMethod: 'either',
              moderationStatus: 'approved',
              updatedAt: now,
            },
          });
      }

      const offerId = '51000000-0000-4000-8000-000000000001';
      await tx
        .insert(exchangeOffers)
        .values({
          id: offerId,
          listingId: strictListingId,
          proposerId: demoViewers.reviewer.userId,
          recipientId: demoViewers.trader.userId,
          awaitingUserId: demoViewers.reviewer.userId,
          status: 'pending',
          counterCount: 1,
          createdAt: daysAgo(now, 2),
          updatedAt: daysAgo(now, 1),
        })
        .onConflictDoUpdate({
          target: exchangeOffers.id,
          set: {
            listingId: strictListingId,
            proposerId: demoViewers.reviewer.userId,
            recipientId: demoViewers.trader.userId,
            awaitingUserId: demoViewers.reviewer.userId,
            status: 'pending',
            counterCount: 1,
            acceptedExchangeId: null,
            decidedAt: null,
            updatedAt: daysAgo(now, 1),
          },
        });
      for (const revision of [
        {
          id: '51100000-0000-4000-8000-000000000001',
          revisionNumber: 0,
          actorId: demoViewers.reviewer.userId,
          offeredGoodsId: reviewerOffer.id,
          offeredConditionNote: '色纸未拆，四角平整。',
          message: '可以用愿望单里的双人色纸一换一。',
          createdAt: daysAgo(now, 2),
        },
        {
          id: '51100000-0000-4000-8000-000000000002',
          revisionNumber: 1,
          actorId: demoViewers.trader.userId,
          offeredGoodsId: reviewerAlternative.id,
          offeredConditionNote: '以对方可换记录为准。',
          message: '色纸我刚收到一张；这枚镭射徽章也可以的话，我愿意成交。',
          createdAt: daysAgo(now, 1),
        },
      ]) {
        await tx
          .insert(exchangeOfferRevisions)
          .values({
            ...revision,
            offerId,
            requestedGoodsId: traderOffer.id,
            offeredQuantity: 1,
            requestedQuantity: 1,
            fulfillmentMethod: 'shipping',
            requestedConditionNote: '未拆封，外袋平整。',
            updatedAt: revision.createdAt,
          })
          .onConflictDoUpdate({
            target: [
              exchangeOfferRevisions.offerId,
              exchangeOfferRevisions.revisionNumber,
            ],
            set: {
              actorId: revision.actorId,
              offeredGoodsId: revision.offeredGoodsId,
              requestedGoodsId: traderOffer.id,
              offeredQuantity: 1,
              requestedQuantity: 1,
              fulfillmentMethod: 'shipping',
              offeredConditionNote: revision.offeredConditionNote,
              requestedConditionNote: '未拆封，外袋平整。',
              message: revision.message,
              updatedAt: revision.createdAt,
            },
          });
      }

      const conversationFixtures = [
        {
          id: '52000000-0000-4000-8000-000000000001',
          memberAId: demoViewers.collector.userId,
          memberBId: demoViewers.trader.userId,
        },
        {
          id: '52000000-0000-4000-8000-000000000002',
          memberAId: demoViewers.trader.userId,
          memberBId: demoViewers.reviewer.userId,
        },
      ];
      const conversationIds = new Map<string, string>();
      for (const conversation of conversationFixtures) {
        const [persistedConversation] = await tx
          .insert(directConversations)
          .values({
            ...conversation,
            lastMessageAt: daysAgo(now, 1),
            createdAt: daysAgo(now, 3),
            updatedAt: daysAgo(now, 1),
          })
          .onConflictDoUpdate({
            target: [
              directConversations.memberAId,
              directConversations.memberBId,
            ],
            set: { lastMessageAt: daysAgo(now, 1), updatedAt: daysAgo(now, 1) },
          })
          .returning({ id: directConversations.id });

        conversationIds.set(conversation.id, persistedConversation.id);
      }
      const collectorTraderConversationId = conversationIds.get(
        conversationFixtures[0].id,
      );
      const traderReviewerConversationId = conversationIds.get(
        conversationFixtures[1].id,
      );
      if (!collectorTraderConversationId || !traderReviewerConversationId) {
        throw new Error('Failed to resolve seeded direct conversations.');
      }
      for (const message of [
        {
          id: '53000000-0000-4000-8000-000000000001',
          conversationId: collectorTraderConversationId,
          senderId: demoViewers.collector.userId,
          body: '你好，看到你那枚春日花园吧唧，想先确认一下外袋情况。',
          readAt: daysAgo(now, 1),
          createdAt: daysAgo(now, 2),
        },
        {
          id: '53000000-0000-4000-8000-000000000002',
          conversationId: collectorTraderConversationId,
          senderId: demoViewers.trader.userId,
          body: '外袋平整，吧唧本体未拆；正式数量和履约方式还是以协商方案为准。',
          readAt: null,
          createdAt: daysAgo(now, 1),
        },
        {
          id: '53000000-0000-4000-8000-000000000003',
          conversationId: traderReviewerConversationId,
          senderId: demoViewers.trader.userId,
          body: '我刚反提了镭射徽章方案，你可以在协商页核对后决定。',
          readAt: null,
          createdAt: daysAgo(now, 1),
        },
      ]) {
        await tx
          .insert(directMessages)
          .values({
            ...message,
            status: 'visible',
            updatedAt: message.createdAt,
          })
          .onConflictDoUpdate({
            target: directMessages.id,
            set: {
              body: message.body,
              status: 'visible',
              readAt: message.readAt,
              updatedAt: message.createdAt,
            },
          });
      }
      await tx
        .insert(notifications)
        .values({
          id: '54000000-0000-4000-8000-000000000001',
          recipientId: demoViewers.collector.userId,
          actorId: demoViewers.trader.userId,
          type: 'message_received',
          conversationId: collectorTraderConversationId,
          payload: { messageId: '53000000-0000-4000-8000-000000000002' },
          readAt: null,
          createdAt: daysAgo(now, 1),
          updatedAt: daysAgo(now, 1),
        })
        .onConflictDoUpdate({
          target: notifications.id,
          set: { readAt: null, updatedAt: daysAgo(now, 1) },
        });
    }

    for (const [followerId, followingId] of [
      [profileSeed[0].id, profileSeed[1].id],
      [profileSeed[0].id, profileSeed[2].id],
      [profileSeed[1].id, profileSeed[2].id],
    ]) {
      await tx
        .insert(follows)
        .values({ followerId, followingId, createdAt: now, updatedAt: now })
        .onConflictDoNothing({
          target: [follows.followerId, follows.followingId],
        });
    }

    // 収蔵記録回填：种子的已点亮收藏是直接写入的，不会像真实点亮那样触发成就
    // 判定。这里按最终状态补记每位用户已达成的「数量 / 品类广度」全局徽章，让
    // 演示与验收看到真实解锁；成套补全类会在用户下一次真实点亮时按现有流程记录，
    // 种子不制造满套集合，所以这里不回填作用域类。
    const achievementDefs = await tx
      .select({
        id: achievements.id,
        code: achievements.code,
        name: achievements.name,
        description: achievements.description,
        kind: achievements.kind,
        threshold: achievements.threshold,
      })
      .from(achievements);

    if (achievementDefs.length > 0) {
      const perUserTotals = await tx
        .select({
          userId: userGoods.userId,
          owned: sql<number>`count(*)::int`,
          breadth: sql<number>`count(distinct ${goods.goodsType})::int`,
        })
        .from(userGoods)
        .innerJoin(goods, eq(goods.id, userGoods.goodsId))
        .innerJoin(series, eq(series.id, goods.seriesId))
        .innerJoin(ips, eq(ips.id, series.ipId))
        .where(
          and(
            eq(userGoods.status, 'owned'),
            isNotNull(userGoods.litAt),
            eq(goods.status, 'published'),
            eq(series.status, 'published'),
            eq(ips.status, 'published'),
          ),
        )
        .groupBy(userGoods.userId);

      for (const totals of perUserTotals) {
        const unlocks = evaluateAchievements({
          definitions: achievementDefs,
          ownedTotal: totals.owned,
          typeBreadthTotal: totals.breadth,
          scopes: [],
          alreadyUnlocked: new Set<string>(),
        });

        if (unlocks.length === 0) {
          continue;
        }

        await tx
          .insert(userAchievements)
          .values(
            unlocks.map((unlock) => ({
              userId: totals.userId,
              achievementId: unlock.achievementId,
              scopeId: unlock.scopeId,
              achievedAt: now,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onConflictDoNothing();
      }
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
