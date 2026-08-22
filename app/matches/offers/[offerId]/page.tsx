import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { TradeOfferPanel } from '@/components/exchange/trade-offer-panel';
import { requireAuthUser } from '@/server/auth/session';
import { getTradeOfferForParticipant } from '@/server/data/trade';

export const metadata: Metadata = { title: '换谷协商 · 谷布谷图鉴' };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TradeOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { offerId } = await params;
  const user = await requireAuthUser(`/matches/offers/${offerId}`);
  const [data, query] = await Promise.all([
    getTradeOfferForParticipant({ offerId, viewerId: user.id }),
    searchParams,
  ]);
  if (!data) notFound();
  const feedback = one(query.offer);
  const feedbackText: Record<string, string> = {
    countered: '已提交新的正式方案，现在轮到对方确认。',
    existing: '你们已经有一条协商链，已为你打开当前方案。',
    stale: '方案已被更新或处理，请以页面中的最新版本为准。',
    blocked: '任一方屏蔽对方后，不能继续议价或成交。',
    policy: '这次调整不符合发布者的接价规则。',
    unavailable: '可换数量或 SKU 状态已经变化，暂时不能继续。',
    invalid_terms: '调整后的 SKU、数量或履约方式不符合原换谷帖。',
    forbidden: '现在不是你可以执行该操作的轮次。',
    failed: '当前操作没有完成，请稍后重试。',
    confirm_required: '接受前需要勾选方案核对确认。',
    declined: '这条协商已被拒绝并结束。',
    withdrawn: '当前方案已撤回，协商结束。',
  };

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-[12px]">
        <Link
          className="text-muted-foreground hover:text-[var(--shu)]"
          href="/matches"
        >
          换谷中心
        </Link>
        {data.listing ? (
          <>
            <span className="text-muted-foreground">/</span>
            <Link
              className="text-muted-foreground hover:text-[var(--shu)]"
              href={`/matches/${data.listing.id}`}
            >
              原换谷帖
            </Link>
          </>
        ) : null}
        <span className="text-muted-foreground">/</span>
        <span>协商详情</span>
      </nav>
      {feedback && feedbackText[feedback] ? (
        <p className="callout mb-5 text-sm" role="status">
          {feedbackText[feedback]}
        </p>
      ) : null}
      <TradeOfferPanel viewerId={user.id} {...data} />
    </main>
  );
}
