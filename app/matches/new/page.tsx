import type { Metadata } from 'next';
import Link from 'next/link';

import { TradeListingForm } from '@/components/exchange/trade-listing-form';
import { requireAuthUser } from '@/server/auth/session';
import { listUserTradeGoods } from '@/server/data/trade';

export const metadata: Metadata = { title: '发布换谷帖 · 谷布谷图鉴' };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewTradeListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuthUser('/matches/new');
  const query = await searchParams;
  const [tradable, wanted] = await Promise.all([
    listUserTradeGoods(user.id, 'exchange'),
    listUserTradeGoods(user.id, 'wanted'),
  ]);
  const error = one(query.error);

  return (
    <main className="mx-auto w-full px-4 pt-4 pb-24 sm:px-6">
      <section className="border-b border-[var(--rule-2)] pb-3">
        <h1 className="text-[19px] font-bold">发布换谷帖</h1>
        <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
          只有已点亮并设为可换的 SKU 才能发布 · 双方最多反提 3 次,接受后进入履约。
        </p>
        <Link
          className="mt-5 inline-flex text-sm font-semibold text-[var(--shu)]"
          href="/matches"
        >
          ← 返回换谷中心
        </Link>
      </section>

      {error ? (
        <p
          className="callout mt-6 text-sm text-[var(--destructive)]"
          role="alert"
        >
          {error === 'unavailable'
            ? '这件 SKU 尚未点亮，或可换数量、愿望单状态已经变化，请重新核对。'
            : error === 'existing'
              ? '这件 SKU 已有一张开放或暂停的换谷帖，请先管理原帖。'
              : error === 'rate_limited'
                ? '发布得太快了，请稍后再试。'
                : '表单没有通过校验，请检查 SKU、数量和接价规则。'}
        </p>
      ) : null}

      <div className="mt-8">
        <TradeListingForm
          prefilledGoodsId={one(query.goodsId)}
          prefilledWantedGoodsId={one(query.wantedGoodsId)}
          tradable={tradable}
          wanted={wanted}
        />
      </div>
    </main>
  );
}
