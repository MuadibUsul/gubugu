import type { Metadata } from 'next';
import { z } from 'zod';

import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import { Button } from '@/components/ui/button';
import type { SearchPageControls } from '@/components/search/search-query';
import {
  getMultiSearchParamValues,
  getSingleSearchParamValue,
} from '@/lib/search-params';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';
import { getGoodsSearchPageData } from '@/server/data';

export const metadata: Metadata = {
  title: '搜索',
  description:
    '按关键词、IP、角色、系列、谷物类型和标签搜索图鉴。',
};

const searchPageQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  goodsType: z.string().trim().min(1).optional(),
  ipSlug: z.string().trim().min(1).optional(),
  characterSlug: z.string().trim().min(1).optional(),
  seriesSlug: z.string().trim().min(1).optional(),
  tagSlugs: z.array(z.string().trim().min(1)).max(12).default([]),
  page: z.number().int().min(1).default(1),
});

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeOptionalStringParam(
  value: string | string[] | undefined,
): string | undefined {
  const normalized = getSingleSearchParamValue(value)?.trim();

  return normalized ? normalized : undefined;
}

function normalizeSearchControls(
  rawSearchParams: Record<string, string | string[] | undefined>,
) {
  return searchPageQuerySchema.parse({
    query: normalizeOptionalStringParam(rawSearchParams.query),
    goodsType: normalizeOptionalStringParam(rawSearchParams.goodsType),
    ipSlug: normalizeOptionalStringParam(rawSearchParams.ipSlug),
    characterSlug: normalizeOptionalStringParam(rawSearchParams.characterSlug),
    seriesSlug: normalizeOptionalStringParam(rawSearchParams.seriesSlug),
    tagSlugs: Array.from(
      new Set(
        getMultiSearchParamValues(rawSearchParams.tag).map((tag) => tag.trim()),
      ),
    ).filter(Boolean),
    page: parsePositiveInt(getSingleSearchParamValue(rawSearchParams.page)),
  }) satisfies SearchPageControls;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const controls = normalizeSearchControls(resolvedSearchParams);
  let pageData: Awaited<ReturnType<typeof getGoodsSearchPageData>> | null =
    null;
  let state: 'ready' | 'error' = 'ready';

  try {
    pageData = await getGoodsSearchPageData({
      ...controls,
      pageSize: 12,
    });
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    state = 'error';
  }

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_58%)]" />
      <div className="pointer-events-none absolute top-[-4rem] right-[-10rem] size-[24rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_66%)] blur-xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--surface-line)_84%,transparent),transparent)] md:inset-x-10 xl:inset-x-16" />

      <form
        action="/search"
        className="mx-auto flex min-h-screen w-full max-w-[92rem] flex-col gap-6 px-5 py-[5.5rem] md:px-8 md:py-24 xl:px-10 xl:py-24"
      >
        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_94%,transparent)_0%,color-mix(in_oklab,var(--surface-soft)_88%,var(--background))_100%)]" />
          <div className="relative space-y-7">
            <div className="space-y-4">
              <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
                搜索优先图鉴
              </p>
              <div className="space-y-4">
                <h1 className="font-heading text-foreground max-w-5xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5.15rem]">
                  把零散线索重新收束到准确的 SKU 记录
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                  搜索始终是站点主入口，而筛选层也会明确展开：关键词、IP、角色、系列、谷物类型和标签都直接映射到图鉴查询。
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                autoComplete="off"
                className="ui-field-lg h-15 px-5 text-base sm:text-lg"
                defaultValue={controls.query ?? ''}
                name="query"
                placeholder="搜索 IP、角色、系列、SKU 编号或标签"
                type="search"
              />
              <Button
                className="h-15 rounded-[1.35rem] px-7 text-base"
                size="lg"
                type="submit"
              >
                搜索图鉴
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {[
                '关键词会命中 SKU 名称、SKU 编号、系列名、IP 名、角色名和标签。',
                'IP、角色、系列、谷物类型和标签都已经作为 V1 直接筛选项暴露出来。',
                '结果始终保持 SKU 优先，因此收藏状态、评论、评分和交换意向都不会失去核心实体。',
              ].map((item) => (
                <div
                  className="hud-card px-4 py-4 text-sm leading-7"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <SearchFilters
            controls={controls}
            filterOptions={pageData?.filterOptions}
          />
          <SearchResults
            controls={controls}
            filterOptions={pageData?.filterOptions}
            result={pageData?.results}
            state={state}
          />
        </section>
      </form>
    </main>
  );
}
