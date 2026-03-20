import type { GoodsSearchFilterOptions } from '@/server/data';

import { Button } from '@/components/ui/button';

import { formatGoodsTypeLabel, type SearchPageControls } from './search-query';

type SearchFiltersProps = {
  controls: SearchPageControls;
  filterOptions?: GoodsSearchFilterOptions;
};

const controlClassName = 'ui-field h-11 px-4';

export function SearchFilters({ controls, filterOptions }: SearchFiltersProps) {
  const hasActiveFilters =
    Boolean(controls.ipSlug) ||
    Boolean(controls.characterSlug) ||
    Boolean(controls.seriesSlug) ||
    Boolean(controls.goodsType) ||
    controls.tagSlugs.length > 0;

  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="collection-panel p-5 sm:p-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              筛选器
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none">
                搜索筛选
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                V1 现在把 IP、角色、系列、谷物类型和标签都直接暴露成筛选项，而不是把部分查询状态藏在上下文链接里。
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold tracking-[0.18em] uppercase">
                图鉴范围
              </h3>
              <span className="text-muted-foreground text-xs">
                IP / 角色 / 系列
              </span>
            </div>

            <div className="space-y-3">
              <label
                className="text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
                htmlFor="search-sidebar-ip"
              >
                IP
              </label>
              <select
                className={controlClassName}
                defaultValue={controls.ipSlug ?? ''}
                id="search-sidebar-ip"
                name="ipSlug"
              >
                <option value="">全部 IP</option>
                {(filterOptions?.ips ?? []).map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name} ({item.goodsCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label
                className="text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
                htmlFor="search-sidebar-character"
              >
                角色
              </label>
              <select
                className={controlClassName}
                defaultValue={controls.characterSlug ?? ''}
                id="search-sidebar-character"
                name="characterSlug"
              >
                <option value="">全部角色</option>
                {(filterOptions?.characters ?? []).map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name} ({item.goodsCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label
                className="text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
                htmlFor="search-sidebar-series"
              >
                系列
              </label>
              <select
                className={controlClassName}
                defaultValue={controls.seriesSlug ?? ''}
                id="search-sidebar-series"
                name="seriesSlug"
              >
                <option value="">全部系列</option>
                {(filterOptions?.series ?? []).map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name} ({item.goodsCount})
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold tracking-[0.18em] uppercase">
                商品特征
              </h3>
              <span className="text-muted-foreground text-xs">类型 + 标签</span>
            </div>

            <div className="space-y-3">
              <label
                className="text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
                htmlFor="search-sidebar-goods-type"
              >
                谷物类型
              </label>
              <select
                className={controlClassName}
                defaultValue={controls.goodsType ?? ''}
                id="search-sidebar-goods-type"
                name="goodsType"
              >
                <option value="">全部谷物类型</option>
                {(filterOptions?.goodsTypes ?? []).map((goodsType) => (
                  <option key={goodsType.value} value={goodsType.value}>
                    {formatGoodsTypeLabel(goodsType.value)} (
                    {goodsType.goodsCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
                标签
              </p>
              <div className="flex flex-wrap gap-2">
                {(filterOptions?.tags ?? []).length > 0 ? (
                  filterOptions?.tags.map((tag) => {
                    const inputId = `search-tag-${tag.slug}`;
                    const isChecked = controls.tagSlugs.includes(tag.slug);

                    return (
                      <label
                        className="cursor-pointer"
                        htmlFor={inputId}
                        key={tag.id}
                      >
                        <input
                          className="peer sr-only"
                          defaultChecked={isChecked}
                          id={inputId}
                          name="tag"
                          type="checkbox"
                          value={tag.slug}
                        />
                        <span className="hud-chip text-foreground/84 peer-checked:border-accent peer-checked:bg-accent/14 peer-checked:text-foreground inline-flex px-3 py-1.5 text-sm transition hover:-translate-y-0.5">
                          {tag.name}
                          <span className="text-muted-foreground ml-2 text-xs">
                            {tag.goodsCount}
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="hud-card text-muted-foreground border-dashed px-4 py-4 text-sm leading-7">
                    暂时还没有可用的标签分面。
                  </div>
                )}
              </div>
            </div>
          </section>

          {hasActiveFilters ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold tracking-[0.18em] uppercase">
                  当前筛选
                </h3>
                <span className="text-muted-foreground text-xs">
                  当前查询范围
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {controls.ipSlug ? (
                  <span className="hud-chip px-3 py-1.5 text-sm">
                    IP：{controls.ipSlug}
                  </span>
                ) : null}
                {controls.characterSlug ? (
                  <span className="hud-chip px-3 py-1.5 text-sm">
                    角色：{controls.characterSlug}
                  </span>
                ) : null}
                {controls.seriesSlug ? (
                  <span className="hud-chip px-3 py-1.5 text-sm">
                    系列：{controls.seriesSlug}
                  </span>
                ) : null}
                {controls.goodsType ? (
                  <span className="hud-chip px-3 py-1.5 text-sm">
                    类型：{formatGoodsTypeLabel(controls.goodsType)}
                  </span>
                ) : null}
                {controls.tagSlugs.map((tagSlug) => (
                  <span className="hud-chip px-3 py-1.5 text-sm" key={tagSlug}>
                    标签：{tagSlug}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit">应用筛选</Button>
            <Button asChild variant="outline">
              <a href="/search">重置搜索</a>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
