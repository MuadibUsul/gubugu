import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type {
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
};

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
}: SearchResultsProps) {
  if (state === 'error' || !result) {
    return (
      <SearchPanelState
        actionHref="/search"
        actionLabel="返回搜索页"
        description="当前搜索结果暂时不可用，请稍后重试。"
        eyebrow="搜索不可用"
        title="搜索结果加载失败"
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

    return matchedTag?.name ?? slug;
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
        actionLabel="查看全部已发布商品"
        description="当前关键词和筛选条件没有命中任何商品。你可以放宽查询范围，或清掉部分筛选后重新查看更大的图鉴范围。"
        eyebrow="没有结果"
        title="这次搜索没有匹配到商品"
        tone="warning"
      />
    );
  }

  return (
    <section className="space-y-5">
      <div className="collection-panel p-6 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              搜索结果
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                {result.query ? `“${result.query}” 的搜索结果` : '最新已发布商品'}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7 sm:text-base">
                共找到 {result.total} 条结果。当前第 {result.page} / {totalPages}{' '}
                页。结果会保持 SKU 优先，同时继续向上链接到 IP、系列和角色图鉴视图。
              </p>
            </div>
          </div>

          <div className="hud-chip text-muted-foreground px-4 py-2 text-sm">
            每页 {result.pageSize} 条
          </div>
        </div>

        {activeFilterLabels.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {activeFilterLabels.map((label) => (
              <span className="hud-chip px-3 py-1.5 text-sm" key={label}>
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-5 text-sm leading-7">
            当前没有额外筛选条件，列表展示的是更完整的已发布商品图鉴。
          </p>
        )}
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {result.items.map((item) => (
          <SearchResultCard item={item} key={item.id} />
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
