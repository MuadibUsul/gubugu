import type { Metadata } from 'next';

import { UserAchievementLedger } from '@/components/user/user-achievement-ledger';
import { UserCollectionShowcase } from '@/components/user/user-collection-showcase';
import { UserExchangeListings } from '@/components/user/user-exchange-listings';
import { UserGoodsShelf } from '@/components/user/user-goods-shelf';
import { UserPhotoArchive } from '@/components/user/user-photo-archive';
import {
  UserProfileHero,
  type UserNotebookProfile,
} from '@/components/user/user-profile-hero';
import { UserProgressOverview } from '@/components/user/user-progress-overview';
import { requireAuthUser } from '@/server/auth/session';
import { listAchievementLedger } from '@/server/data/achievements';
import { getUserProfilePageData } from '@/server/data';

export const metadata: Metadata = {
  title: '我的收藏',
  description: '当前登录用户的收藏页。',
};

export const dynamic = 'force-dynamic';

function buildNotebookProfile(
  user: Awaited<ReturnType<typeof requireAuthUser>>,
) {
  return {
    label: '当前账户',
    displayName: user.displayLabel,
    handle: user.handle ?? user.email ?? user.phone ?? null,
    bio: null,
    city: null,
    accentTitle: '收藏档案',
  } satisfies UserNotebookProfile;
}

export default async function MyCollectionPage() {
  const user = await requireAuthUser('/me/collection');
  const profile = buildNotebookProfile(user);
  const data = await getUserProfilePageData({
    userId: user.id,
    viewerMode: 'self',
  });
  const ledger = await listAchievementLedger(user.id);
  const exchangeEntryGoods =
    data.goods.exchange.length > 0 ? data.goods.exchange : data.goods.owned;

  return (
    <main>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-5 py-12 md:px-10 md:py-16">
        <UserProfileHero data={data} profile={profile} />
        <UserCollectionShowcase data={data} />
        <UserProgressOverview data={data} />
        <UserGoodsShelf
          description="已计入收藏进度"
          id="owned-shelf"
          items={data.goods.owned}
          status="owned"
          title="已拥有"
        />
        <UserGoodsShelf
          description="还未入手，但会继续追"
          id="wanted-shelf"
          items={data.goods.wanted}
          status="wanted"
          title="想要"
        />
        <UserGoodsShelf
          description="当前可用于交换"
          id="exchange-shelf"
          items={data.goods.exchange}
          status="exchange"
          title="可交换"
        />
        <UserExchangeListings
          entryGoods={exchangeEntryGoods.map((item) => ({
            id: item.id,
            slug: item.slug,
            name: item.name,
          }))}
          items={data.exchangeListings}
        />
        <UserPhotoArchive items={data.recentPhotoEntries} />
        <UserAchievementLedger
          entries={ledger}
          ownedTotal={data.goods.owned.length}
        />
      </div>
    </main>
  );
}
