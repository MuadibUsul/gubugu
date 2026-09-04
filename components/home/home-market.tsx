import Link from 'next/link';

import { RemoteImage } from '@/components/ui/remote-image';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';
import {
  listOpenTradeListings,
  type TradeListingView,
} from '@/server/data/trade';

// 换谷市场卡（对齐设计稿）：出 ⇄ 想要 两枚缩略 + 一行「谁 · 换法」，横向滑动预览。
function swapArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 256 256"
      fill="var(--violet)"
      className="flex-none"
    >
      <path d="M213.66,181.66l-32,32a8,8,0,0,1-11.32-11.32L188.69,184H48a8,8,0,0,1,0-16H188.69l-18.35-18.34a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,213.66,181.66Zm-139.32-64a8,8,0,0,0,11.32-11.32L67.31,88H208a8,8,0,0,0,0-16H67.31L85.66,53.66A8,8,0,0,0,74.34,42.34l-32,32a8,8,0,0,0,0,11.32Z" />
    </svg>
  );
}

function marketThumb(url: string | null, alt: string) {
  return (
    <div className="goods-card__art size-11 flex-none rounded-[3px]">
      {url ? (
        <RemoteImage
          alt={alt}
          className="goods-card__art-image"
          sizes="44px"
          src={url}
        />
      ) : null}
    </div>
  );
}

function MarketCard({ listing }: { listing: TradeListingView }) {
  const wantLabel = listing.preferredGoods?.name ?? '任意特典';

  return (
    <Link
      className="w-[172px] flex-none snap-start rounded-[4px] border border-[var(--rule)] bg-[var(--surface)] p-[9px]"
      href={`/matches/${listing.id}`}
    >
      <div className="flex items-center gap-[7px]">
        {marketThumb(listing.goods.primaryImageUrl, listing.goods.name)}
        {swapArrow()}
        {marketThumb(
          listing.preferredGoods?.primaryImageUrl ?? null,
          wantLabel,
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-[12.5px] font-medium">
        {listing.goods.name} ⇄ {wantLabel}
      </p>
      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px]">
        {listing.ownerLabel}
      </p>
    </Link>
  );
}

// 换谷市场 band：把最近上架的公开换谷帖带进首页，横向滑动预览，读态不需登录。
export async function HomeMarketSection() {
  let listings: TradeListingView[] = [];
  try {
    listings = await listOpenTradeListings({ limit: 8 });
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) console.error(error);
  }

  if (listings.length === 0) return null;

  return (
    <section className="mt-9 md:mt-12" aria-label="换谷市场">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="section-kicker hidden md:inline-flex">以物易物</p>
          <h2 className="text-[clamp(16px,4.6vw,34px)] md:mt-3">换谷市场</h2>
        </div>
        <Link
          className="shrink-0 text-[11.5px] font-semibold text-[var(--shu)] md:text-sm"
          href="/matches"
        >
          进市场 →
        </Link>
      </div>

      <div className="mt-3 flex snap-x gap-[9px] overflow-x-auto pb-1 [scrollbar-width:none] md:mt-5">
        {listings.map((listing) => (
          <MarketCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}

export function HomeMarketFallback() {
  return (
    <section className="mt-9 md:mt-12">
      <div className="h-7 w-32 animate-pulse rounded-[8px] bg-[var(--sunken)]" />
      <div className="mt-5 flex gap-[9px] overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            className="h-[92px] w-[172px] flex-none animate-pulse rounded-[4px] bg-[var(--sunken)]"
            key={i}
          />
        ))}
      </div>
    </section>
  );
}
