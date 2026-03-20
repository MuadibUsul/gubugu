import Link from 'next/link';

import { formatCatalogDate } from '@/lib/formatters';
import {
  exchangeFulfillmentMethodMeta,
  exchangeListingStatusMeta,
} from '@/lib/exchange-listing';
import type { GoodsDetailViewData } from '@/server/data';

import { GoodsExchangeComposer } from './goods-exchange-composer';

type GoodsExchangePanelProps = {
  exchange: GoodsDetailViewData['exchange'];
  hasPendingSubmission: boolean;
  goodsId: string;
  goodsName: string;
  goodsSlug: string;
  isAuthenticated: boolean;
  userLabel: string | null;
};

export function GoodsExchangePanel({
  exchange,
  hasPendingSubmission,
  goodsId,
  goodsName,
  goodsSlug,
  isAuthenticated,
  userLabel,
}: GoodsExchangePanelProps) {
  return (
    <section className="collection-panel p-5 sm:p-6" id="exchange-desk">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              交换台
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              仅做轻量交换意向
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              发布“我有这个 SKU，我想换另一个”的意向，但不把图鉴做成下单交易流。
            </p>
          </div>
          <div className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            {exchange.listings.length} 条已通过的公开意向
          </div>
        </div>

        <GoodsExchangeComposer
          goodsId={goodsId}
          goodsName={goodsName}
          goodsSlug={goodsSlug}
          hasPendingSubmission={hasPendingSubmission}
          isAuthenticated={isAuthenticated}
          userLabel={userLabel}
          wantedGoodsOptions={exchange.wantedGoodsOptions}
        />

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                这个 SKU 下的公开意向
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                这里只展示已经通过审核的交换意向。联系方式、支付、担保和仲裁都不在当前范围内。
              </p>
            </div>
          </div>

          {exchange.listings.length > 0 ? (
            <div className="grid gap-3">
              {exchange.listings.map((listing) => (
                <article
                  className="border-border/70 bg-background/78 overflow-hidden rounded-[1.55rem] border"
                  key={listing.id}
                >
                  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.2em] uppercase ${exchangeListingStatusMeta[listing.status].toneClassName}`}
                        >
                          {exchangeListingStatusMeta[listing.status].label}
                        </span>
                        <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                          {listing.ownerLabel}
                        </span>
                        <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                          {formatCatalogDate(listing.updatedAt)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-foreground text-sm font-semibold">
                          想换到
                        </p>
                        {listing.wantedGoods ? (
                          <Link
                            className="group border-border/70 bg-card/72 block rounded-[1.35rem] border p-4 transition hover:-translate-y-0.5"
                            href={`/goods/${listing.wantedGoods.slug}`}
                          >
                            <p className="text-muted-foreground text-[0.68rem] tracking-[0.22em] uppercase">
                              {listing.wantedGoods.skuCode}
                            </p>
                            <p className="text-foreground mt-2 text-sm font-semibold">
                              {listing.wantedGoods.name}
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                              {listing.wantedGoods.series.name}
                            </p>
                          </Link>
                        ) : (
                          <div className="border-border/70 bg-card/72 text-muted-foreground rounded-[1.35rem] border border-dashed px-4 py-4 text-sm leading-7">
                            目标 SKU 暂时还没有关联上。
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-foreground text-sm leading-7">
                        {listing.note}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                          {
                            exchangeFulfillmentMethodMeta[
                              listing.fulfillmentMethod
                            ].label
                          }
                        </span>
                        {listing.allowMulti ? (
                          <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                            Allow multi
                          </span>
                        ) : null}
                        {listing.allowCash ? (
                          <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                            Allow cash difference
                          </span>
                        ) : null}
                        {listing.locationHint ? (
                          <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                            {listing.locationHint}
                          </span>
                        ) : null}
                      </div>

                      {listing.conditionNote ? (
                        <div className="border-border/70 bg-card/72 rounded-[1.2rem] border px-4 py-4">
                          <p className="text-muted-foreground text-[0.66rem] tracking-[0.22em] uppercase">
                            品相说明
                          </p>
                          <p className="text-foreground mt-2 text-sm leading-7">
                            {listing.conditionNote}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[1.55rem] border border-dashed px-4 py-4 text-sm leading-7">
              这个 SKU 下暂时还没有通过审核的交换意向。新的提交会先保留为待审核，直到人工给出结论。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
