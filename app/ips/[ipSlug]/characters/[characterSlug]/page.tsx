import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { CharacterSheet } from '@/components/character/character-sheet';
import { CharacterSheetFilters } from '@/components/character/character-sheet-filters';
import { CharacterSheetHeader } from '@/components/character/character-sheet-header';
import type { CharacterPageControls } from '@/components/character/character-query';
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
  collected: z.enum(['owned', 'missing']).optional(),
});

type CharacterPageProps = {
  params: Promise<{
    ipSlug: string;
    characterSlug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildCharacterPageControls({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
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
    collected: getSingleSearchParamValue(searchParams.collected),
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

    if (controls.collected === 'owned' && !item.isOwned) {
      return false;
    }

    // 查漏：只留还没有的那几件
    if (controls.collected === 'missing' && item.isOwned) {
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
  const viewerLabel = authUser
    ? `${authUser.displayLabel} · 已登录`
    : '访客 · 登录后查看自己的点亮进度';
  const filters = buildCharacterPageControls({
    searchParams: resolvedSearchParams,
  });
  const controls = {
    ipSlug: routeParams.ipSlug,
    characterSlug: routeParams.characterSlug,
    ...filters,
  } satisfies CharacterPageControls;
  const data = await getCharacterEncyclopediaViewData({
    ipSlug: routeParams.ipSlug,
    characterSlug: routeParams.characterSlug,
    userId: authUser?.id,
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
      <CharacterSheetHeader data={data} viewerLabel={viewerLabel} />
      <div className="mt-5">
        <Link
          className="text-sm text-[var(--shu)] hover:underline"
          href={`/ips/${routeParams.ipSlug}/characters/${routeParams.characterSlug}/circle`}
        >
          查看角色收藏圈 →
        </Link>
      </div>

      <section className="spread py-14">
        <div>
          <p className="lbl">一览</p>
          <div className="rail-jp">图鉴</div>
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
