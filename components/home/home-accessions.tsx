import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { searchGoodsCatalog } from '@/server/data';
import type { GoodsCardData } from '@/server/data/_shared';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

/**
 * 近收藏 —— 最近录入的条目。
 *
 * 做成一排装裱图版，不是卡片。每一张只给编号、名称和型号 —— 图录的图版页
 * 就是这样，说明文字留在正文里，不堆在图旁边。
 */
function AccessionPlate({
  item,
  index,
}: {
  item: GoodsCardData;
  index: number;
}) {
  return (
    <Link className="group block" href={`/goods/${item.slug}`}>
      <div className="goods-plate">
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
      </div>

      <p className="font-heading mt-3 text-[15px] leading-snug font-semibold transition-colors group-hover:text-[var(--shu)]">
        {item.name}
      </p>
      <p className="sku-code mt-1">{item.skuCode}</p>
      <p className="text-muted-foreground mt-1 text-[13px]">{item.ip.name}</p>
    </Link>
  );
}

export function HomeAccessionsFallback() {
  return (
    <div className="spread py-16">
      <div>
        <p className="lbl">近收藏</p>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="bg-muted aspect-[3/4] animate-pulse" key={index} />
        ))}
      </div>
    </div>
  );
}

export async function HomeAccessionsSection() {
  let items: GoodsCardData[] = [];
  let failed = false;

  try {
    // 默认排序已是发售日倒序，所以取前 4 条就是最近录入。
    const results = await searchGoodsCatalog({ pageSize: 4 });
    items = results.items;
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    failed = true;
  }

  return (
    <section className="spread border-border border-b py-16">
      <div>
        <p className="lbl">近收藏</p>
        <div className="rail-jp">新入</div>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-5">
          <h2 className="text-[26px]">最近录入</h2>
          <Link className="num hover:text-foreground" href="/search">
            查看全部 →
          </Link>
        </div>
        <div className="rule-kin mt-3" />

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
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
              <AccessionPlate index={index} item={item} key={item.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
