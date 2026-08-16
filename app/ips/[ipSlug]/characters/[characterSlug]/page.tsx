import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { CharacterSheet } from '@/components/character/character-sheet';
import { CharacterSheetFilters } from '@/components/character/character-sheet-filters';
import { CharacterSheetHeader } from '@/components/character/character-sheet-header';
import type { CharacterPageControls } from '@/components/character/character-query';
import {
  defaultDemoViewerKey,
  demoViewers,
  type DemoViewerKey,
} from '@/lib/config/demo-viewers';
import {
  getMultiSearchParamValues,
  getSingleSearchParamValue,
} from '@/lib/search-params';
import { getAuthUser } from '@/server/auth/session';
import {
  getCharacterEncyclopediaViewData,
  type CharacterCollectionGoodsCard,
} from '@/server/data';

export const metadata: Metadata = {
  title: '角色图鉴',
  description: '浏览角色关联商品、点亮进度与高密度收藏筛选。',
};

const characterPageParamsSchema = z.object({
  ipSlug: z.string().trim().min(1),
  characterSlug: z.string().trim().min(1),
});

const characterPageSearchSchema = z.object({
  view: z.enum(['goods', 'progress']).default('goods'),
  goodsType: z.string().trim().min(1).optional(),
  seriesSlug: z.string().trim().min(1).optional(),
  tagSlugs: z.array(z.string().trim().min(1)).max(12).default([]),
  ownedOnly: z.boolean().default(false),
  viewer: z.string().trim().min(1).default(defaultDemoViewerKey),
});

type CharacterPageProps = {
  params: Promise<{
    ipSlug: string;
    characterSlug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveDemoViewer(input?: string): {
  key: DemoViewerKey;
  label: string;
  userId: string;
} {
  if (input && input in demoViewers) {
    const key = input as DemoViewerKey;

    return {
      key,
      ...demoViewers[key],
    };
  }

  return {
    key: defaultDemoViewerKey,
    ...demoViewers[defaultDemoViewerKey],
  };
}

function buildCharacterPageControls({
  searchParams,
  viewerKey,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  viewerKey: string;
}) {
  return characterPageSearchSchema.parse({
    view: getSingleSearchParamValue(searchParams.view),
    goodsType: getSingleSearchParamValue(searchParams.goodsType),
    seriesSlug: getSingleSearchParamValue(searchParams.series),
    tagSlugs: Array.from(
      new Set(
        getMultiSearchParamValues(searchParams.tag).map((tag) => tag.trim()),
      ),
    ).filter(Boolean),
    ownedOnly: getSingleSearchParamValue(searchParams.owned) === '1',
    viewer: viewerKey,
  }) satisfies Omit<CharacterPageControls, 'ipSlug' | 'characterSlug'>;
}

function applyCharacterFilters({
  items,
  controls,
}: {
  items: CharacterCollectionGoodsCard[];
  controls: CharacterPageControls;
}) {
  return items.filter((item) => {
    if (controls.goodsType && item.goodsType !== controls.goodsType) {
      return false;
    }

    if (controls.seriesSlug && item.series.slug !== controls.seriesSlug) {
      return false;
    }

    if (controls.ownedOnly && !item.isOwned) {
      return false;
    }

    if (
      controls.tagSlugs.length > 0 &&
      !controls.tagSlugs.every((tagSlug) =>
        item.tags.some((tag) => tag.slug === tagSlug),
      )
    ) {
      return false;
    }

    return true;
  });
}

export default async function CharacterPage({
  params,
  searchParams,
}: CharacterPageProps) {
  const routeParams = characterPageParamsSchema.parse(await params);
  const resolvedSearchParams = (await searchParams) ?? {};
  const authUser = await getAuthUser();
  const demoViewer = resolveDemoViewer(
    getSingleSearchParamValue(resolvedSearchParams.viewer),
  );
  const activeViewer = authUser
    ? {
        key: 'auth',
        label: `${authUser.displayLabel} · 已登录`,
        userId: authUser.id,
      }
    : demoViewer;
  const filters = buildCharacterPageControls({
    searchParams: resolvedSearchParams,
    viewerKey: activeViewer.key,
  });
  const controls = {
    ipSlug: routeParams.ipSlug,
    characterSlug: routeParams.characterSlug,
    ...filters,
  } satisfies CharacterPageControls;
  const data = await getCharacterEncyclopediaViewData({
    ipSlug: routeParams.ipSlug,
    characterSlug: routeParams.characterSlug,
    userId: activeViewer.userId,
  });

  if (!data) {
    notFound();
  }

  const filteredGoods = applyCharacterFilters({
    items: data.goods,
    controls,
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <CharacterSheetHeader data={data} viewerLabel={activeViewer.label} />

      <section className="spread py-14">
        <div>
          <p className="lbl">一覧</p>
          <div className="rail-jp">図鑑</div>
        </div>

        <div className="min-w-0">
          <CharacterSheetFilters controls={controls} data={data} />
          <CharacterSheet
            items={filteredGoods}
            totalCount={data.goods.length}
          />
        </div>
      </section>
    </main>
  );
}
