import type { Metadata } from 'next';
import { z } from 'zod';

import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import { Button } from '@/components/ui/button';
import type { SearchPageControls } from '@/components/search/search-query';
import { getSingleSearchParamValue, getMultiSearchParamValues } from '@/lib/search-params';
import { getAuthUser } from '@/server/auth/session';
import { getGoodsSearchPageData } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

export const metadata: Metadata = {
  title: '搜索',
  description: '按关键词、IP、角色、系列、商品类型和标签定位 SKU。',
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
  const authUser = await getAuthUser();
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
        className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col gap-6 px-5 py-[5.5rem] md:px-8 md:py-24 xl:px-10 xl:py-24"
      >
        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_94%,transparent)_0%,color-mix(in_oklab,var(--surface-soft)_88%,var(--background))_100%)]" />
          <div className="relative grid gap-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
                Search
              </p>
              <h1 className="font-heading text-foreground max-w-5xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5.15rem]">
                先找到正确的 SKU
              </h1>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                autoComplete="off"
                autoFocus
                className="ui-field-lg h-15 px-5 text-base sm:text-lg"
                defaultValue={controls.query ?? ''}
                name="query"
                placeholder="角色名、系列名、SKU 编号"
                type="search"
              />
              <Button
                className="h-15 rounded-[1.35rem] px-7 text-base"
                size="lg"
                type="submit"
              >
                搜索
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <SearchFilters
            controls={controls}
            filterOptions={pageData?.filterOptions}
          />
          <SearchResults
            controls={controls}
            filterOptions={pageData?.filterOptions}
            isAuthenticated={Boolean(authUser)}
            result={pageData?.results}
            state={state}
          />
        </section>
      </form>
    </main>
  );
}
