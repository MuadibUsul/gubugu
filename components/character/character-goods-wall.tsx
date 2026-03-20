import Link from 'next/link';

import type { CharacterCollectionGoodsCard } from '@/server/data';

import {
  buildCharacterEncyclopediaHref,
  formatGoodsTypeLabel,
  type CharacterPageControls,
} from './character-query';

type CharacterGoodsWallProps = {
  items: CharacterCollectionGoodsCard[];
  controls: CharacterPageControls;
};

function CharacterGoodsCard({
  item,
  controls,
}: {
  item: CharacterCollectionGoodsCard;
  controls: CharacterPageControls;
}) {
  const detailsHref = `/goods/${item.slug}`;

  return (
    <article
      className={
        item.isOwned
          ? 'group relative overflow-hidden rounded-[1.9rem] border border-[color:color-mix(in_oklab,var(--accent)_60%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_12%,white),color-mix(in_oklab,var(--background)_90%,var(--card)))] shadow-[0_30px_84px_-42px_color-mix(in_oklab,var(--accent)_34%,transparent)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_36px_90px_-40px_color-mix(in_oklab,var(--accent)_40%,transparent)]'
          : 'group border-border/70 bg-card/78 relative overflow-hidden rounded-[1.9rem] border shadow-[0_26px_70px_-42px_color-mix(in_oklab,var(--foreground)_28%,transparent)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_82px_-38px_color-mix(in_oklab,var(--primary)_30%,transparent)]'
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,color-mix(in_oklab,white_16%,transparent)_42%,transparent_100%)]" />

      <div className="border-border/70 relative h-56 overflow-hidden border-b sm:h-64">
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_34%,color-mix(in_oklab,var(--background)_78%,var(--card))_100%)] bg-cover bg-center"
          style={
            item.primaryImageUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, color-mix(in oklab, var(--accent) 12%, transparent), transparent 34%, color-mix(in oklab, var(--background) 78%, var(--card)) 100%), url(${item.primaryImageUrl})`,
                }
              : undefined
          }
        />

        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <span
              className={
                item.isOwned
                  ? 'text-foreground rounded-full border border-[color:color-mix(in_oklab,var(--accent)_70%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_18%,white)] px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase'
                  : 'border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase'
              }
            >
              {item.isOwned ? '已点亮' : '未点亮'}
            </span>
            <span className="border-border/70 bg-card/80 text-muted-foreground rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
              {formatGoodsTypeLabel(item.goodsType)}
            </span>
          </div>

          <div className="max-w-[17rem] rounded-[1.35rem] bg-[color:color-mix(in_oklab,var(--background)_72%,transparent)] px-4 py-3 backdrop-blur">
            <p className="text-muted-foreground text-[0.66rem] font-semibold tracking-[0.28em] uppercase">
              {item.skuCode}
            </p>
            <p className="text-foreground mt-2 text-sm">{item.series.name}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-3">
          <h3 className="font-heading text-foreground text-3xl leading-none">
            <Link
              className="hover:text-primary transition-colors"
              href={detailsHref}
            >
              {item.name}
            </Link>
          </h3>
          {item.description ? (
            <p className="text-muted-foreground text-sm leading-7">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Link
              className="border-border/65 bg-card/72 text-foreground/84 rounded-full border px-3 py-1 text-xs transition hover:-translate-y-0.5"
              href={buildCharacterEncyclopediaHref({
                ...controls,
                tagSlugs: [tag.slug],
              })}
              key={tag.id}
            >
              {tag.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.isWanted ? (
            <span className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
              想要
            </span>
          ) : null}
          {item.isExchange ? (
            <span className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
              可交换
            </span>
          ) : null}
          {item.isOwned ? (
            <span className="text-foreground rounded-full border border-[color:color-mix(in_oklab,var(--accent)_60%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_16%,white)] px-3 py-1 text-xs">
              已拥有并点亮补全
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
            href={detailsHref}
          >
            查看详情
          </Link>
          <Link
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
            href={buildCharacterEncyclopediaHref({
              ...controls,
              seriesSlug: item.series.slug,
              tagSlugs: [],
            })}
          >
            打开系列
          </Link>
          <Link
            className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition"
            href={`/search?query=${encodeURIComponent(item.skuCode)}`}
          >
            搜索 SKU
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CharacterGoodsWall({
  items,
  controls,
}: CharacterGoodsWallProps) {
  return (
    <section className="space-y-5">
      <div className="collection-panel p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              商品墙
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                角色收藏墙
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7 sm:text-base">
                卡片点亮直接映射 `owned` 状态。已点亮卡片保持更明亮的收藏质感，
                未点亮卡片则停留在待收录档案状态。
              </p>
            </div>
          </div>
          <div className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            共展示 {items.length} 张卡片
          </div>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {items.map((item) => (
          <CharacterGoodsCard controls={controls} item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}
