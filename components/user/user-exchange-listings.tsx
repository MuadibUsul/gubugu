import Link from 'next/link';

import { formatCatalogDate } from '@/lib/formatters';
import {
  exchangeFulfillmentMethodMeta,
  exchangeListingStatusMeta,
} from '@/lib/exchange-listing';
import type { ExchangeListingViewItem } from '@/server/data';

type UserExchangeEntryGood = {
  id: string;
  slug: string;
  name: string;
};

type UserExchangeListingsProps = {
  items: ExchangeListingViewItem[];
  entryGoods: UserExchangeEntryGood[];
};

export function UserExchangeListings({
  items,
  entryGoods,
}: UserExchangeListingsProps) {
  return (
    <section className="space-y-5" id="exchange-board">
      <div className="collection-panel p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              交换板
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                我有 A，想换 B
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7 sm:text-base">
                轻量交换意向会精确挂在 SKU 下。这个区域只汇总当前收藏者的配对关系，而不会把个人主页做成交易中心。
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-4 py-2 text-sm">
              {items.length} 条进行中的意向
            </div>
            {entryGoods.length > 0 ? (
              <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                {entryGoods.slice(0, 3).map((item) => (
                  <Link
                    className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition"
                    href={`/goods/${item.slug}#exchange-desk`}
                    key={item.id}
                  >
                    从「{item.name}」发起
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 2xl:grid-cols-2">
          {items.map((item) => (
            <article
              className="collection-panel overflow-hidden p-5"
              key={item.id}
            >
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.2em] uppercase ${exchangeListingStatusMeta[item.status].toneClassName}`}
                  >
                    {exchangeListingStatusMeta[item.status].label}
                  </span>
                  <span className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    更新于 {formatCatalogDate(item.updatedAt)}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Link
                    className="border-border/70 bg-background/78 block rounded-[1.45rem] border p-4 transition hover:-translate-y-0.5"
                    href={`/goods/${item.offeredGoods.slug}`}
                  >
                    <p className="text-muted-foreground text-[0.66rem] tracking-[0.22em] uppercase">
                      我有
                    </p>
                    <p className="text-foreground mt-2 text-sm font-semibold">
                      {item.offeredGoods.name}
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {item.offeredGoods.skuCode}
                    </p>
                  </Link>

                  {item.wantedGoods ? (
                    <Link
                      className="border-border/70 bg-card/76 block rounded-[1.45rem] border p-4 transition hover:-translate-y-0.5"
                      href={`/goods/${item.wantedGoods.slug}`}
                    >
                      <p className="text-muted-foreground text-[0.66rem] tracking-[0.22em] uppercase">
                        想换
                      </p>
                      <p className="text-foreground mt-2 text-sm font-semibold">
                        {item.wantedGoods.name}
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm">
                        {item.wantedGoods.skuCode}
                      </p>
                    </Link>
                  ) : (
                    <div className="border-border/70 bg-card/76 text-muted-foreground rounded-[1.45rem] border border-dashed px-4 py-4 text-sm leading-7">
                      目标 SKU 暂时还没有关联上。
                    </div>
                  )}
                </div>

                <p className="text-foreground text-sm leading-7">{item.note}</p>

                <div className="flex flex-wrap gap-2">
                  <span className="border-border/70 bg-card/72 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {
                      exchangeFulfillmentMethodMeta[item.fulfillmentMethod]
                        .label
                    }
                  </span>
                  {item.allowMulti ? (
                    <span className="border-border/70 bg-card/72 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                      接受多换一
                    </span>
                  ) : null}
                  {item.allowCash ? (
                    <span className="border-border/70 bg-card/72 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                      接受补差
                    </span>
                  ) : null}
                  {item.locationHint ? (
                    <span className="border-border/70 bg-card/72 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                      {item.locationHint}
                    </span>
                  ) : null}
                </div>

                {item.conditionNote ? (
                  <div className="border-border/70 bg-background/74 rounded-[1.25rem] border px-4 py-4">
                    <p className="text-muted-foreground text-[0.66rem] tracking-[0.22em] uppercase">
                      品相说明
                    </p>
                    <p className="text-foreground mt-2 text-sm leading-7">
                      {item.conditionNote}
                    </p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="collection-panel p-6 sm:p-7">
          <div className="border-border/65 bg-background/72 rounded-[1.6rem] border border-dashed px-5 py-8">
            <p className="text-muted-foreground text-sm leading-7">
              暂时还没有公开中的交换意向。你可以去商品详情页，发布带说明和交换方式偏好的精确换物配对。
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
