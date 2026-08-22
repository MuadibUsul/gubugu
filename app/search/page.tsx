import type { Metadata } from 'next';
import { z } from 'zod';

import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import type { SearchPageControls } from '@/components/search/search-query';
import {
  getSingleSearchParamValue,
  getMultiSearchParamValues,
} from '@/lib/search-params';
import { getAuthUser } from '@/server/auth/session';
import { getGoodsSearchPageData } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';
import { isMobileRequest } from '@/server/device';

export const metadata: Metadata = {
  title: '公共谷库',
  description: '浏览全部谷子，并按关键词、IP、角色、系列和类型定位 SKU。',
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
  const [authUser, canScan] = await Promise.all([
    getAuthUser(),
    isMobileRequest(),
  ]);
  let pageData: Awaited<ReturnType<typeof getGoodsSearchPageData>> | null =
    null;
  let state: 'ready' | 'error' = 'ready';

  try {
    pageData = await getGoodsSearchPageData(
      {
        ...controls,
        pageSize: 12,
      },
      authUser?.id,
    );
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    state = 'error';
  }

  return (
    <main
      className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8"
      data-can-scan={canScan ? 'true' : 'false'}
    >
      <form
        action="/search"
        className="relative overflow-hidden rounded-[26px] border border-[var(--rule)] bg-[linear-gradient(135deg,var(--shu-soft),color-mix(in_oklab,var(--violet-soft)_72%,var(--surface)))] px-5 py-7 sm:px-8 sm:py-9"
      >
        <span className="absolute -top-24 right-[8%] size-60 rounded-full bg-[color-mix(in_oklab,var(--violet)_8%,transparent)] blur-3xl" />
        <div className="relative min-w-0">
          <p className="section-kicker">公共谷库 · 全站 SKU 图鉴</p>
          <h1 className="mt-3 text-[clamp(32px,4vw,48px)] leading-[1.12]">
            每一件都看得见，拥有的才会亮。
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            收进谷柜不会点亮缩略图；扫描现实中的谷子并确认
            SKU，才会恢复它的颜色。
          </p>

          <div className="mt-6 flex max-w-[680px] rounded-[18px] border border-[var(--rule)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-card)] focus-within:border-[var(--shu)]">
            <input
              aria-label="搜索谷子"
              autoComplete="off"
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-[15px] focus-visible:shadow-none sm:px-4"
              defaultValue={controls.query ?? ''}
              name="query"
              placeholder="商品名、型号，或者角色名"
              type="search"
            />
            <button
              className="shrink-0 rounded-[13px] bg-[linear-gradient(135deg,var(--shu),color-mix(in_oklab,var(--shu)_66%,var(--violet)))] px-5 text-[14px] font-bold text-white sm:px-7"
              type="submit"
            >
              搜索 →
            </button>
          </div>
        </div>
      </form>

      <section className="grid gap-6 py-9 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 lg:order-1">
          <SearchFilters
            controls={controls}
            filterOptions={pageData?.filterOptions}
          />
        </div>
        <div className="min-w-0 lg:order-2">
          <SearchResults
            controls={controls}
            filterOptions={pageData?.filterOptions}
            isAuthenticated={Boolean(authUser)}
            result={pageData?.results}
            state={state}
            viewerStates={pageData?.viewerStates}
          />
        </div>
      </section>
    </main>
  );
}
