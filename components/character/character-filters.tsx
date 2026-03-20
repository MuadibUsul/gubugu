import type { DemoViewerKey } from '@/lib/config/demo-viewers';
import type { CharacterEncyclopediaViewData } from '@/server/data';

import {
  buildCharacterEncyclopediaHref,
  formatGoodsTypeLabel,
  type CharacterPageControls,
} from './character-query';

type CharacterFiltersProps = {
  data: CharacterEncyclopediaViewData;
  controls: CharacterPageControls;
  viewerOptions: Array<{
    key: DemoViewerKey;
    label: string;
  }>;
};

export function CharacterFilters({
  data,
  controls,
  viewerOptions,
}: CharacterFiltersProps) {
  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <form
        action={`/ips/${controls.ipSlug}/characters/${controls.characterSlug}`}
        className="collection-panel p-5 sm:p-6"
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              筛选
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none">
                收束这个角色收藏架
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                在不破坏图鉴浏览氛围的前提下，继续保留系列、类型、标签与
                已拥有点亮筛选。
              </p>
            </div>
          </div>

          {viewerOptions.length > 0 ? (
            <section className="space-y-3">
              <label
                className="text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
                htmlFor="character-viewer"
              >
                收藏视角
              </label>
              <select
                className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 h-11 w-full rounded-[1rem] border px-4 outline-none focus-visible:ring-2"
                defaultValue={controls.viewer}
                id="character-viewer"
                name="viewer"
              >
                {viewerOptions.map((viewer) => (
                  <option key={viewer.key} value={viewer.key}>
                    {viewer.label}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          <section className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
              htmlFor="character-goods-type"
            >
              商品类型
            </label>
            <select
              className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 h-11 w-full rounded-[1rem] border px-4 outline-none focus-visible:ring-2"
              defaultValue={controls.goodsType ?? ''}
              id="character-goods-type"
              name="goodsType"
            >
              <option value="">全部商品类型</option>
              {data.filters.goodsTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {formatGoodsTypeLabel(item.value)} ({item.goodsCount})
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
              htmlFor="character-series"
            >
              系列
            </label>
            <select
              className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 h-11 w-full rounded-[1rem] border px-4 outline-none focus-visible:ring-2"
              defaultValue={controls.seriesSlug ?? ''}
              id="character-series"
              name="series"
            >
              <option value="">全部系列</option>
              {data.filters.series.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name} ({item.goodsCount})
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
                标签
              </p>
              <span className="text-muted-foreground text-xs">
                可多选
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.filters.tags.map((tag) => {
                const inputId = `character-tag-${tag.slug}`;

                return (
                  <label
                    className="cursor-pointer"
                    htmlFor={inputId}
                    key={tag.id}
                  >
                    <input
                      className="peer sr-only"
                      defaultChecked={controls.tagSlugs.includes(tag.slug)}
                      id={inputId}
                      name="tag"
                      type="checkbox"
                      value={tag.slug}
                    />
                    <span className="border-border/70 bg-card/76 text-foreground/84 peer-checked:border-accent peer-checked:bg-accent/14 peer-checked:text-foreground inline-flex rounded-full border px-3 py-1.5 text-sm transition hover:-translate-y-0.5">
                      {tag.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {tag.goodsCount}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <label className="border-border/65 bg-background/76 flex items-start gap-3 rounded-[1.3rem] border px-4 py-4">
              <input
                className="border-border mt-1 size-4 rounded"
                defaultChecked={controls.ownedOnly}
                name="owned"
                type="checkbox"
                value="1"
              />
              <div>
                <p className="text-foreground text-sm font-semibold">
                  仅看已拥有
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  只保留当前查看者状态下已经点亮的商品。
                </p>
              </div>
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
                扩展浏览
              </p>
              <span className="text-muted-foreground text-xs">
                更多维度
              </span>
            </div>
            <div className="grid gap-3">
              {[
                '系列完成度快捷筛选',
                'IP 完成度筛选',
                '发售年份筛选',
                '地区与场贩条件筛选',
              ].map((item) => (
                <div
                  className="border-border/65 bg-background/72 text-muted-foreground rounded-[1.25rem] border border-dashed px-4 py-3 text-sm leading-6"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
              type="submit"
            >
              应用筛选
            </button>
            <a
              className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition"
              href={buildCharacterEncyclopediaHref({
                ...controls,
                goodsType: undefined,
                seriesSlug: undefined,
                tagSlugs: [],
                ownedOnly: false,
              })}
            >
              清空筛选
            </a>
          </div>
        </div>
      </form>
    </aside>
  );
}
