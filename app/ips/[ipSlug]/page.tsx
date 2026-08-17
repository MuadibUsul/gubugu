import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { SearchResultCard } from '@/components/search/search-result-card';
import { getIpEncyclopediaPageData } from '@/server/data';

const ipPageParamsSchema = z.object({
  ipSlug: z.string().trim().min(1),
});

type IpPageProps = {
  params: Promise<{
    ipSlug: string;
  }>;
};

export async function generateMetadata({
  params,
}: IpPageProps): Promise<Metadata> {
  const { ipSlug } = ipPageParamsSchema.parse(await params);

  return {
    title: ipSlug,
    description: '公开 IP 图鉴页，聚合角色、系列与商品条目。',
  };
}

export default async function IpPage({ params }: IpPageProps) {
  const { ipSlug } = ipPageParamsSchema.parse(await params);
  const data = await getIpEncyclopediaPageData({ ipSlug });

  if (!data) {
    notFound();
  }

  return (
    <main>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-5 py-14 md:px-10">
        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm uppercase">
                  IP 图鉴
                </span>
                <Link
                  className="border-border/70 bg-background/78 text-muted-foreground hover:bg-muted rounded-full border px-3 py-1 text-sm"
                  href={`/search?ipSlug=${data.ip.slug}`}
                >
                  在当前 IP 内搜索
                </Link>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  公开图鉴
                </p>
                <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5rem]">
                  {data.ip.name}
                </h1>
                {data.ip.nameLocalized &&
                data.ip.nameLocalized !== data.ip.name ? (
                  <p className="text-muted-foreground text-lg font-semibold">
                    {data.ip.nameLocalized}
                  </p>
                ) : null}
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                  {data.ip.description ??
                    '在这个 IP 下查看角色阵容、已发布系列线与 SKU 级商品图鉴。'}
                </p>
              </div>
            </div>

            <aside className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  角色
                </p>
                <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                  {data.summary.characterCount}
                </p>
              </div>
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  系列
                </p>
                <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                  {data.summary.seriesCount}
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
            </aside>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="collection-panel p-6 sm:p-7">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  角色
                </p>
                <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                  角色阵容
                </h2>
              </div>

              <div className="grid gap-3">
                {data.characters.length > 0 ? (
                  data.characters.map((character) => (
                    <Link
                      className="border-border/70 bg-background/78 hover:border-accent/50 rounded-[var(--radius)] border px-4 py-4 transition"
                      href={`/ips/${data.ip.slug}/characters/${character.slug}`}
                      key={character.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-foreground text-base font-semibold">
                            {character.name}
                          </p>
                          {character.nameLocalized &&
                          character.nameLocalized !== character.name ? (
                            <p className="text-muted-foreground text-sm">
                              {character.nameLocalized}
                            </p>
                          ) : null}
                        </div>
                        <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                          {character.goodsCount} 件商品
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-6 text-sm leading-7">
                    当前这个 IP 还没有关联已发布角色。
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="collection-panel p-6 sm:p-7">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  Series
                </p>
                <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                  Release lines
                </h2>
              </div>

              <div className="grid gap-3">
                {data.series.length > 0 ? (
                  data.series.map((item) => (
                    <Link
                      className="border-border/70 bg-background/78 hover:border-accent/50 rounded-[var(--radius)] border px-4 py-4 transition"
                      href={`/ips/${data.ip.slug}/series/${item.slug}`}
                      key={item.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-foreground text-base font-semibold">
                            {item.name}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {item.seriesType}
                          </p>
                        </div>
                        <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                          {item.goodsCount} 件商品
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-6 text-sm leading-7">
                    当前这个 IP 还没有关联已发布系列。
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>

        <section className="space-y-5">
          <div className="collection-panel p-6 sm:p-7">
            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                商品
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                最新 SKU 条目
              </h2>
            </div>
          </div>

          {data.goods.length > 0 ? (
            <div className="grid gap-4 2xl:grid-cols-2">
              {data.goods.map((item) => (
                <SearchResultCard
                  activeStatuses={[]}
                  isAuthenticated={false}
                  item={item}
                  key={item.id}
                />
              ))}
            </div>
          ) : (
            <div className="collection-panel p-6 sm:p-7">
              <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-6 text-sm leading-7">
                当前这个 IP 还没有关联已发布商品。
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
