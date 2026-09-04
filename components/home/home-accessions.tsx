import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { formatGoodsTypeLabel } from '@/components/search/search-query';
import { searchGoodsCatalog } from '@/server/data';
import type { GoodsCardData } from '@/server/data/_shared';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

// 最近收录：紧凑三列卡（对齐设计稿）——封面图 + 名称 + 类型，一眼扫过。
function AccessionPlate({ item }: { item: GoodsCardData }) {
  return (
    <Link className="group min-w-0" href={`/goods/${item.slug}`}>
      <GoodsCardArt
        alt={item.name}
        className="aspect-[3/4] rounded-[6px] border border-[var(--rule)]"
        imageUrl={item.primaryImageUrl}
        sizes="(max-width: 767px) 31vw, 22vw"
      />
      <p className="mt-2 line-clamp-1 text-[12.5px] font-medium transition-colors group-hover:text-[var(--shu)]">
        {item.name}
      </p>
      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px]">
        {formatGoodsTypeLabel(item.goodsType)} · {item.ip.name}
      </p>
    </Link>
  );
}

export function HomeAccessionsFallback() {
  return (
    <div className="mt-9 md:mt-0 md:rounded-[28px] md:bg-[var(--sunken)] md:p-8">
      <div className="grid grid-cols-3 gap-2.5 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="bg-muted aspect-[3/4] animate-pulse rounded-[6px]"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export async function HomeAccessionsSection() {
  let items: GoodsCardData[] = [];
  let failed = false;

  try {
    // 默认排序已是发售日倒序，所以取前几条就是最近录入。
    const results = await searchGoodsCatalog({ pageSize: 6 });
    items = results.items;
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    failed = true;
  }

  return (
    <section className="mt-9 rounded-none border-0 bg-transparent p-0 md:mt-0 md:rounded-[28px] md:border md:border-[var(--rule)] md:bg-[linear-gradient(145deg,var(--sunken),color-mix(in_oklab,var(--sky-soft)_65%,var(--surface)))] md:p-8 lg:p-10">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="section-kicker hidden md:inline-flex">本周新鲜入册</p>
            <h2 className="text-[clamp(16px,4.6vw,40px)] md:mt-3">最近收录</h2>
          </div>
          <Link
            className="shrink-0 text-[11.5px] font-semibold text-[var(--shu)] md:text-sm"
            href="/search"
          >
            全部谷库 →
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
          <div className="mt-3 grid grid-cols-3 gap-2.5 md:mt-7 md:gap-4 lg:grid-cols-4">
            {items.map((item) => (
              <AccessionPlate item={item} key={item.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
