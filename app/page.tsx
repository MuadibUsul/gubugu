import { Suspense } from 'react';

import {
  HomeAccessionsFallback,
  HomeAccessionsSection,
} from '@/components/home/home-accessions';
import {
  HomeContentsFallback,
  HomeContentsSection,
} from '@/components/home/home-contents';
import { HomeFrontispiece } from '@/components/home/home-frontispiece';
import { HomeIndexSection } from '@/components/home/home-index';
import { listHotIps, searchGoodsCatalog } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

/**
 * 首页读作一本图录的前几页：扉 → 目次 → 近收藏 → 索引。
 *
 * 不是 hero + 侧栏 + 卡片墙。这个顺序有它的道理：先说明这是什么、收了多少，
 * 再给出可以从哪儿翻进去，最后才是最近新增。
 */
async function loadFrontispieceCounts() {
  try {
    const [ips, goods] = await Promise.all([
      listHotIps({ limit: 24 }),
      searchGoodsCatalog({ pageSize: 1 }),
    ]);

    return { ipCount: ips.length, goodsCount: goods.total };
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    // 数字读不出来时给 0 而不是让整页失败 —— 扉页的其余部分仍然有用。
    return { ipCount: 0, goodsCount: 0 };
  }
}

export default async function Home() {
  const counts = await loadFrontispieceCounts();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <HomeFrontispiece
        goodsCount={counts.goodsCount}
        ipCount={counts.ipCount}
      />

      <Suspense fallback={<HomeContentsFallback />}>
        <HomeContentsSection />
      </Suspense>

      <Suspense fallback={<HomeAccessionsFallback />}>
        <HomeAccessionsSection />
      </Suspense>

      <HomeIndexSection />
    </main>
  );
}
