import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { CharacterCompletionPanel } from '@/components/character/character-completion-panel';
import { CharacterFilters } from '@/components/character/character-filters';
import { CharacterGoodsWall } from '@/components/character/character-goods-wall';
import { CharacterHero } from '@/components/character/character-hero';
import {
  buildCharacterEncyclopediaHref,
  type CharacterPageControls,
} from '@/components/character/character-query';
import { SearchPanelState } from '@/components/search/search-panel-state';
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
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_56%)]" />
      <div className="pointer-events-none absolute top-[-6rem] right-[-12rem] size-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <CharacterHero
          controls={controls}
          data={data}
          viewerLabel={activeViewer.label}
        />

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <CharacterFilters
            controls={controls}
            data={data}
            viewerOptions={
              authUser
                ? []
                : (
                    Object.entries(demoViewers) as Array<
                      [DemoViewerKey, (typeof demoViewers)[DemoViewerKey]]
                    >
                  ).map(([key, item]) => ({
                    key,
                    label: item.label,
                  }))
            }
          />

          <div className="space-y-6">
            <CharacterCompletionPanel data={data} />

            {filteredGoods.length > 0 ? (
              <CharacterGoodsWall controls={controls} items={filteredGoods} />
            ) : (
              <SearchPanelState
                actionHref={buildCharacterEncyclopediaHref({
                  ...controls,
                  goodsType: undefined,
                  seriesSlug: undefined,
                  tagSlugs: [],
                  ownedOnly: false,
                })}
                actionLabel="清空角色筛选"
                description="当前角色筛选条件下没有匹配商品。可以放宽标签、系列或“仅看已拥有”条件，回到完整收藏墙。"
                eyebrow="没有匹配商品"
                title="当前角色筛选下没有结果"
                tone="warning"
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
