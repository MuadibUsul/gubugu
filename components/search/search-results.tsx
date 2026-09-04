import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { formatTagLabel } from '@/lib/catalog-labels';
import type {
  GoodsCardViewerState,
  GoodsSearchFilterOptions,
  GoodsSearchResult,
} from '@/server/data';

import {
  buildSearchHref,
  formatGoodsTypeLabel,
  type SearchPageControls,
} from './search-query';
import { SearchPanelState } from './search-panel-state';
import { SearchResultCard } from './search-result-card';

type SearchResultsProps = {
  controls: SearchPageControls;
  result?: GoodsSearchResult;
  filterOptions?: GoodsSearchFilterOptions;
  state?: 'ready' | 'error';
  isAuthenticated: boolean;
  /** 当前用户对本页结果的入柜与点亮状态，按 goodsId 索引。 */
  viewerStates?: Record<string, GoodsCardViewerState>;
};

const dormantViewerState = {
  activeStatuses: [],
  isLit: false,
} satisfies GoodsCardViewerState;

function resolveFacetLabel({
  slug,
  options,
}: {
  slug: string | undefined;
  options: Array<{ slug: string; name: string }> | undefined;
}) {
  if (!slug) {
    return null;
  }

  return options?.find((item) => item.slug === slug)?.name ?? slug;
}

export function SearchResults({
  controls,
  result,
  filterOptions,
  state = 'ready',
  isAuthenticated,
  viewerStates = {},
}: SearchResultsProps) {
  if (state === 'error' || !result) {
    return (
      <SearchPanelState
        actionHref="/search"
        actionLabel="返回搜索"
        description="稍后再试。"
        eyebrow="搜索不可用"
        title="结果加载失败"
        tone="error"
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const selectedIpLabel = resolveFacetLabel({
    slug: result.filters.ipSlug,
    options: filterOptions?.ips,
  });
  const selectedCharacterLabel = resolveFacetLabel({
    slug: result.filters.characterSlug,
    options: filterOptions?.characters,
  });
  const selectedSeriesLabel = resolveFacetLabel({
    slug: result.filters.seriesSlug,
    options: filterOptions?.series,
  });
  const selectedTagLabels = result.filters.tagSlugs.map((slug) => {
    const matchedTag = filterOptions?.tags.find((tag) => tag.slug === slug);

    return formatTagLabel(slug, matchedTag?.name ?? slug);
  });
  const activeFilterLabels = [
    result.query ? `关键词：${result.query}` : null,
    result.filters.goodsType
      ? `类型：${formatGoodsTypeLabel(result.filters.goodsType)}`
      : null,
    selectedIpLabel ? `IP：${selectedIpLabel}` : null,
    selectedCharacterLabel ? `角色：${selectedCharacterLabel}` : null,
    selectedSeriesLabel ? `系列：${selectedSeriesLabel}` : null,
    ...selectedTagLabels.map((label) => `标签：${label}`),
  ].filter((item): item is string => Boolean(item));

  if (result.total === 0) {
    return (
      <SearchPanelState
        actionHref="/search"
        actionLabel="查看全部商品"
        description="换个关键词，或减少筛选。"
        eyebrow="没有结果"
        title="这次没找到"
        tone="warning"
      />
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 pb-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="section-kicker hidden sm:inline-flex">检索结果</p>
            <h2 className="font-heading text-foreground text-[clamp(17px,4.6vw,38px)] leading-tight">
              {result.query ? `“${result.query}”` : '全部谷库'}
            </h2>
          </div>

          <div className="chip self-start px-3 py-1.5 text-sm">
            {result.total} 件
          </div>
        </div>

        {activeFilterLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:basis-full">
            {activeFilterLabels.map((label) => (
              <span className="chip px-3 py-1.5 text-[12px]" key={label}>
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {result.items.map((item, index) => (
          <SearchResultCard
            isAuthenticated={isAuthenticated}
            isBestMatch={index === 0 && Boolean(result.query)}
            item={item}
            key={item.id}
            viewerState={viewerStates[item.id] ?? dormantViewerState}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="collection-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-muted-foreground text-sm">
            第 {result.page} / {totalPages} 页
          </p>
          <div className="flex flex-wrap gap-3">
            {result.page > 1 ? (
              <Button asChild variant="outline">
                <Link
                  href={buildSearchHref({
                    ...controls,
                    page: result.page - 1,
                  })}
                >
                  上一页
                </Link>
              </Button>
            ) : null}
            {result.page < totalPages ? (
              <Button asChild>
                <Link
                  href={buildSearchHref({
                    ...controls,
                    page: result.page + 1,
                  })}
                >
                  下一页
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
