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
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <form action="/search">
        <section className="spread border-border border-b pb-12">
          <div>
            <p className="lbl">检索</p>
            <div className="rail-jp">索引</div>
          </div>

          <div className="min-w-0">
            <h1 className="text-[clamp(28px,3.6vw,44px)] leading-[1.14]">
              先找到正确的条目
            </h1>
            <div className="rule-kin mt-4" />

            {/* 检索框不做 autoFocus：直接进搜索页的人会自己点，从其他页带着
                关键词过来的人则会被强行拉到输入框、页面跳一下。 */}
            <div className="border-input mt-6 flex max-w-[560px] border focus-within:border-[var(--shu)]">
              <input
                autoComplete="off"
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[15px] focus-visible:shadow-none"
                defaultValue={controls.query ?? ''}
                name="query"
                placeholder="商品名、型号，或者角色名"
                type="search"
              />
              <button
                className="shrink-0 bg-[var(--shu)] px-6 text-[14px] font-medium text-[var(--shu-ink)]"
                type="submit"
              >
                搜索
              </button>
            </div>
          </div>
        </section>

        <section className="spread py-12">
          <div>
            <p className="lbl">筛选</p>
            <div className="rail-jp">筛选</div>
          </div>

          <div className="min-w-0">
            <SearchFilters
              controls={controls}
              filterOptions={pageData?.filterOptions}
            />
            <div className="mt-10">
              <SearchResults
                controls={controls}
                filterOptions={pageData?.filterOptions}
                isAuthenticated={Boolean(authUser)}
                result={pageData?.results}
                state={state}
                viewerStatuses={pageData?.viewerStatuses}
              />
            </div>
          </div>
        </section>
      </form>
    </main>
  );
}
