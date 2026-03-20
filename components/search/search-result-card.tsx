import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { GoodsCardData } from '@/server/data/_shared';

import { formatGoodsTypeLabel } from './search-query';

type SearchResultCardProps = {
  item: GoodsCardData;
};

export function SearchResultCard({ item }: SearchResultCardProps) {
  const primaryCharacter = item.characters[0];
  const detailsHref = `/goods/${item.slug}`;
  const seriesHref = `/ips/${item.ip.slug}/series/${item.series.slug}`;
  const characterHref = primaryCharacter
    ? `/ips/${item.ip.slug}/characters/${primaryCharacter.slug}`
    : null;
  const ipHref = `/ips/${item.ip.slug}`;

  return (
    <article className="panel-float group relative overflow-hidden rounded-[1.9rem] border border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_88%,transparent),color-mix(in_oklab,var(--surface-soft)_86%,var(--background)))] shadow-[0_28px_78px_-40px_color-mix(in_oklab,var(--shadow-tint)_76%,transparent)]">
      <Link className="absolute inset-0 z-10" href={detailsHref}>
        <span className="sr-only">打开 {item.name}</span>
      </Link>

      <div className="relative h-56 overflow-hidden border-b border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)] sm:h-64">
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
        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="hud-chip px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
              SKU
            </span>
            <span className="hud-chip px-3 py-1 text-[0.7rem] font-semibold">
              {formatGoodsTypeLabel(item.goodsType)}
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="hud-card max-w-[16rem] px-4 py-3 backdrop-blur">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
                {item.skuCode}
              </p>
              <p className="text-foreground mt-2 text-sm">{item.series.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="hud-chip text-muted-foreground px-3 py-1 text-xs uppercase">
              {item.ip.name}
            </span>
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
            <h2 className="font-heading text-foreground text-3xl leading-none">
              <Link
                className="hover:text-primary relative z-20 transition-colors"
                href={detailsHref}
              >
                {item.name}
              </Link>
            </h2>
            {item.description ? (
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {item.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="hud-card px-4 py-3">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.28em] uppercase">
              系列
            </p>
            <p className="mt-2 text-sm font-semibold">{item.series.name}</p>
          </div>
          <div className="hud-card px-4 py-3">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.28em] uppercase">
              IP
            </p>
            <p className="mt-2 text-sm font-semibold">{item.ip.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              className="hud-chip text-foreground/84 px-3 py-1 text-xs"
              key={tag.id}
            >
              {tag.name}
            </span>
          ))}
        </div>

        <div className="relative z-20 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={detailsHref}>查看详情</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={seriesHref}>打开系列</Link>
          </Button>
          {characterHref ? (
            <Button asChild variant="outline">
              <Link href={characterHref}>角色页面</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link href={ipHref}>查看 IP</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
