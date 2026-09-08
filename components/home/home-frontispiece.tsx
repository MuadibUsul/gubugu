import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { HomePrimarySearch } from '@/components/home/home-primary-search';
import type { GoodsCardViewerState } from '@/server/data';
import type { GoodsCardData } from '@/server/data/_shared';

type HomeFrontispieceProps = {
  ipCount: number;
  goodsCount: number;
  featuredItems: GoodsCardData[];
  viewerStates: Record<string, GoodsCardViewerState>;
};

export function HomeFrontispiece({
  ipCount,
  goodsCount,
  featuredItems,
  viewerStates,
}: HomeFrontispieceProps) {
  return (
    <section className="relative mt-5 grid overflow-hidden rounded-[24px] border border-[var(--rule)] bg-[linear-gradient(135deg,var(--shu-soft),color-mix(in_oklab,var(--violet-soft)_72%,var(--surface)))] p-5 shadow-[var(--shadow-card)] sm:p-7 lg:mt-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)] lg:items-center lg:gap-10 lg:p-10">
      <span className="absolute -top-20 -left-16 size-56 rounded-full bg-[color-mix(in_oklab,var(--shu)_9%,transparent)] blur-3xl" />
      <span className="absolute -right-20 -bottom-28 size-72 rounded-full bg-[color-mix(in_oklab,var(--violet)_10%,transparent)] blur-3xl" />

      <div className="relative min-w-0">
        <p className="section-kicker">二次元周边图鉴</p>
        <h1 className="mt-3 max-w-[560px] text-[clamp(24px,3.2vw,42px)] leading-[1.15] font-bold text-balance">
          把喜欢的角色，
          <span className="text-[var(--shu)]">收进自己的世界</span>。
        </h1>

        <div className="mt-5 max-w-[620px]">
          <HomePrimarySearch />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm">
          <span className="chip gap-1.5 px-3 py-1.5">
            <b className="text-foreground">{goodsCount}</b> 件谷子
          </span>
          <span className="chip gap-1.5 px-3 py-1.5">
            <b className="text-foreground">{ipCount}</b> 部作品
          </span>
          <Link
            className="scan-only chip px-3 py-1.5 font-semibold text-[var(--violet)]"
            href="/recognition"
          >
            扫描点亮 →
          </Link>
        </div>
      </div>

      <div
        className="relative mt-6 hidden min-h-[300px] lg:mt-0 lg:block"
        aria-label="最近收录的周边"
      >
        {featuredItems.slice(0, 3).map((item, index) => {
          const positions = [
            'left-[6%] top-[5%] z-20 w-[53%] -rotate-[3deg]',
            'right-[2%] top-[19%] z-10 w-[48%] rotate-[5deg]',
            'bottom-[1%] left-[25%] z-30 w-[45%] rotate-[1deg]',
          ];
          const viewerState = viewerStates[item.id] ?? {
            activeStatuses: [],
            isLit: false,
          };
          const isInCabinet = viewerState.activeStatuses.includes('owned');

          // 公共浏览页统一原色，不做明暗区分；点亮态只在谷柜表达。
          return (
            <Link
              aria-label={`${item.name}，${viewerState.isLit ? '已点亮' : isInCabinet ? '已入柜，待点亮' : '未点亮'}`}
              className={`goods-card hero-goods-card group absolute ${positions[index]}`}
              href={`/goods/${item.slug}`}
              key={item.id}
            >
              <GoodsCardArt
                alt={item.name}
                className="aspect-[4/3]"
                imageUrl={item.primaryImageUrl}
                sizes="280px"
              />
              <div className="px-2 pt-3 pb-2">
                <p className="line-clamp-1 text-sm font-bold">{item.name}</p>
                <p className="text-muted-foreground mt-1 line-clamp-1 text-[11px]">
                  {item.ip.name} · {item.skuCode}
                </p>
                <p className="mt-1 text-[10px] font-bold text-[var(--violet)]">
                  {viewerState.isLit
                    ? '已点亮'
                    : isInCabinet
                      ? '已入柜 · 待点亮'
                      : '未点亮'}
                </p>
              </div>
            </Link>
          );
        })}

        {featuredItems.length === 0 ? (
          <div className="absolute inset-10 grid place-items-center rounded-[24px] border border-dashed border-[var(--rule-2)] bg-[var(--surface)]/70 text-center">
            <div>
              <span className="text-5xl">✦</span>
              <p className="text-muted-foreground mt-3 text-sm">
                等待第一件谷子入册
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
