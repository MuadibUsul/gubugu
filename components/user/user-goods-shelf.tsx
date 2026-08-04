import Link from 'next/link';
import type { CSSProperties } from 'react';

import { toCssUrl } from '@/lib/css-url';
import type { UserProfileGoodsCard } from '@/server/data';

type UserGoodsShelfProps = {
  id: string;
  title: string;
  description: string;
  status: 'owned' | 'wanted' | 'exchange';
  items: UserProfileGoodsCard[];
};

const statusLabels = {
  owned: '已拥有',
  wanted: '想要',
  exchange: '可交换',
} as const satisfies Record<UserGoodsShelfProps['status'], string>;

function getShelfAccent(status: UserGoodsShelfProps['status']) {
  switch (status) {
    // Owned is the only lit state: the item is actually in the collection.
    case 'owned':
      return {
        sectionLabel: '点亮收藏',
        cardClass: 'goods-card--lit',
        badgeClass: 'hud-chip--lit',
      };
    // Wanted is not owned yet, so it stays dormant like an unfilled slot.
    case 'wanted':
      return {
        sectionLabel: '目标收藏',
        cardClass: 'goods-card--dormant',
        badgeClass: 'text-muted-foreground',
      };
    case 'exchange':
      return {
        sectionLabel: '轮换库存',
        cardClass: '',
        badgeClass: 'text-muted-foreground',
      };
  }
}

function UserGoodsCard({
  item,
  status,
}: {
  item: UserProfileGoodsCard;
  status: UserGoodsShelfProps['status'];
}) {
  const accent = getShelfAccent(status);
  const primaryCharacter = item.characters[0];
  const artUrl = toCssUrl(item.primaryImageUrl);

  return (
    <article className={`goods-card group ${accent.cardClass}`}>
      <div
        className="goods-card__art border-border/70 h-52 border-b sm:h-60"
        style={
          artUrl ? ({ '--goods-card-art': artUrl } as CSSProperties) : undefined
        }
      >
        <div className="goods-card__art-content flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <span
              className={`hud-chip px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase ${accent.badgeClass}`}
            >
              {statusLabels[status]}
            </span>
            <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
              {item.goodsType}
            </span>
          </div>

          <div className="hud-card max-w-[16rem] px-4 py-3 backdrop-blur">
            <p className="text-muted-foreground text-[0.66rem] font-semibold tracking-[0.28em] uppercase">
              {item.skuCode}
            </p>
            <p className="text-foreground mt-2 text-sm">{item.series.name}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="border-border/65 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
              {item.ip.name}
            </span>
            {primaryCharacter ? (
              <span className="border-border/65 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                {primaryCharacter.name}
              </span>
            ) : null}
          </div>
          <h3 className="font-heading text-foreground text-3xl leading-none">
            {item.name}
          </h3>
          {item.note ? (
            <p className="text-muted-foreground text-sm leading-7">
              {item.note}
            </p>
          ) : item.description ? (
            <p className="text-muted-foreground text-sm leading-7">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              className="border-border/65 bg-card/72 text-foreground/84 rounded-full border px-3 py-1 text-xs"
              key={tag.id}
            >
              {tag.name}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
            href={`/goods/${item.slug}`}
          >
            打开商品详情
          </Link>
          {primaryCharacter ? (
            <Link
              className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition"
              href={`/ips/${item.ip.slug}/characters/${primaryCharacter.slug}`}
            >
              打开角色图鉴
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function UserGoodsShelf({
  id,
  title,
  description,
  status,
  items,
}: UserGoodsShelfProps) {
  const accent = getShelfAccent(status);

  return (
    <section className="space-y-5" id={id}>
      <div className="collection-panel p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              {accent.sectionLabel}
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                {title}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm sm:text-base">
                {description}
              </p>
            </div>
          </div>
          <div className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            共展示 {items.length} 项
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 2xl:grid-cols-2">
          {items.map((item) => (
            <UserGoodsCard
              item={item}
              key={`${status}-${item.id}`}
              status={status}
            />
          ))}
        </div>
      ) : (
        <div className="collection-panel p-6 sm:p-7">
          <div className="border-border/65 bg-background/72 rounded-[1.6rem] border border-dashed px-5 py-8">
            <p className="text-muted-foreground text-sm">暂无内容</p>
          </div>
        </div>
      )}
    </section>
  );
}
