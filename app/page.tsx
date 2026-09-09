import { Suspense } from 'react';

import {
  HomeAccessionsFallback,
  HomeAccessionsSection,
} from '@/components/home/home-accessions';
import { HomeCarousel, type HomeSlide } from '@/components/home/home-carousel';
import {
  HomeContentsFallback,
  HomeContentsSection,
} from '@/components/home/home-contents';
import { MobileAppHeader } from '@/components/app-shell/mobile-app-header';
import { HomeLeaderboardSection } from '@/components/home/home-leaderboard-band';
import {
  HomeMarketFallback,
  HomeMarketSection,
} from '@/components/home/home-market';
import { listHotIps, searchGoodsCatalog } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';
import { isMobileRequest } from '@/server/device';

async function loadFrontispieceData() {
  try {
    const [ips, goods] = await Promise.all([
      listHotIps({ limit: 24 }),
      // 多取几件用于轮播（首屏精选），统计仍用 total。
      searchGoodsCatalog({ pageSize: 6 }),
    ]);

    return {
      ipCount: ips.length,
      goodsCount: goods.total,
      featuredItems: goods.items,
    };
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    return { ipCount: 0, goodsCount: 0, featuredItems: [] };
  }
}

// 轮播位内容（MVP）：策展 featured（取带图的精选谷子）+ 一张广告位占位卡。
// 真正可运营的广告位（图/链接/排期）等需要时再建 home_slides 表接入。
function buildSlides(
  featured: Awaited<ReturnType<typeof loadFrontispieceData>>['featuredItems'],
): HomeSlide[] {
  const slides: HomeSlide[] = featured
    .filter((item) => item.primaryImageUrl)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      kicker: item.ip.name,
      title: item.name,
      desc: item.ip.name,
      href: `/goods/${item.slug}`,
      imageUrl: item.primaryImageUrl,
    }));

  slides.push({
    id: 'ad-slot',
    kicker: '你的品牌',
    title: '这里可以是你的展位',
    desc: '首屏黄金位 · 支持图文 / 活动 / 新番联动',
    href: '/search',
    imageUrl: null,
    isAd: true,
  });

  return slides;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const accountDeleted = (await searchParams)?.accountDeleted === '1';
  const [frontispiece, canScan] = await Promise.all([
    loadFrontispieceData(),
    isMobileRequest(),
  ]);
  const slides = buildSlides(frontispiece.featuredItems);

  return (
    <main
      className="mx-auto w-full max-w-[1240px] px-4 pt-0 pb-20 sm:px-6 md:px-8 md:pt-8"
      data-can-scan={canScan ? 'true' : 'false'}
    >
      <MobileAppHeader />

      {accountDeleted ? (
        <p className="callout callout--kin mt-4" role="status">
          账号及关联数据已永久删除。
        </p>
      ) : null}

      <HomeCarousel slides={slides} />

      <Suspense fallback={<HomeMarketFallback />}>
        <HomeMarketSection />
      </Suspense>

      <Suspense fallback={<HomeContentsFallback />}>
        <HomeContentsSection />
      </Suspense>

      <Suspense fallback={<HomeAccessionsFallback />}>
        <HomeAccessionsSection />
      </Suspense>

      <Suspense fallback={null}>
        <HomeLeaderboardSection />
      </Suspense>
    </main>
  );
}
