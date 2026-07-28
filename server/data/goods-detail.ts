import 'server-only';

import { z } from 'zod';

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
  listExchangeGoodsOptions,
  listGoodsExchangeListings,
  type ExchangeGoodsOption,
  type ExchangeListingViewItem,
} from '@/server/data/exchange';
import {
  createEmptyUserGoodsStateSnapshot,
  getUserGoodsStateFlags,
  getUserGoodsStateForGood,
  type UserGoodsStateSnapshot,
} from '@/server/data/user-goods';

const goodsDetailViewInputSchema = z.object({
  goodsSlug: z.string().trim().min(1),
  userId: z.string().uuid().optional(),
});

export type GoodsDetailViewData = {
  goods: GoodsDetailPageData;
  viewer: {
    userId: string | null;
    state: UserGoodsStateSnapshot;
    isOwned: boolean;
    isWanted: boolean;
    isExchange: boolean;
    activeStatuses: Array<'owned' | 'wanted' | 'exchange'>;
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
  exchange: {
    listings: ExchangeListingViewItem[];
    wantedGoodsOptions: ExchangeGoodsOption[];
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

  const [viewerState, community, exchangeListings, wantedGoodsOptions] =
    await Promise.all([
      userId
        ? getUserGoodsStateForGood({
            userId,
            goodsId: goods.id,
          })
        : Promise.resolve(null),
      getGoodsCommunityData({
        goodsId: goods.id,
        userId,
        page: 1,
        pageSize: 12,
      }),
      listGoodsExchangeListings({
        goodsId: goods.id,
        limit: 6,
      }),
      listExchangeGoodsOptions({
        excludeGoodsId: goods.id,
        limit: 18,
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
      isOwned: flags.isOwned,
      isWanted: flags.isWanted,
      isExchange: flags.isExchange,
      activeStatuses: flags.activeStatuses,
    },
    community,
    exchange: {
      listings: exchangeListings,
      wantedGoodsOptions,
    },
  } satisfies GoodsDetailViewData;
}
