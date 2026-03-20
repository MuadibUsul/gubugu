import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { UserExchangeListings } from '@/components/user/user-exchange-listings';
import { UserGoodsShelf } from '@/components/user/user-goods-shelf';
import { UserPhotoArchive } from '@/components/user/user-photo-archive';
import { UserProfileHero } from '@/components/user/user-profile-hero';
import { UserProgressOverview } from '@/components/user/user-progress-overview';
import { demoViewers, type DemoViewerKey } from '@/lib/config/demo-viewers';
import { getUserProfilePageData } from '@/server/data';

type UserPageProps = {
  params: Promise<{
    viewerKey: string;
  }>;
};

function resolveViewer(viewerKey: string) {
  if (viewerKey in demoViewers) {
    const key = viewerKey as DemoViewerKey;

    return demoViewers[key];
  }

  return null;
}

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { viewerKey } = await params;
  const profile = resolveViewer(viewerKey);

  return {
    title: profile ? `${profile.displayName} 的收藏册` : '用户主页',
    description: profile
      ? `${profile.displayName} 的收藏册、交换板与图片归档页。`
      : '收藏者主页',
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { viewerKey } = await params;
  const profile = resolveViewer(viewerKey);

  if (!profile) {
    notFound();
  }

  const data = await getUserProfilePageData({
    userId: profile.userId,
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
        <UserProgressOverview data={data} />
        <UserGoodsShelf
          description="已拥有条目会构成收藏册的主体，展示当前补全进度、已点亮卡片和已经上架的核心展示品。"
          id="owned-shelf"
          items={data.goods.owned}
          status="owned"
          title="已拥有收藏架"
        />
        <UserGoodsShelf
          description="想要条目会保留下一阶段的收藏目标，方便继续补角色线、系列线和活动线。"
          id="wanted-shelf"
          items={data.goods.wanted}
          status="wanted"
          title="想要收藏架"
        />
        <UserGoodsShelf
          description="可交换条目会和主收藏区分开来，让重复品与轮换库存保持清晰、便于浏览。"
          id="exchange-shelf"
          items={data.goods.exchange}
          status="exchange"
          title="可交换收藏架"
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
