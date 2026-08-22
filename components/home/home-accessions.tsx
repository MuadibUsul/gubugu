import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import {
  getGoodsCardViewerStateMap,
  searchGoodsCatalog,
  type GoodsCardViewerState,
} from '@/server/data';
import type { GoodsCardData } from '@/server/data/_shared';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

function AccessionPlate({
  item,
  index,
  viewerState,
}: {
  item: GoodsCardData;
  index: number;
  viewerState: GoodsCardViewerState;
}) {
  const isInCabinet = viewerState.activeStatuses.includes('owned');
  const stateClass = viewerState.isLit
    ? 'goods-card--lit'
    : `goods-card--dormant ${isInCabinet ? 'goods-card--cabinet' : ''}`;

  return (
    <Link
      aria-label={`${item.name}，${viewerState.isLit ? '已点亮' : isInCabinet ? '已入柜，待点亮' : '未点亮'}`}
      className={`goods-card group min-w-0 ${stateClass}`}
      href={`/goods/${item.slug}`}
    >
      <GoodsCardArt
        alt={item.name}
        className="aspect-[4/3]"
        imageUrl={item.primaryImageUrl}
        sizes="(max-width: 639px) 45vw, (max-width: 1023px) 45vw, 23vw"
      >
        <span className="goods-card__no">
          NEW · {String(index + 1).padStart(2, '0')}
        </span>
      </GoodsCardArt>

      <div className="px-2 pt-4 pb-3">
        <p className="font-heading line-clamp-2 text-[15px] leading-snug font-bold transition-colors group-hover:text-[var(--shu)]">
          {item.name}
        </p>
        <p className="text-muted-foreground mt-2 line-clamp-1 text-[12px]">
          {item.ip.name}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="sku-code line-clamp-1">{item.skuCode}</span>
          <span className="text-sm text-[var(--shu)]">↗</span>
        </div>
        <p className="mt-2 text-[10.5px] font-bold text-[var(--violet)] sm:text-[11px]">
          {viewerState.isLit
            ? '已点亮'
            : isInCabinet
              ? '已入柜 · 待点亮'
              : '未点亮'}
        </p>
      </div>
    </Link>
  );
}

export function HomeAccessionsFallback() {
  return (
    <div className="rounded-[28px] bg-[var(--sunken)] p-5 sm:p-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="bg-muted aspect-[4/3] animate-pulse rounded-[20px]"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export async function HomeAccessionsSection({
  viewerId,
}: {
  viewerId?: string;
}) {
  let items: GoodsCardData[] = [];
  let viewerStates: Record<string, GoodsCardViewerState> = {};
  let failed = false;

  try {
    // 默认排序已是发售日倒序，所以取前 4 条就是最近录入。
    const results = await searchGoodsCatalog({ pageSize: 4 });
    items = results.items;
    viewerStates = await getGoodsCardViewerStateMap({
      viewerId,
      goodsIds: items.map((item) => item.id),
    });
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    failed = true;
  }

  return (
    <section className="rounded-[28px] border border-[var(--rule)] bg-[linear-gradient(145deg,var(--sunken),color-mix(in_oklab,var(--sky-soft)_65%,var(--surface)))] p-5 sm:p-8 lg:p-10">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="section-kicker">本周新鲜入册</p>
            <h2 className="mt-3 text-[clamp(28px,3.4vw,40px)]">最近收录</h2>
          </div>
          <Link
            className="text-muted-foreground text-sm font-semibold hover:text-[var(--shu)]"
            href="/search"
          >
            查看全部 →
          </Link>
        </div>

        {failed ? (
          <div className="empty-state mt-6">
            <strong>近收藏暂时读不出来</strong>
            数据源不可用，稍后刷新再试。
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state mt-6">
            <strong>还没有录入任何条目</strong>
            录入第一件之后，它会出现在这里。
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {items.map((item, index) => (
              <AccessionPlate
                index={index}
                item={item}
                key={item.id}
                viewerState={
                  viewerStates[item.id] ?? {
                    activeStatuses: [],
                    isLit: false,
                  }
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
