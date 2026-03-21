import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { PageViewSwitch } from '@/components/layout/page-view-switch';
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const userPageSearchSchema = z.object({
  section: z
    .enum(['owned', 'wanted', 'exchange', 'board', 'photos'])
    .default('owned'),
});

function resolveViewer(viewerKey: string) {
  if (viewerKey in demoViewers) {
    const key = viewerKey as DemoViewerKey;

    return demoViewers[key];
  }

  return null;
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { viewerKey } = await params;
  const profile = resolveViewer(viewerKey);

  return {
    title: profile ? `${profile.displayName} 的收藏页` : '用户主页',
    description: profile
      ? `${profile.displayName} 的收藏页、交换板与图片归档。`
      : '收藏者主页',
  };
}

export default async function UserPage({
  params,
  searchParams,
}: UserPageProps) {
  const { viewerKey } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const profile = resolveViewer(viewerKey);

  if (!profile) {
    notFound();
  }

  const section = userPageSearchSchema.parse({
    section: getSingleValue(resolvedSearchParams.section),
  }).section;

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
        <PageViewSwitch
          items={[
            {
              active: section === 'owned',
              badge: `${data.goods.owned.length}`,
              description: '主收藏架，只看已经拥有并点亮的 SKU。',
              href: `/users/${viewerKey}?section=owned`,
              label: '已拥有',
            },
            {
              active: section === 'wanted',
              badge: `${data.goods.wanted.length}`,
              description: '目标清单单独展开，不和主收藏混排。',
              href: `/users/${viewerKey}?section=wanted`,
              label: '想要',
            },
            {
              active: section === 'exchange',
              badge: `${data.goods.exchange.length}`,
              description: '把可交换库存折叠成独立视图，浏览更快。',
              href: `/users/${viewerKey}?section=exchange`,
              label: '交换库存',
            },
            {
              active: section === 'board',
              badge: `${data.exchangeListings.length}`,
              description: '直接进入交换板，查看挂单和目标。 ',
              href: `/users/${viewerKey}?section=board`,
              label: '交换板',
            },
            {
              active: section === 'photos',
              badge: `${data.recentPhotoEntries.length}`,
              description: '图片归档独立出来，避免整页继续下拉。',
              href: `/users/${viewerKey}?section=photos`,
              label: '图片归档',
            },
          ]}
        />

        {section === 'owned' ? (
          <UserGoodsShelf
            description="已拥有条目构成收藏册主体，当前视图只保留最常查看的一层内容。"
            id="owned-shelf"
            items={data.goods.owned}
            status="owned"
            title="已拥有收藏架"
          />
        ) : null}

        {section === 'wanted' ? (
          <UserGoodsShelf
            description="想要条目单独整理成目标层，方便继续补角色线与系列线。"
            id="wanted-shelf"
            items={data.goods.wanted}
            status="wanted"
            title="想要收藏架"
          />
        ) : null}

        {section === 'exchange' ? (
          <UserGoodsShelf
            description="可交换库存从主收藏里拆出，重复品和轮换库存可以集中查看。"
            id="exchange-shelf"
            items={data.goods.exchange}
            status="exchange"
            title="可交换收藏架"
          />
        ) : null}

        {section === 'board' ? (
          <UserExchangeListings
            entryGoods={exchangeEntryGoods.map((item) => ({
              id: item.id,
              slug: item.slug,
              name: item.name,
            }))}
            items={data.exchangeListings}
          />
        ) : null}

        {section === 'photos' ? (
          <UserPhotoArchive items={data.recentPhotoEntries} />
        ) : null}
      </div>
    </main>
  );
}
