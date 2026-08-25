import Link from 'next/link';

import { TradeListingCard } from '@/components/exchange/trade-listing-card';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';
import { listOpenTradeListings } from '@/server/data/trade';

// 换谷市场 band：把最近上架的公开换谷帖带进首页，横向滑动预览，读态不需登录。
export async function HomeMarketSection() {
  let listings: Awaited<ReturnType<typeof listOpenTradeListings>> = [];
  try {
    listings = await listOpenTradeListings({ limit: 8 });
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) console.error(error);
  }

  if (listings.length === 0) return null;

  return (
    <section className="mt-12" aria-label="换谷市场">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="section-kicker">以物易物</p>
          <h2 className="mt-3 text-[clamp(24px,3vw,34px)]">换谷市场</h2>
        </div>
        <Link
          className="shrink-0 text-sm font-bold text-[var(--shu)]"
          href="/matches"
        >
          去换谷 →
        </Link>
      </div>

      <div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
        {listings.map((listing) => (
          <div className="w-[236px] shrink-0 snap-start" key={listing.id}>
            <TradeListingCard listing={listing} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeMarketFallback() {
  return (
    <section className="mt-12">
      <div className="h-8 w-40 animate-pulse rounded-[10px] bg-[var(--sunken)]" />
      <div className="mt-5 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            className="h-64 w-[236px] shrink-0 animate-pulse rounded-[var(--radius)] bg-[var(--sunken)]"
            key={i}
          />
        ))}
      </div>
    </section>
  );
}
