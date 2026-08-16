import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { SearchResultCard } from '@/components/search/search-result-card';
import { formatCatalogDate } from '@/lib/formatters';
import { getSeriesEncyclopediaPageData } from '@/server/data';

const seriesPageParamsSchema = z.object({
  ipSlug: z.string().trim().min(1),
  seriesSlug: z.string().trim().min(1),
});

type SeriesPageProps = {
  params: Promise<{
    ipSlug: string;
    seriesSlug: string;
  }>;
};

export async function generateMetadata({
  params,
}: SeriesPageProps): Promise<Metadata> {
  const { seriesSlug } = seriesPageParamsSchema.parse(await params);

  return {
    title: seriesSlug,
    description: '公开系列图鉴页，展示关联角色与商品。',
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { ipSlug, seriesSlug } = seriesPageParamsSchema.parse(await params);
  const data = await getSeriesEncyclopediaPageData({ ipSlug, seriesSlug });

  if (!data) {
    notFound();
  }

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_56%)]" />
      <div className="pointer-events-none absolute top-[-6rem] right-[-12rem] size-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_48%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_90%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Link
                  className="border-border/70 bg-background/78 text-muted-foreground hover:bg-muted rounded-full border px-3 py-1 text-sm"
                  href={`/ips/${data.ip.slug}`}
                >
                  {data.ip.name}
                </Link>
                <Link
                  className="border-border/70 bg-background/78 text-muted-foreground hover:bg-muted rounded-full border px-3 py-1 text-sm"
                  href={`/search?seriesSlug=${data.series.slug}`}
                >
                  在当前系列内搜索
                </Link>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  系列图鉴
                </p>
                <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5rem]">
                  {data.series.name}
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                  {data.series.description ??
                    '查看归属于这个系列的已发布 SKU 线与关联角色。'}
                </p>
              </div>
            </div>

            <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  系列类型
                </p>
                <p className="text-foreground mt-3 text-lg font-semibold">
                  {data.series.seriesType}
                </p>
              </div>
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  发售日期
                </p>
                <p className="text-foreground mt-3 text-lg font-semibold">
                  {formatCatalogDate(data.series.releaseDate)}
                </p>
              </div>
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  商品
                </p>
                <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                  {data.summary.goodsCount}
                </p>
              </div>
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  角色
                </p>
                <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                  {data.summary.characterCount}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="collection-panel p-6 sm:p-7">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                关联角色
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                角色阵容
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {data.characters.length > 0 ? (
                data.characters.map((character) => (
                  <Link
                    className="border-border/70 bg-background/78 hover:border-accent/50 rounded-full border px-4 py-2 text-sm font-semibold transition"
                    href={`/ips/${data.ip.slug}/characters/${character.slug}`}
                    key={character.id}
                  >
                    {character.name} ({character.goodsCount})
                  </Link>
                ))
              ) : (
                <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-6 text-sm leading-7">
                  当前这个系列还没有关联已发布角色。
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="collection-panel p-6 sm:p-7">
            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                商品
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                系列 SKU 墙
              </h2>
            </div>
          </div>

          {data.goods.length > 0 ? (
            <div className="grid gap-4 2xl:grid-cols-2">
              {data.goods.map((item) => (
                <SearchResultCard
                  isAuthenticated={false}
                  item={item}
                  key={item.id}
                />
              ))}
            </div>
          ) : (
            <div className="collection-panel p-6 sm:p-7">
              <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-6 text-sm leading-7">
                当前这个系列还没有关联已发布商品。
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
