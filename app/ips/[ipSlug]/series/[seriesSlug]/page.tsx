import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { SearchResultCard } from '@/components/search/search-result-card';
import { formatCatalogDate } from '@/lib/formatters';
import { getAuthUser } from '@/server/auth/session';
import {
  getGoodsCardViewerStateMap,
  getSeriesEncyclopediaPageData,
  type GoodsCardViewerState,
} from '@/server/data';

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

const dormantViewerState = {
  activeStatuses: [],
  isLit: false,
} satisfies GoodsCardViewerState;

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
  const [data, authUser] = await Promise.all([
    getSeriesEncyclopediaPageData({ ipSlug, seriesSlug }),
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
          <p className="lbl">系列图鉴</p>
          <div className="rail-jp">系列</div>
        </div>

        <div className="min-w-0">
          <p className="accession">
            <Link className="hover:text-[var(--shu)]" href={`/ips/${data.ip.slug}`}>
              {data.ip.name}
            </Link>
            <i> · {data.series.seriesType}</i>
          </p>

          <h1 className="mt-2 text-[clamp(28px,4vw,44px)] leading-[1.14] text-balance">
            {data.series.name}
          </h1>
          <div className="rule-kin mt-4" />

          <p className="text-muted-foreground mt-5 max-w-[62ch] leading-relaxed">
            {data.series.description ??
              '查看归属于这个系列的已发布 SKU 线与关联角色。'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="chip px-3.5 py-1.5">
              <b className="text-foreground">{data.summary.goodsCount}</b>
              &nbsp;件商品
            </span>
            <span className="chip px-3.5 py-1.5">
              <b className="text-foreground">{data.summary.characterCount}</b>
              &nbsp;位角色
            </span>
            <span className="chip px-3.5 py-1.5">
              发售&nbsp;
              <b className="text-foreground">
                {formatCatalogDate(data.series.releaseDate)}
              </b>
            </span>
            <Link
              className="chip px-3.5 py-1.5 hover:border-[var(--shu)] hover:text-[var(--shu)]"
              href={`/search?seriesSlug=${data.series.slug}`}
            >
              在系列内搜索 →
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <p className="section-kicker">关联角色</p>
        <h2 className="mt-3 text-[clamp(20px,2.6vw,28px)] leading-tight">
          角色阵容
        </h2>

        {data.characters.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {data.characters.map((character) => (
              <Link
                className="chip px-3.5 py-2 hover:border-[var(--shu)] hover:text-[var(--shu)]"
                href={`/ips/${data.ip.slug}/characters/${character.slug}`}
                key={character.id}
              >
                {character.name}
                <span className="num ml-1.5">{character.goodsCount}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state mt-5">
            <strong>还没有关联角色</strong>
            这个系列尚未关联任何已发布角色。
          </div>
        )}
      </section>

      <section className="mt-12">
        <p className="section-kicker">商品</p>
        <h2 className="mt-3 text-[clamp(20px,2.6vw,28px)] leading-tight">
          系列 SKU 墙
        </h2>
        <p className="lbl mt-2 max-w-[52ch]">
          灰色是尚未点亮；扫码确认实物后，它会在整座谷库恢复颜色。
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
            这个系列尚未关联任何已发布商品。
          </div>
        )}
      </section>
    </main>
  );
}
