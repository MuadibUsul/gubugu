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
import { getAuthUser } from '@/server/auth/session';
import {
  getGoodsCardViewerStateMap,
  listHotIps,
  searchGoodsCatalog,
} from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

async function loadFrontispieceData() {
  try {
    const [ips, goods] = await Promise.all([
      listHotIps({ limit: 24 }),
      searchGoodsCatalog({ pageSize: 3 }),
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

export default async function Home() {
  const [frontispiece, authUser] = await Promise.all([
    loadFrontispieceData(),
    getAuthUser(),
  ]);
  const featuredViewerStates = await getGoodsCardViewerStateMap({
    viewerId: authUser?.id,
    goodsIds: frontispiece.featuredItems.map((item) => item.id),
  });

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-20 sm:px-6 md:px-8 md:pt-8">
      <HomeFrontispiece
        featuredItems={frontispiece.featuredItems}
        goodsCount={frontispiece.goodsCount}
        ipCount={frontispiece.ipCount}
        viewerStates={featuredViewerStates}
      />

      <Suspense fallback={<HomeContentsFallback />}>
        <HomeContentsSection />
      </Suspense>

      <Suspense fallback={<HomeAccessionsFallback />}>
        <HomeAccessionsSection viewerId={authUser?.id} />
      </Suspense>

      <HomeIndexSection />
    </main>
  );
}
