'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { formatTagLabel } from '@/lib/catalog-labels';
import type { GoodsSearchFilterOptions } from '@/server/data';

import { formatGoodsTypeLabel, type SearchPageControls } from './search-query';

type SearchFiltersProps = {
  controls: SearchPageControls;
  filterOptions?: GoodsSearchFilterOptions;
};

const controlClassName = 'ui-field h-10 w-full px-3';

export function SearchFilters({ controls, filterOptions }: SearchFiltersProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 64rem)');
    const sync = () => {
      if (detailsRef.current) detailsRef.current.open = media.matches;
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const activeCount =
    Number(Boolean(controls.ipSlug)) +
    Number(Boolean(controls.characterSlug)) +
    Number(Boolean(controls.seriesSlug)) +
    Number(Boolean(controls.goodsType)) +
    controls.tagSlugs.length;
  const tags = filterOptions?.tags ?? [];

  const renderTags = (items: typeof tags) => (
    <div className="flex flex-wrap gap-2">
      {items.map((tag) => {
        const inputId = `search-tag-${tag.slug}`;

        return (
          <label className="cursor-pointer" htmlFor={inputId} key={tag.id}>
            <input
              className="peer sr-only"
              defaultChecked={controls.tagSlugs.includes(tag.slug)}
              id={inputId}
              name="tag"
              type="checkbox"
              value={tag.slug}
            />
            <span className="chip inline-flex px-2.5 py-1 text-[12px] transition-[border-color,background-color,color] duration-150 peer-checked:border-[var(--shu)] peer-checked:bg-[var(--shu-soft)] peer-checked:text-[var(--shu)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--shu)]">
              {formatTagLabel(tag.slug, tag.name)}{' '}
              <span className="ml-1 opacity-60">{tag.goodsCount}</span>
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <form action="/search">
      {controls.query ? (
        <input name="query" type="hidden" value={controls.query} />
      ) : null}
      <details
        className="collection-panel group lg:sticky lg:top-24"
        ref={detailsRef}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 lg:hidden">
          <span className="font-medium">筛选结果</span>
          <span className="num">
            {activeCount ? `${activeCount} 项已选` : '展开'}
          </span>
        </summary>

        <div className="border-border space-y-5 border-t p-4 group-open:block lg:!block lg:border-t-0">
          <div className="hidden items-baseline justify-between lg:flex">
            <h2 className="text-xl">筛选</h2>
            <span className="num">
              {activeCount ? `${activeCount} 项` : '全部'}
            </span>
          </div>

          <label className="block space-y-1.5 text-[12px] text-[var(--ink-2)]">
            IP
            <select
              className={controlClassName}
              defaultValue={controls.ipSlug ?? ''}
              name="ipSlug"
            >
              <option value="">全部 IP</option>
              {(filterOptions?.ips ?? []).map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}（{item.goodsCount}）
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-[12px] text-[var(--ink-2)]">
            角色
            <select
              className={controlClassName}
              defaultValue={controls.characterSlug ?? ''}
              name="characterSlug"
            >
              <option value="">全部角色</option>
              {(filterOptions?.characters ?? []).map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}（{item.goodsCount}）
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-[12px] text-[var(--ink-2)]">
            系列
            <select
              className={controlClassName}
              defaultValue={controls.seriesSlug ?? ''}
              name="seriesSlug"
            >
              <option value="">全部系列</option>
              {(filterOptions?.series ?? []).map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}（{item.goodsCount}）
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-[12px] text-[var(--ink-2)]">
            商品类型
            <select
              className={controlClassName}
              defaultValue={controls.goodsType ?? ''}
              name="goodsType"
            >
              <option value="">全部类型</option>
              {(filterOptions?.goodsTypes ?? []).map((item) => (
                <option key={item.value} value={item.value}>
                  {formatGoodsTypeLabel(item.value)}（{item.goodsCount}）
                </option>
              ))}
            </select>
          </label>

          {tags.length ? (
            <section className="space-y-3">
              <p className="text-[12px] text-[var(--ink-2)]">标签</p>
              {renderTags(tags.slice(0, 8))}
              {tags.length > 8 ? (
                <details>
                  <summary className="cursor-pointer text-[12px] text-[var(--shu)]">
                    更多标签（{tags.length - 8}）
                  </summary>
                  <div className="mt-3">{renderTags(tags.slice(8))}</div>
                </details>
              ) : null}
            </section>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" size="sm" type="submit">
              应用
            </Button>
            {activeCount ? (
              <Button asChild size="sm" variant="outline">
                <a href="/search">重置</a>
              </Button>
            ) : null}
          </div>
        </div>
      </details>
    </form>
  );
}
