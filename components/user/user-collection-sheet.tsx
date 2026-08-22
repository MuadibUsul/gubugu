import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { formatCatalogDate } from '@/lib/formatters';
import type { UserProfileGoodsCard, UserProfilePageData } from '@/server/data';

export type CollectionStatusFilter = 'owned' | 'wanted' | 'exchange';

type UserCollectionSheetProps = {
  data: UserProfilePageData;
  status: CollectionStatusFilter;
  /** 切换状态时保留的基础路径。 */
  basePath: string;
};

const statusMeta = {
  owned: { label: '谷柜', empty: '谷柜里还没有收藏。' },
  wanted: { label: '想要', empty: '还没有标记想要的条目。' },
  exchange: { label: '可交换', empty: '还没有放出可交换的条目。' },
} as const satisfies Record<
  CollectionStatusFilter,
  { label: string; empty: string }
>;

function SheetEntry({
  item,
  index,
  status,
  isInCabinet,
}: {
  item: UserProfileGoodsCard;
  index: number;
  status: CollectionStatusFilter;
  isInCabinet: boolean;
}) {
  const lit = Boolean(item.litAt);

  return (
    <Link
      aria-label={`${item.name}，${lit ? '已点亮' : isInCabinet ? '已入柜，待点亮' : '未点亮'}`}
      className={`goods-card group min-w-0 ${lit ? 'goods-card--lit' : `goods-card--dormant ${isInCabinet ? 'goods-card--cabinet' : ''}`}`}
      href={`/goods/${item.slug}`}
    >
      <GoodsCardArt
        alt={item.name}
        className="aspect-[3/4]"
        imageUrl={item.primaryImageUrl}
        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 22vw"
      >
        <span className="goods-card__no">
          {String(index + 1).padStart(3, '0')}
        </span>
      </GoodsCardArt>

      <div className="flex flex-1 flex-col gap-1.5 px-1 pt-3 pb-1">
        <h3 className="line-clamp-2 text-[13px] leading-5 transition-colors group-hover:text-[var(--shu)] sm:text-[14.5px]">
          {item.name}
        </h3>
        <span className="sku-code">{item.skuCode}</span>
        <span className="text-muted-foreground text-[12.5px]">
          {item.ip.name}
        </span>

        <div className="mt-auto pt-2">
          {status === 'owned' ? (
            lit ? (
              <span className="acquired">
                已点亮 · {formatCatalogDate(item.litAt!)}
              </span>
            ) : (
              <span className="state state--off">已入柜 · 待扫描</span>
            )
          ) : (
            <span
              className={`state ${status === 'wanted' ? 'state--wanted' : 'state--exchange'}`}
            >
              {statusMeta[status].label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * 一览 —— 一张表加状态筛选。
 *
 * 旧页面把已拥有、想要、可交换做成三个纵向堆叠的独立区块，每个各带一套面板
 * 头 —— 同一批东西按状态复制了三遍，而且要滚很久才能看到第三块。这里合成一
 * 张表，状态是它的筛选条件。
 */
export function UserCollectionSheet({
  data,
  status,
  basePath,
}: UserCollectionSheetProps) {
  const items = data.goods[status];
  const cabinetGoodsIds = new Set(data.goods.owned.map((item) => item.id));
  const counts = {
    owned: data.summary.cabinetCount,
    wanted: data.summary.wantedCount,
    exchange: data.summary.exchangeCount,
  } as const;

  return (
    <div>
      <nav
        aria-label="收藏状态"
        className="border-border mb-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b pb-3"
      >
        {(Object.keys(statusMeta) as CollectionStatusFilter[]).map((key) => (
          <Link
            className={
              key === status
                ? 'text-[15px] font-medium text-[var(--shu)] underline underline-offset-4'
                : 'text-muted-foreground hover:text-foreground text-[15px]'
            }
            href={key === 'owned' ? basePath : `${basePath}?status=${key}`}
            aria-current={key === status ? 'page' : undefined}
            key={key}
          >
            {statusMeta[key].label}
            <span className="num ml-1.5">{counts[key]}</span>
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="empty-state">
          <strong>{statusMeta[status].empty}</strong>
          从图鉴里找到想要的条目，标一下状态，它就会出现在这里。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {items.map((item, index) => (
            <SheetEntry
              index={index}
              isInCabinet={cabinetGoodsIds.has(item.id)}
              item={item}
              key={item.id}
              status={status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
