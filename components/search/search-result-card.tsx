import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import type { UserGoodsStatus } from '@/lib/user-goods-status';
import type { GoodsCardData } from '@/server/data/_shared';

import { formatGoodsTypeLabel } from './search-query';
import { SearchCardActions } from './search-card-actions';

type SearchResultCardProps = {
  item: GoodsCardData;
  isAuthenticated: boolean;
  /** 当前用户对这一件的收藏状态。空数组＝尚未标记。 */
  activeStatuses: UserGoodsStatus[];
  isBestMatch?: boolean;
};

/**
 * 搜索结果卡。
 *
 * `goods-card--lit`（金色装裱内衬）此前被用来标「最佳匹配」，而它在角色页和
 * 收藏页表示「已收录」—— 同一套视觉语言背两个含义。金只属于「拥有」那一层，
 * 所以最佳匹配换成一行文字标记，金留给真正拥有的条目。
 */
export function SearchResultCard({
  item,
  isAuthenticated,
  activeStatuses,
  isBestMatch = false,
}: SearchResultCardProps) {
  const detailsHref = `/goods/${item.slug}`;
  const owned = activeStatuses.includes('owned');

  return (
    <article className={`goods-card group ${owned ? 'goods-card--lit' : ''}`}>
      <GoodsCardArt
        alt={item.name}
        className="aspect-[4/3]"
        imageUrl={item.primaryImageUrl}
        priority={isBestMatch}
        sizes="(max-width: 639px) 100vw, (max-width: 1535px) 50vw, 33vw"
      >
        <Link className="absolute inset-0 z-10" href={detailsHref}>
          <span className="sr-only">打开 {item.name}</span>
        </Link>

        {owned ? <span className="seal">藏</span> : null}
      </GoodsCardArt>

      <div className="flex flex-1 flex-col gap-2 px-1 pt-3 pb-1">
        {isBestMatch ? <p className="lbl text-[var(--shu)]">最接近</p> : null}

        <h3 className="text-[15px] leading-snug transition-colors group-hover:text-[var(--shu)]">
          <Link href={detailsHref}>{item.name}</Link>
        </h3>

        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="sku-code">{item.skuCode}</span>
          <span className="text-muted-foreground text-[12.5px]">
            {formatGoodsTypeLabel(item.goodsType)}
          </span>
        </div>

        <p className="text-muted-foreground text-[12.5px]">
          {item.ip.name} · {item.series.name}
        </p>

        {/* 归属状态必须在结果里可见：看不见的话，收藏者会重复买已经有的东西。 */}
        <div className="mt-1">
          {owned ? (
            <span className="state state--lit">已收录</span>
          ) : activeStatuses.length > 0 ? (
            <span className="state state--off">
              {activeStatuses.includes('wanted') ? '想要' : '可交换'}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          <SearchCardActions
            activeStatuses={activeStatuses}
            goodsId={item.id}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </article>
  );
}
