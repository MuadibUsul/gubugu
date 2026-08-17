import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { formatCatalogDate } from '@/lib/formatters';
import type { CharacterCollectionGoodsCard } from '@/server/data';

type CharacterSheetProps = {
  items: CharacterCollectionGoodsCard[];
  /** 未筛选时的总数，用于说明筛掉了多少。 */
  totalCount: number;
};

/**
 * 一览 —— 收集册的表身。
 *
 * 旧版是 2 列大卡，每张带描述、标签和三个按钮。那样一屏只放得下四件，缺口
 * 就看不出来了 —— 而缺口正是图鉴的驱动力。这里改成 4 列密排图版，一屏能看
 * 十几件，已收录和未收录混排，空缺自然显形。
 */
function SheetEntry({
  item,
  index,
}: {
  item: CharacterCollectionGoodsCard;
  index: number;
}) {
  const acquiredAt =
    item.viewerState.find((entry) => entry.status === 'owned')?.updatedAt ??
    null;

  return (
    <Link
      className={`goods-card group ${item.isOwned ? 'goods-card--lit' : 'goods-card--dormant'}`}
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
        <h3 className="text-[14.5px] leading-snug transition-colors group-hover:text-[var(--shu)]">
          {item.name}
        </h3>
        <span className="sku-code">{item.skuCode}</span>

        <div className="mt-auto pt-2">
          {item.isOwned ? (
            // 入藏日期本来就在 viewerState 里，只是一直没取用 —— 收集表上
            // 每一件都只是「有/没有」，缺了「什么时候进来的」。
            acquiredAt ? (
              <span className="acquired">{formatCatalogDate(acquiredAt)}</span>
            ) : (
              <span className="state state--lit">已收录</span>
            )
          ) : (
            <span className="state state--off">还没有</span>
          )}
          {item.isWanted && !item.isOwned ? (
            <span className="lbl ml-3">想要</span>
          ) : null}
          {item.isExchange ? <span className="lbl ml-3">可交换</span> : null}
        </div>
      </div>
    </Link>
  );
}

export function CharacterSheet({ items, totalCount }: CharacterSheetProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <strong>这些条件下没有条目</strong>
        放宽筛选，或者换一个系列看看。
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-5">
        <h2 className="text-[22px]">一览</h2>
        <span className="num">
          {items.length === totalCount
            ? `全 ${totalCount} 件`
            : `${items.length} / ${totalCount} 件`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <SheetEntry index={index} item={item} key={item.id} />
        ))}
      </div>
    </div>
  );
}
