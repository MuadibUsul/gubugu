import 'server-only';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { goodsWatches } from '@/drizzle/schema';
import {
  getGoodsDetailPageData,
  type GoodsDetailPageData,
} from '@/server/data/catalog';
import {
  getGoodsCommunityData,
  type GoodsPostListItem,
  type GoodsRatingSummary,
} from '@/server/data/community';
import {
  createEmptyUserGoodsStateSnapshot,
  getUserGoodsStateFlags,
  getUserGoodsStateForGood,
  type UserGoodsStateSnapshot,
} from '@/server/data/user-goods';
import { getDb } from '@/server/db/client';

const goodsDetailViewInputSchema = z.object({
  goodsSlug: z.string().trim().min(1),
  userId: z.string().uuid().optional(),
});

export type GoodsDetailViewData = {
  goods: GoodsDetailPageData;
  viewer: {
    userId: string | null;
    state: UserGoodsStateSnapshot;
    isInCabinet: boolean;
    isLit: boolean;
    isOwned: boolean;
    isWanted: boolean;
    isExchange: boolean;
    activeStatuses: Array<'owned' | 'wanted' | 'exchange'>;
    isWatching: boolean;
  };
  community: {
    ratingSummary: GoodsRatingSummary;
    posts: {
      items: GoodsPostListItem[];
      total: number;
      page: number;
      pageSize: number;
    };
  };
};

export async function getGoodsDetailViewData(
  input: z.input<typeof goodsDetailViewInputSchema>,
) {
  const { goodsSlug, userId } = goodsDetailViewInputSchema.parse(input);
  const goods = await getGoodsDetailPageData({
    goodsSlug,
  });

  if (!goods) {
    return null;
  }

  const [viewerState, watchRows, community] = await Promise.all([
    userId
      ? getUserGoodsStateForGood({
          userId,
          goodsId: goods.id,
        })
      : Promise.resolve(null),
    userId
      ? getDb()
          .select({ userId: goodsWatches.userId })
          .from(goodsWatches)
          .where(
            and(
              eq(goodsWatches.userId, userId),
              eq(goodsWatches.goodsId, goods.id),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    getGoodsCommunityData({
      goodsId: goods.id,
      userId,
      page: 1,
      pageSize: 12,
    }),
  ]);

  const resolvedState =
    viewerState ?? createEmptyUserGoodsStateSnapshot(goods.id);
  const flags = getUserGoodsStateFlags(resolvedState);

  return {
    goods,
    viewer: {
      userId: userId ?? null,
      state: resolvedState,
      isInCabinet: flags.isInCabinet,
      isLit: flags.isLit,
      isOwned: flags.isOwned,
      isWanted: flags.isWanted,
      isExchange: flags.isExchange,
      activeStatuses: flags.activeStatuses,
      isWatching: watchRows.length > 0,
    },
    community,
  } satisfies GoodsDetailViewData;
}
