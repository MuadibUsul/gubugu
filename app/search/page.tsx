import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';

import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import {
  formatGoodsTypeLabel,
  type SearchPageControls,
} from '@/components/search/search-query';
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
  const hasFacets = Boolean(
    controls.query ||
    controls.ipSlug ||
    controls.characterSlug ||
    controls.seriesSlug ||
    controls.goodsType ||
    controls.tagSlugs.length,
  );
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
      <form action="/search" className="py-3">
        <div className="relative min-w-0">
          <div className="flex rounded-[10px] border border-[var(--rule)] bg-[var(--surface)] p-1.5 focus-within:border-[var(--shu)]">
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

      {/* 筛选胶囊条（对齐设计稿「谷库」）：全部 + 维度快捷入口。 */}
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Link
          className={`chip flex-none px-[11px] py-[5px] text-[11.5px] ${hasFacets ? '' : 'chip--on'}`}
          href="/search"
        >
          全部
        </Link>
        {['IP', '角色', '系列', '类型'].map((label) => (
          <a
            className="chip flex-none px-[11px] py-[5px] text-[11.5px]"
            href="#filters"
            key={label}
          >
            {label}
          </a>
        ))}
      </div>

      {/* 发现区（从首页迁来）：按类型逛谷 + 排行榜入口。有搜索/筛选时收起，只看结果。 */}
      {!hasFacets && (pageData?.filterOptions?.goodsTypes.length ?? 0) > 0 ? (
        <section className="mt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-medium">按类型逛谷</h2>
            <Link
              className="flex-none text-[12px] font-medium text-[var(--shu)]"
              href="/leaderboard"
            >
              收藏排行榜 →
            </Link>
          </div>
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {pageData?.filterOptions?.goodsTypes.map((type) => (
              <Link
                className="chip flex-none px-[11px] py-[6px] text-[11.5px]"
                href={`/search?goodsType=${encodeURIComponent(type.value)}`}
                key={type.value}
              >
                {formatGoodsTypeLabel(type.value)}{' '}
                <span className="ml-1 opacity-60">{type.goodsCount}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 py-9 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 scroll-mt-16 lg:order-1" id="filters">
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
