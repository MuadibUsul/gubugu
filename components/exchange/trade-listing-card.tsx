import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { exchangeFulfillmentMethodMeta } from '@/lib/exchange/fulfillment';
import { exchangeOfferPolicyMeta } from '@/lib/exchange/negotiation';
import type { TradeListingView } from '@/server/data/trade';

export function TradeListingCard({ listing }: { listing: TradeListingView }) {
  return (
    <article className="panel-float group grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-[22px] border border-[var(--rule)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-4 sm:p-4">
      <Link className="block" href={`/matches/${listing.id}`}>
        <GoodsCardArt
          alt={listing.goods.name}
          className="aspect-[4/5] rounded-[16px]"
          imageUrl={listing.goods.primaryImageUrl}
          sizes="(max-width: 640px) 100vw, 132px"
        />
      </Link>
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border-[var(--exchange)] bg-[var(--exchange-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--exchange)]">
            {exchangeOfferPolicyMeta[listing.offerPolicy].label}
          </span>
          <span className="chip px-2.5 py-1 text-[11px]">
            {exchangeFulfillmentMethodMeta[listing.fulfillmentMethod].label}
          </span>
          {listing.offeredQuantity > 1 ? (
            <span className="chip px-2.5 py-1 text-[11px]">
              可换 {listing.offeredQuantity} 件
            </span>
          ) : null}
        </div>
        <Link href={`/matches/${listing.id}`}>
          <h3 className="mt-3 line-clamp-2 text-[18px] leading-snug group-hover:text-[var(--shu)]">
            {listing.goods.name}
          </h3>
        </Link>
        <p className="num mt-1 truncate">{listing.goods.skuCode}</p>
        <p className="text-muted-foreground mt-3 line-clamp-2 text-[13px] leading-relaxed">
          {listing.description}
        </p>
        <div className="mt-auto pt-4 text-[12px]">
          <p className="text-muted-foreground">
            发布者 <span className="text-foreground">{listing.ownerLabel}</span>
          </p>
          <p className="mt-1 truncate text-[var(--want)]">
            {listing.preferredGoods
              ? `优先想换：${listing.preferredGoods.name}`
              : listing.offerPolicy === 'open_to_offers'
                ? '愿意看看你的其他可换 SKU'
                : '以发布者愿望单为准'}
          </p>
        </div>
      </div>
    </article>
  );
}
