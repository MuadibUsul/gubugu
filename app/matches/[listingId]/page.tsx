import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ListingOfferForm } from '@/components/exchange/listing-offer-form';
import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { ReportForm } from '@/components/safety/report-form';
import { Button } from '@/components/ui/button';
import { exchangeFulfillmentMethodMeta } from '@/lib/exchange/fulfillment';
import {
  exchangeOfferPolicyMeta,
  exchangeOfferStatusLabels,
  negotiationStageLabel,
} from '@/lib/exchange/negotiation';
import { requireAuthUser } from '@/server/auth/session';
import { getTradeListingForViewer } from '@/server/data/trade';
import { startConversationAction } from '@/server/messages/actions';
import { updateTradeListingStatusAction } from '@/server/trade/actions';

export const metadata: Metadata = { title: '换谷帖 · 谷布谷图鉴' };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TradeListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { listingId } = await params;
  const user = await requireAuthUser(`/matches/${listingId}`);
  const [data, query] = await Promise.all([
    getTradeListingForViewer({ listingId, viewerId: user.id }),
    searchParams,
  ]);
  if (!data) notFound();
  const { listing, ownerWanted, viewerTradable, offers, viewerOfferId } = data;
  const isOwner = listing.ownerId === user.id;
  const ownerWantedGoodsIds = new Set(ownerWanted.map((item) => item.goods.id));
  const offerFeedback = one(query.offer);
  const statusFeedback = one(query.status);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-[12px]">
        <Link
          className="text-muted-foreground hover:text-[var(--shu)]"
          href="/matches"
        >
          换谷中心
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>换谷帖</span>
      </nav>

      {offerFeedback ? (
        <p className="callout mb-5 text-sm" role="status">
          {{
            policy: '这张帖只接受发布者愿望单中的 SKU。',
            unavailable: '库存或帖子状态已经变化，请重新核对。',
            rate_limited: '提交得太快了，请稍后再试。',
          }[offerFeedback] ?? '当前请求没有完成，请重新检查方案。'}
        </p>
      ) : null}
      {statusFeedback ? (
        <p className="callout mb-5 text-sm" role="status">
          {{
            open: '换谷帖已重新开放。',
            paused: '已暂停接收新的出价，已有协商仍可继续。',
            closed: '换谷帖已关闭，待处理出价也已结束。',
            unavailable: '当前可换数量不足，不能重新开放这张帖。',
          }[statusFeedback] ?? '帖子状态没有改变。'}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section className="panel grid gap-6 p-5 sm:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] sm:p-6">
            <GoodsCardArt
              alt={listing.goods.name}
              className="aspect-[4/5] rounded-[20px]"
              imageUrl={listing.goods.primaryImageUrl}
              sizes="(max-width: 640px) 100vw, 320px"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="chip border-[var(--exchange)] bg-[var(--exchange-soft)] px-3 py-1.5 text-[12px] text-[var(--exchange)]">
                  {exchangeOfferPolicyMeta[listing.offerPolicy].label}
                </span>
                <span className="chip px-3 py-1.5 text-[12px]">
                  {listing.status === 'open'
                    ? '开放出价'
                    : listing.status === 'paused'
                      ? '已暂停'
                      : '已结束'}
                </span>
              </div>
              <h1 className="mt-4 text-[clamp(28px,4vw,42px)] leading-tight">
                {listing.goods.name}
              </h1>
              <p className="num mt-2">{listing.goods.skuCode}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[16px] bg-[var(--sunken)] p-3">
                  <p className="text-muted-foreground text-[11px]">可换数量</p>
                  <strong className="mt-1 block text-xl">
                    {listing.offeredQuantity}
                  </strong>
                </div>
                <div className="rounded-[16px] bg-[var(--sunken)] p-3">
                  <p className="text-muted-foreground text-[11px]">履约方式</p>
                  <strong className="mt-1 block">
                    {
                      exchangeFulfillmentMethodMeta[listing.fulfillmentMethod]
                        .label
                    }
                  </strong>
                </div>
              </div>
              <p className="mt-6 text-[14px] leading-7 whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="section-kicker">发布者与接价边界</p>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{listing.ownerLabel}</p>
                {listing.owner?.handle ? (
                  <Link
                    className="num mt-1 inline-block hover:text-[var(--shu)]"
                    href={`/users/${listing.owner.handle}`}
                  >
                    @{listing.owner.handle} →
                  </Link>
                ) : null}
              </div>
              {!isOwner ? (
                <form action={startConversationAction}>
                  <input
                    name="recipientId"
                    type="hidden"
                    value={listing.ownerId}
                  />
                  <input name="contextType" type="hidden" value="listing" />
                  <input name="contextId" type="hidden" value={listing.id} />
                  <Button type="submit" variant="outline">
                    私信发布者
                  </Button>
                </form>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] bg-[var(--exchange-soft)] p-4 text-sm">
                <p className="font-semibold">品相</p>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {listing.conditionNote || '发布者未补充品相说明'}
                </p>
              </div>
              <div className="rounded-[16px] bg-[var(--violet-soft)] p-4 text-sm">
                <p className="font-semibold">地点提示</p>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {listing.locationHint || '未限定城市或面交地点'}
                </p>
              </div>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="section-kicker">发布者想要的</p>
            <h2 className="mt-2 text-[24px]">
              {listing.offerPolicy === 'wishlist_only'
                ? '初次出价必须来自这份愿望单'
                : '这些是偏好，也愿意看看其他谷'}
            </h2>
            {ownerWanted.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {ownerWanted.slice(0, 8).map((item) => (
                  <Link
                    className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-[14px] bg-[var(--sunken)] p-2"
                    href={`/goods/${item.goods.slug}`}
                    key={item.goods.id}
                  >
                    <GoodsCardArt
                      alt={item.goods.name}
                      className="aspect-square rounded-[10px]"
                      imageUrl={item.goods.primaryImageUrl}
                      sizes="56px"
                    />
                    <span className="min-w-0">
                      <strong className="line-clamp-2 text-[12px]">
                        {item.goods.name}
                      </strong>
                      {item.wishlistPriority === 'super_want' ? (
                        <span className="mt-1 block text-[10px] text-[var(--want)]">
                          超想要
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-4 text-sm">
                愿望单暂时为空。
              </p>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <section className="panel p-5">
            {isOwner ? (
              <div>
                <p className="section-kicker">管理这张帖</p>
                <h2 className="mt-2 text-[22px]">
                  已收到 {offers.length} 份出价
                </h2>
                {offers.length ? (
                  <div className="mt-4 space-y-2">
                    {offers.map((offer) => (
                      <Link
                        className="block min-h-11 rounded-[14px] bg-[var(--violet-soft)] px-4 py-3 text-sm"
                        href={`/matches/offers/${offer.id}`}
                        key={offer.id}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <strong className="truncate text-[var(--violet)]">
                            {offer.proposerLabel}
                          </strong>
                          <span className="shrink-0 text-[var(--violet)]">
                            →
                          </span>
                        </span>
                        <span className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 text-[11px]">
                          <span>{exchangeOfferStatusLabels[offer.status]}</span>
                          <span>
                            {negotiationStageLabel(offer.counterCount)}
                          </span>
                          {offer.status === 'pending' &&
                          offer.awaitingUserId === user.id ? (
                            <b className="text-[var(--shu)]">等你处理</b>
                          ) : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-3 text-sm">
                    暂无出价。帖子会继续出现在换谷广场。
                  </p>
                )}
                {listing.status !== 'closed' ? (
                  <div className="mt-5 grid gap-2">
                    <form action={updateTradeListingStatusAction}>
                      <input
                        name="listingId"
                        type="hidden"
                        value={listing.id}
                      />
                      <button
                        className="min-h-11 w-full rounded-[14px] border border-[var(--rule)] text-sm font-semibold"
                        name="decision"
                        type="submit"
                        value={listing.status === 'open' ? 'pause' : 'resume'}
                      >
                        {listing.status === 'open' ? '暂停新出价' : '重新开放'}
                      </button>
                    </form>
                    <form action={updateTradeListingStatusAction}>
                      <input
                        name="listingId"
                        type="hidden"
                        value={listing.id}
                      />
                      <button
                        className="min-h-11 w-full rounded-[14px] border border-[var(--destructive)] text-sm font-semibold text-[var(--destructive)]"
                        name="decision"
                        type="submit"
                        value="close"
                      >
                        关闭并结束全部协商
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : viewerOfferId ? (
              <div>
                <p className="section-kicker">你的出价</p>
                <h2 className="mt-2 text-[22px]">协商已经开始</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  同一张帖只能建立一条协商链，不能重开来绕过 3 次限制。
                </p>
                <Link
                  className="mt-5 flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--shu)] px-4 text-sm font-semibold text-white"
                  href={`/matches/offers/${viewerOfferId}`}
                >
                  查看当前方案 →
                </Link>
              </div>
            ) : listing.status === 'open' ? (
              <ListingOfferForm
                inventory={viewerTradable}
                listing={listing}
                ownerWantedGoodsIds={ownerWantedGoodsIds}
              />
            ) : (
              <div className="empty-state">
                <strong>这张帖目前不接新出价</strong>
                已有协商仍可从“我的换谷”继续处理。
              </div>
            )}
          </section>
          {!isOwner ? (
            <ReportForm
              reason="exchange_listing_issue"
              targetId={listing.id}
              targetType="exchange_listing"
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}
