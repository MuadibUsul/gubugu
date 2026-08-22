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
    <main className="mx-auto w-full max-w-[1040px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--rule)] bg-[linear-gradient(135deg,var(--exchange-soft),color-mix(in_oklab,var(--violet-soft)_76%,var(--surface)))] px-5 py-8 sm:px-8 sm:py-10">
        <p className="section-kicker">换谷广场 · 新发布</p>
        <h1 className="mt-4 text-[clamp(32px,4.6vw,48px)]">发布一张换谷帖</h1>
        <p className="text-muted-foreground mt-3 max-w-[66ch] text-sm leading-relaxed">
          只有通过实物识别点亮、并明确设为可换的 SKU
          才能发布。对方提交正式方案后， 双方最多反提 3 次；接受后才进入履约。
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
