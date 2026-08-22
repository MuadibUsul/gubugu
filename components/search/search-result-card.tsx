import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import type { GoodsCardData } from '@/server/data/_shared';
import type { GoodsCardViewerState } from '@/server/data/search-service';

import { formatGoodsTypeLabel } from './search-query';
import { SearchCardActions } from './search-card-actions';

type SearchResultCardProps = {
  item: GoodsCardData;
  isAuthenticated: boolean;
  viewerState: GoodsCardViewerState;
  isBestMatch?: boolean;
};

/**
 * 搜索结果卡。
 *
 * 灰度只由服务端的 isLit 决定：收进谷柜仍是灰图，扫码确认后才恢复原色。
 * 最佳匹配只用文字标记，避免与点亮的金色装裱争夺语义。
 */
export function SearchResultCard({
  item,
  isAuthenticated,
  viewerState,
  isBestMatch = false,
}: SearchResultCardProps) {
  const detailsHref = `/goods/${item.slug}`;
  const isInCabinet = viewerState.activeStatuses.includes('owned');
  const cardStateClass = viewerState.isLit
    ? 'goods-card--lit'
    : `goods-card--dormant ${isInCabinet ? 'goods-card--cabinet' : ''}`;

  return (
    <article className={`goods-card group min-w-0 ${cardStateClass}`}>
      <GoodsCardArt
        alt={item.name}
        className="aspect-[3/4]"
        imageUrl={item.primaryImageUrl}
        priority={isBestMatch}
        sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 20vw"
      >
        <Link
          className="absolute inset-0 z-10"
          href={detailsHref}
          tabIndex={-1}
        >
          <span className="sr-only">打开 {item.name}</span>
        </Link>
      </GoodsCardArt>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5 pt-3 pb-0.5 sm:px-1">
        {isBestMatch ? <p className="lbl text-[var(--shu)]">最接近</p> : null}

        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 transition-colors group-hover:text-[var(--shu)] sm:text-[14.5px]">
          <Link href={detailsHref}>{item.name}</Link>
        </h3>

        <span className="sku-code truncate">{item.skuCode}</span>

        <p className="text-muted-foreground line-clamp-1 text-[11px] sm:text-[12px]">
          {item.ip.name} · {formatGoodsTypeLabel(item.goodsType)}
        </p>

        <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
          {viewerState.isLit ? (
            <span className="state state--lit">已点亮</span>
          ) : isInCabinet ? (
            <span className="state text-[var(--violet)]">已入柜 · 待点亮</span>
          ) : (
            <span className="state state--off">未点亮</span>
          )}
          {viewerState.activeStatuses.includes('wanted') ? (
            <span className="state state--wanted">想要</span>
          ) : null}
          {viewerState.activeStatuses.includes('exchange') ? (
            <span className="state state--exchange">可换</span>
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          <SearchCardActions
            activeStatuses={viewerState.activeStatuses}
            goodsId={item.id}
            isAuthenticated={isAuthenticated}
            isLit={viewerState.isLit}
          />
        </div>
      </div>
    </article>
  );
}
