import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
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
      className={`goods-card group ${item.isOwned ? 'goods-card--lit' : 'goods-card--dormant'}`}
    >
      <GoodsCardArt
        alt={item.name}
        className="border-border/70 h-56 border-b sm:h-64"
        imageUrl={item.primaryImageUrl}
        sizes="(max-width: 1535px) 100vw, 50vw"
      >
        <div className="goods-card__art-content flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <span
              className={`hud-chip px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase ${
                item.isOwned ? 'hud-chip--lit' : 'text-muted-foreground'
              }`}
            >
              {item.isOwned ? '已点亮' : '未点亮'}
            </span>
            <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
              {formatGoodsTypeLabel(item.goodsType)}
            </span>
          </div>

          <div className="hud-card max-w-[17rem] px-4 py-3 backdrop-blur">
            <p className="text-muted-foreground text-[0.66rem] font-semibold tracking-[0.28em] uppercase">
              {item.skuCode}
            </p>
            <p className="text-foreground mt-2 text-sm">{item.series.name}</p>
          </div>
        </div>
      </GoodsCardArt>

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
            <span className="hud-chip hud-chip--lit px-3 py-1 text-xs">
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
