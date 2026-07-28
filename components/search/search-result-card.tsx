import Link from 'next/link';

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
      className={
        isFeatured
          ? 'panel-float group relative overflow-hidden rounded-[2.2rem] border border-[color:color-mix(in_oklab,var(--accent)_34%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_12%,transparent),color-mix(in_oklab,var(--surface-strong)_90%,var(--background)))] shadow-[0_34px_90px_-44px_color-mix(in_oklab,var(--accent)_42%,transparent)]'
          : 'panel-float group relative overflow-hidden rounded-[1.9rem] border border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_88%,transparent),color-mix(in_oklab,var(--surface-soft)_86%,var(--background)))] shadow-[0_28px_78px_-40px_color-mix(in_oklab,var(--shadow-tint)_76%,transparent)]'
      }
    >
      <div
        className={
          isFeatured
            ? 'grid gap-0 xl:grid-cols-[minmax(22rem,0.92fr)_minmax(0,1.08fr)]'
            : ''
        }
      >
        <div
          className={
            isFeatured
              ? 'relative min-h-[22rem] overflow-hidden border-b border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)] xl:min-h-full xl:border-r xl:border-b-0'
              : 'relative h-56 overflow-hidden border-b border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)] sm:h-64'
          }
        >
          <Link className="absolute inset-0 z-10" href={detailsHref}>
            <span className="sr-only">打开 {item.name}</span>
          </Link>

          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_34%,color-mix(in_oklab,var(--background)_76%,var(--card))_100%)]"
            style={
              item.primaryImageUrl
                ? {
                    backgroundImage: `linear-gradient(180deg, color-mix(in oklab, var(--accent) 16%, transparent), transparent 34%, color-mix(in oklab, var(--background) 76%, var(--card)) 100%), url(${item.primaryImageUrl})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                : undefined
            }
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,color-mix(in_oklab,white_18%,transparent)_40%,transparent_100%)]" />

          <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {isFeatured ? (
                  <span className="hud-chip border-[color:color-mix(in_oklab,var(--accent)_58%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_16%,white)] px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
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
        </div>

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
