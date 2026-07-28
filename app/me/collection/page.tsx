import type { Metadata } from 'next';

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
  const exchangeEntryGoods =
    data.goods.exchange.length > 0 ? data.goods.exchange : data.goods.owned;

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_56%)]" />
      <div className="pointer-events-none absolute top-[-6rem] right-[-12rem] size-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
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
      </div>
    </main>
  );
}
