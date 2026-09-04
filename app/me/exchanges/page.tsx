import type { Metadata } from 'next';
import Link from 'next/link';

import { ReportForm } from '@/components/safety/report-form';
import {
  acceptExchangeAction,
  cancelExchangeAction,
  receiveExchangeAction,
  reviewExchangeAction,
  shipExchangeAction,
} from '@/server/exchanges/actions';
import { exchangeStatusLabels } from '@/lib/exchange/status';
import {
  exchangeOfferStatusLabels,
  negotiationStageLabel,
} from '@/lib/exchange/negotiation';
import { requireAuthUser } from '@/server/auth/session';
import { decideCoordinationProposalAction } from '@/server/social/actions';
import {
  listCoordinationProposalsForUser,
  listExchangesForUser,
  type ExchangeListItem,
} from '@/server/data/exchanges';
import { listTradeActivityForUser } from '@/server/data/trade';
import { startConversationAction } from '@/server/messages/actions';

export const metadata: Metadata = {
  title: '我的换谷单 · 谷布谷图鉴',
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function snapshotName(snapshot: ExchangeListItem['offeredGoods']) {
  return typeof snapshot.name === 'string' ? snapshot.name : '未命名 SKU';
}

function ActionButton({
  action,
  exchangeId,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  exchangeId: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input name="exchangeId" type="hidden" value={exchangeId} />
      <input name="nextPath" type="hidden" value="/me/exchanges" />
      <button
        className="rounded-[var(--radius)] border border-[var(--shu)] px-3 py-1.5 text-[13px] text-[var(--shu)] hover:bg-[var(--shu)] hover:text-[var(--shu-ink)]"
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function actionsFor(exchange: ExchangeListItem, userId: string) {
  const isInitiator = exchange.initiatorId === userId;
  const ownShippedAt = isInitiator
    ? exchange.initiatorShippedAt
    : exchange.recipientShippedAt;
  const ownReceivedAt = isInitiator
    ? exchange.initiatorReceivedAt
    : exchange.recipientReceivedAt;
  if (exchange.status === 'proposed' && !isInitiator) {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton
          action={acceptExchangeAction}
          exchangeId={exchange.id}
          label="接受提案"
        />
        <ActionButton
          action={cancelExchangeAction}
          exchangeId={exchange.id}
          label="拒绝提案"
        />
      </div>
    );
  }
  if (exchange.status === 'proposed') {
    return (
      <ActionButton
        action={cancelExchangeAction}
        exchangeId={exchange.id}
        label="撤回提案"
      />
    );
  }
  if (exchange.status === 'accepted' && !ownShippedAt) {
    const deliveryLabel =
      exchange.fulfillmentMethod === 'meetup' ? '确认已交付' : '确认寄出';
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton
          action={shipExchangeAction}
          exchangeId={exchange.id}
          label={deliveryLabel}
        />
        <ActionButton
          action={cancelExchangeAction}
          exchangeId={exchange.id}
          label="取消换谷"
        />
      </div>
    );
  }
  if (['accepted', 'shipping'].includes(exchange.status) && !ownShippedAt) {
    return (
      <ActionButton
        action={shipExchangeAction}
        exchangeId={exchange.id}
        label={
          exchange.fulfillmentMethod === 'meetup' ? '确认已交付' : '确认寄出'
        }
      />
    );
  }
  if (['shipping', 'received'].includes(exchange.status) && !ownReceivedAt) {
    return (
      <ActionButton
        action={receiveExchangeAction}
        exchangeId={exchange.id}
        label={
          exchange.fulfillmentMethod === 'meetup' ? '确认已接收' : '确认收到'
        }
      />
    );
  }
  return null;
}

function ExchangeProgress({ exchange }: { exchange: ExchangeListItem }) {
  const shipped =
    Number(Boolean(exchange.initiatorShippedAt)) +
    Number(Boolean(exchange.recipientShippedAt));
  const received =
    Number(Boolean(exchange.initiatorReceivedAt)) +
    Number(Boolean(exchange.recipientReceivedAt));
  const stages = [
    { label: '提案', done: true },
    {
      label: `${exchange.fulfillmentMethod === 'meetup' ? '交付' : '寄出'} ${shipped}/2`,
      done: shipped === 2,
    },
    {
      label: `${exchange.fulfillmentMethod === 'meetup' ? '接收' : '收货'} ${received}/2`,
      done: received === 2,
    },
    { label: '完成', done: exchange.status === 'completed' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((stage) => (
        <span
          className={
            stage.done
              ? 'chip border-[var(--kin)] bg-[var(--kin-soft)] px-2.5 py-1 text-[12px]'
              : 'chip px-2.5 py-1 text-[12px]'
          }
          key={stage.label}
        >
          {stage.label}
        </span>
      ))}
    </div>
  );
}

export default async function MyExchangesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuthUser('/me/exchanges');
  const [exchanges, coordinationItems, tradeActivity, query] =
    await Promise.all([
      listExchangesForUser({ userId: user.id }),
      listCoordinationProposalsForUser({ userId: user.id }),
      listTradeActivityForUser(user.id),
      searchParams,
    ]);
  const pendingOffers = tradeActivity.offers.filter(
    (offer) => offer.status === 'pending',
  );
  const needsViewer = pendingOffers.filter(
    (offer) => offer.awaitingUserId === user.id,
  );

  return (
    <main className="mx-auto w-full px-4 pt-4 pb-24 sm:px-6">
      <section className="border-b border-[var(--rule-2)] pb-4">
        <h1 className="text-[19px] font-bold">我的换谷单</h1>
        <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
          协商只认正式方案 · 接受后双方独立寄出/收货/评价 · 全程不涉现金。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['我的发布', tradeActivity.listings.length],
            ['协商中', pendingOffers.length],
            ['等我处理', needsViewer.length],
            ['履约记录', exchanges.length],
          ].map(([label, value]) => (
            <div
              className="rounded-[16px] bg-[var(--surface)]/76 p-3"
              key={label}
            >
              <strong className="text-2xl text-[var(--shu)]">{value}</strong>
              <p className="text-muted-foreground mt-1 text-[11px]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {one(query.accepted) ? (
        <p
          className="callout mt-5 text-sm text-[var(--exchange)]"
          role="status"
        >
          最终方案已接受，双方库存已经预留；现在可以确认寄出或面交交付。
        </p>
      ) : null}

      <section className="py-12" id="negotiations">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">发布与协商</p>
            <h2 className="mt-2 text-[clamp(16px,4.6vw,36px)]">成交之前</h2>
          </div>
          <Link
            className="text-sm font-semibold text-[var(--shu)]"
            href="/matches/new"
          >
            ＋ 发布换谷帖
          </Link>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="text-lg">
              我的发布 · {tradeActivity.listings.length}
            </h3>
            <div className="mt-3 space-y-3">
              {tradeActivity.listings.length ? (
                tradeActivity.listings.map((listing) => (
                  <Link
                    className="panel-float flex min-w-0 items-center gap-3 rounded-[16px] border border-[var(--rule)] bg-[var(--surface)] p-4"
                    href={`/matches/${listing.id}`}
                    key={listing.id}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[var(--exchange-soft)] font-bold text-[var(--exchange)]">
                      ⇄
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">
                        {listing.goods.name}
                      </strong>
                      <span className="text-muted-foreground mt-1 block text-[11px]">
                        {listing.status === 'open'
                          ? '开放出价'
                          : listing.status === 'paused'
                            ? '已暂停'
                            : '已结束'}{' '}
                        · 可换 {listing.offeredQuantity}
                      </span>
                    </span>
                    <span className="text-[var(--shu)]">→</span>
                  </Link>
                ))
              ) : (
                <div className="empty-state">
                  <strong>还没有发布</strong>从可换 SKU 开始发布。
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg">
              正式协商 · {tradeActivity.offers.length}
            </h3>
            <div className="mt-3 space-y-3">
              {tradeActivity.offers.length ? (
                tradeActivity.offers.map((offer) => {
                  const gives =
                    offer.proposerId === user.id
                      ? offer.latestRevision.offeredGoods
                      : offer.latestRevision.requestedGoods;
                  const gets =
                    offer.proposerId === user.id
                      ? offer.latestRevision.requestedGoods
                      : offer.latestRevision.offeredGoods;
                  return (
                    <Link
                      className="panel-float block min-w-0 rounded-[16px] border border-[var(--rule)] bg-[var(--surface)] p-4"
                      href={`/matches/offers/${offer.id}`}
                      key={offer.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={
                            offer.awaitingUserId === user.id &&
                            offer.status === 'pending'
                              ? 'chip border-[var(--shu)] bg-[var(--shu-soft)] px-2.5 py-1 text-[11px] text-[var(--shu)]'
                              : 'chip px-2.5 py-1 text-[11px]'
                          }
                        >
                          {offer.awaitingUserId === user.id &&
                          offer.status === 'pending'
                            ? '等你处理'
                            : exchangeOfferStatusLabels[offer.status]}
                        </span>
                        <span className="num">
                          {negotiationStageLabel(offer.counterCount)}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-semibold">
                        你出「{gives.name}」⇄ 得到「{gets.name}」
                      </p>
                    </Link>
                  );
                })
              ) : (
                <div className="empty-state">
                  <strong>暂无协商</strong>从广场或双向匹配提交第一份出价。
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--rule)] py-12">
        <p className="section-kicker">履约记录</p>
        <h2 className="mt-2 mb-6 text-[clamp(16px,4.6vw,36px)]">成交之后</h2>
        <div className="min-w-0 space-y-3">
          {exchanges.length === 0 ? (
            <div className="empty-state">
              <strong>还没有换谷单</strong>
              从“换谷”页的双向匹配发起第一份提案。
            </div>
          ) : (
            exchanges.map((exchange) => {
              const isInitiator = exchange.initiatorId === user.id;
              const viewerProvides = isInitiator
                ? exchange.offeredGoods
                : exchange.requestedGoods;
              const viewerReceives = isInitiator
                ? exchange.requestedGoods
                : exchange.offeredGoods;
              return (
                <article
                  className="panel grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                  id={`exchange-${exchange.id}`}
                  key={exchange.id}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="chip px-3 py-1">
                        {exchangeStatusLabels[exchange.status]}
                      </span>
                      <span className="text-muted-foreground">
                        {exchange.initiatorLabel} ⇄ {exchange.recipientLabel}
                      </span>
                    </div>
                    <p className="text-[15px]">
                      你提供「{snapshotName(viewerProvides)}」×{' '}
                      {isInitiator
                        ? exchange.offeredQuantity
                        : exchange.requestedQuantity}
                      ，交换「{snapshotName(viewerReceives)}」×{' '}
                      {isInitiator
                        ? exchange.requestedQuantity
                        : exchange.offeredQuantity}
                    </p>
                    <ExchangeProgress exchange={exchange} />
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 lg:justify-self-end">
                    {actionsFor(exchange, user.id)}
                    <form action={startConversationAction}>
                      <input
                        name="recipientId"
                        type="hidden"
                        value={
                          isInitiator
                            ? exchange.recipientId
                            : exchange.initiatorId
                        }
                      />
                      <input
                        name="contextType"
                        type="hidden"
                        value="exchange"
                      />
                      <input
                        name="contextId"
                        type="hidden"
                        value={exchange.id}
                      />
                      <button
                        className="rounded-[var(--radius)] border border-[var(--rule)] px-3 py-1.5 text-[13px] hover:border-[var(--sky)] hover:text-[var(--sky)]"
                        type="submit"
                      >
                        私信对方
                      </button>
                    </form>
                  </div>
                  {exchange.status === 'completed' &&
                  !exchange.reviewedByViewer ? (
                    <form
                      action={reviewExchangeAction}
                      className="flex shrink-0 flex-wrap items-end gap-2 lg:col-span-2"
                    >
                      <input
                        name="exchangeId"
                        type="hidden"
                        value={exchange.id}
                      />
                      <label className="text-xs">
                        评分
                        <select
                          className="border-input bg-background ml-2 rounded border px-2 py-1"
                          name="score"
                        >
                          {[5, 4, 3, 2, 1].map((score) => (
                            <option key={score} value={score}>
                              {score}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        className="border-input bg-background w-36 rounded border px-2 py-1 text-xs"
                        maxLength={500}
                        name="note"
                        placeholder="评价（可选）"
                      />
                      <button
                        className="border-input rounded border px-2 py-1 text-xs"
                        type="submit"
                      >
                        提交评价
                      </button>
                    </form>
                  ) : exchange.reviewedByViewer ? (
                    <span className="text-muted-foreground text-xs">
                      已提交评价
                    </span>
                  ) : null}
                  <div className="lg:col-span-2">
                    <ReportForm
                      reason="exchange_issue"
                      targetId={exchange.id}
                      targetType="exchange"
                    />
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="border-border border-t py-12">
        <div className="min-w-0 space-y-3">
          <p className="section-kicker">三方循环</p>
          <h2 className="mt-2 text-[clamp(16px,4.6vw,36px)]">协调提案</h2>
          {coordinationItems.length ? (
            coordinationItems.map((item) => (
              <article className="panel p-5" key={item.id}>
                <p className="text-sm">
                  状态：
                  {{
                    proposed: '待确认',
                    accepted: '已确认',
                    cancelled: '已取消',
                  }[item.status] ?? item.status}{' '}
                  · 已确认 {item.acceptedUserIds.length}/
                  {item.participantIds.length}
                </p>
                {item.status === 'proposed' ? (
                  <form
                    action={decideCoordinationProposalAction}
                    className="mt-3 flex gap-2"
                  >
                    <input name="proposalId" type="hidden" value={item.id} />
                    <button
                      className="rounded border px-3 py-1 text-sm"
                      name="decision"
                      value="accept"
                    >
                      确认参与
                    </button>
                    <button
                      className="rounded border px-3 py-1 text-sm"
                      name="decision"
                      value="cancel"
                    >
                      取消协调
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">暂无三方协调提案。</p>
          )}
        </div>
      </section>
    </main>
  );
}
