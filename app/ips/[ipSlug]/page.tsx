import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { SearchResultCard } from '@/components/search/search-result-card';
import { getAuthUser } from '@/server/auth/session';
import {
  getGoodsCardViewerStateMap,
  getIpEncyclopediaPageData,
  type GoodsCardViewerState,
} from '@/server/data';

const ipPageParamsSchema = z.object({
  ipSlug: z.string().trim().min(1),
});

type IpPageProps = {
  params: Promise<{
    ipSlug: string;
  }>;
};

const dormantViewerState = {
  activeStatuses: [],
  isLit: false,
} satisfies GoodsCardViewerState;

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
  const [data, authUser] = await Promise.all([
    getIpEncyclopediaPageData({ ipSlug }),
    getAuthUser(),
  ]);

  if (!data) {
    notFound();
  }

  const viewerStates = await getGoodsCardViewerStateMap({
    viewerId: authUser?.id,
    goodsIds: data.goods.map((item) => item.id),
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-10 pb-24 md:px-10 md:pt-14">
      <section className="spread border-border border-b pb-12">
        <div>
          <p className="lbl">公开图鉴</p>
          <div className="rail-jp">图鉴</div>
        </div>

        <div className="min-w-0">
          <p className="accession">IP 图鉴</p>

          <h1 className="mt-2 text-[clamp(30px,4.4vw,50px)] leading-[1.1] text-balance">
            {data.ip.name}
          </h1>
          {data.ip.nameLocalized && data.ip.nameLocalized !== data.ip.name ? (
            <p className="text-muted-foreground mt-1 text-base font-medium">
              {data.ip.nameLocalized}
            </p>
          ) : null}
          <div className="rule-kin mt-4" />

          <p className="text-muted-foreground mt-5 max-w-[62ch] leading-relaxed">
            {data.ip.description ??
              '在这个 IP 下查看角色阵容、已发布系列线与 SKU 级商品图鉴。'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="chip px-3.5 py-1.5">
              <b className="text-foreground">{data.summary.characterCount}</b>
              &nbsp;位角色
            </span>
            <span className="chip px-3.5 py-1.5">
              <b className="text-foreground">{data.summary.seriesCount}</b>
              &nbsp;条系列线
            </span>
            <span className="chip px-3.5 py-1.5">
              <b className="text-foreground">{data.summary.goodsCount}</b>
              &nbsp;件商品
            </span>
            <Link
              className="chip px-3.5 py-1.5 hover:border-[var(--shu)] hover:text-[var(--shu)]"
              href={`/search?ipSlug=${data.ip.slug}`}
            >
              在 IP 内搜索 →
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-10 xl:grid-cols-2">
        <div className="min-w-0">
          <p className="section-kicker">角色</p>
          <h2 className="mt-3 text-[clamp(20px,2.6vw,28px)] leading-tight">
            角色阵容
          </h2>

          <div className="mt-5 grid gap-2.5">
            {data.characters.length > 0 ? (
              data.characters.map((character) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3.5 transition hover:border-[var(--shu)]"
                  href={`/ips/${data.ip.slug}/characters/${character.slug}`}
                  key={character.id}
                >
                  <div className="min-w-0">
                    <p className="font-heading truncate font-semibold">
                      {character.name}
                    </p>
                    {character.nameLocalized &&
                    character.nameLocalized !== character.name ? (
                      <p className="text-muted-foreground truncate text-[13px]">
                        {character.nameLocalized}
                      </p>
                    ) : null}
                  </div>
                  <span className="num shrink-0">{character.goodsCount} 件</span>
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <strong>还没有角色</strong>
                当前这个 IP 还没有关联已发布角色。
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="section-kicker">系列</p>
          <h2 className="mt-3 text-[clamp(20px,2.6vw,28px)] leading-tight">
            发行系列线
          </h2>

          <div className="mt-5 grid gap-2.5">
            {data.series.length > 0 ? (
              data.series.map((item) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3.5 transition hover:border-[var(--shu)]"
                  href={`/ips/${data.ip.slug}/series/${item.slug}`}
                  key={item.id}
                >
                  <div className="min-w-0">
                    <p className="font-heading truncate font-semibold">
                      {item.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[13px]">
                      {item.seriesType}
                    </p>
                  </div>
                  <span className="num shrink-0">{item.goodsCount} 件</span>
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <strong>还没有系列</strong>
                当前这个 IP 还没有关联已发布系列。
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <p className="section-kicker">商品</p>
        <h2 className="mt-3 text-[clamp(20px,2.6vw,28px)] leading-tight">
          最新 SKU 条目
        </h2>
        <p className="lbl mt-2 max-w-[52ch]">
          未点亮的缩略图保持灰色；打开详情可查看完整彩色原图。
        </p>

        {data.goods.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {data.goods.map((item) => (
              <SearchResultCard
                isAuthenticated={Boolean(authUser)}
                item={item}
                key={item.id}
                viewerState={viewerStates[item.id] ?? dormantViewerState}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state mt-5">
            <strong>还没有商品</strong>
            当前这个 IP 还没有关联已发布商品。
          </div>
        )}
      </section>
    </main>
  );
}
