import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import type { GoodsCardData } from '@/server/data/_shared';

import { formatGoodsTypeLabel } from './search-query';
import { SearchCardActions } from './search-card-actions';

type SearchResultCardProps = {
  item: GoodsCardData;
  isAuthenticated: boolean;
  priority?: 'featured' | 'default';
};

function buildTrustSignals(item: GoodsCardData) {
  return [
    item.primaryImageUrl ? '有主图' : null,
    item.description ? '资料完整' : null,
    item.characters.length > 0 ? '角色已关联' : null,
  ].filter((value): value is string => Boolean(value));
}

export function SearchResultCard({
  item,
  isAuthenticated,
  priority = 'default',
}: SearchResultCardProps) {
  const detailsHref = `/goods/${item.slug}`;
  const isFeatured = priority === 'featured';
  const trustSignals = buildTrustSignals(item);

  return (
    <article
      className={`goods-card group ${isFeatured ? 'goods-card--lit' : ''}`}
    >
      <div
        className={
          isFeatured
            ? 'grid gap-0 xl:grid-cols-[minmax(22rem,0.92fr)_minmax(0,1.08fr)]'
            : ''
        }
      >
        <GoodsCardArt
          alt={item.name}
          className={`border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)] ${
            isFeatured
              ? 'min-h-[22rem] border-b xl:min-h-full xl:border-r xl:border-b-0'
              : 'h-56 border-b sm:h-64'
          }`}
          imageUrl={item.primaryImageUrl}
          // The featured result is the largest thing above the fold on /search,
          // so it should not wait for the lazy-loading observer.
          priority={isFeatured}
          sizes={
            isFeatured
              ? '(max-width: 1279px) 100vw, 45vw'
              : '(max-width: 1279px) 100vw, 30vw'
          }
        >
          <Link className="absolute inset-0 z-10" href={detailsHref}>
            <span className="sr-only">打开 {item.name}</span>
          </Link>

          <div className="goods-card__art-content flex h-full flex-col justify-between p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {isFeatured ? (
                  <span className="hud-chip hud-chip--lit px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
                    最佳匹配
                  </span>
                ) : null}
                <span className="hud-chip px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
                  {item.skuCode}
                </span>
              </div>
              <span className="hud-chip px-3 py-1 text-[0.7rem] font-semibold">
                {formatGoodsTypeLabel(item.goodsType)}
              </span>
            </div>

            <div className="hud-card max-w-[20rem] px-4 py-3 backdrop-blur">
              <p className="text-foreground text-sm font-semibold">
                {item.series.name}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {item.ip.name}
              </p>
            </div>
          </div>
        </GoodsCardArt>

        <div className={isFeatured ? 'space-y-6 p-6 sm:p-7' : 'space-y-5 p-5'}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {item.characters.slice(0, 2).map((character) => (
                <span
                  className="hud-chip text-muted-foreground px-3 py-1 text-xs"
                  key={character.id}
                >
                  {character.name}
                </span>
              ))}
            </div>

            <div>
              <h2
                className={
                  isFeatured
                    ? 'font-heading text-foreground text-4xl leading-[0.96] sm:text-5xl'
                    : 'font-heading text-foreground text-3xl leading-none'
                }
              >
                <Link
                  className="hover:text-primary relative z-20 transition-colors"
                  href={detailsHref}
                >
                  {item.name}
                </Link>
              </h2>
              {item.description ? (
                <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-7">
                  {item.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {trustSignals.map((signal) => (
              <span
                className="hud-chip text-foreground/84 border-[color:color-mix(in_oklab,var(--accent)_34%,var(--border))] px-3 py-1 text-xs"
                key={signal}
              >
                {signal}
              </span>
            ))}
            {item.tags.slice(0, 2).map((tag) => (
              <span
                className="hud-chip text-foreground/84 px-3 py-1 text-xs"
                key={tag.id}
              >
                {tag.name}
              </span>
            ))}
          </div>

          <SearchCardActions
            compact={!isFeatured}
            goodsId={item.id}
            goodsSlug={item.slug}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </article>
  );
}
