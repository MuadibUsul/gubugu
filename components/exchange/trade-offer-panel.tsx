import Link from 'next/link';

import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { Button } from '@/components/ui/button';
import { exchangeFulfillmentMethodMeta } from '@/lib/exchange/fulfillment';
import {
  MAX_OFFER_COUNTERS,
  exchangeOfferStatusLabels,
  negotiationStageLabel,
} from '@/lib/exchange/negotiation';
import { formatCatalogDate } from '@/lib/formatters';
import type {
  TradeInventoryItem,
  TradeListingView,
  TradeOfferRevisionView,
  TradeOfferView,
} from '@/server/data/trade';
import { startConversationAction } from '@/server/messages/actions';
import {
  counterTradeOfferAction,
  decideTradeOfferAction,
} from '@/server/trade/actions';

function GoodsTerm({
  item,
  quantity,
  tone,
}: {
  item: TradeOfferRevisionView['offeredGoods'];
  quantity: number;
  tone: 'give' | 'receive';
}) {
  return (
    <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-[16px] border border-[var(--rule)] bg-[var(--surface)] p-2">
      <GoodsCardArt
        alt={item.name}
        className="aspect-square rounded-[12px]"
        imageUrl={item.primaryImageUrl}
        sizes="72px"
      />
      <div className="min-w-0 self-center">
        <p
          className={
            tone === 'give'
              ? 'text-[11px] font-bold text-[var(--exchange)]'
              : 'text-[11px] font-bold text-[var(--want)]'
          }
        >
          {tone === 'give' ? '你付出' : '你收到'} · {quantity} 件
        </p>
        <Link
          className="mt-1 line-clamp-2 text-[13px] font-semibold hover:text-[var(--shu)]"
          href={`/goods/${item.slug}`}
        >
          {item.name}
        </Link>
      </div>
    </div>
  );
}

function CurrentTerms({
  revision,
  viewerIsProposer,
}: {
  revision: TradeOfferRevisionView;
  viewerIsProposer: boolean;
}) {
  const gives = viewerIsProposer
    ? {
        goods: revision.offeredGoods,
        quantity: revision.offeredQuantity,
        condition: revision.offeredConditionNote,
      }
    : {
        goods: revision.requestedGoods,
        quantity: revision.requestedQuantity,
        condition: revision.requestedConditionNote,
      };
  const receives = viewerIsProposer
    ? {
        goods: revision.requestedGoods,
        quantity: revision.requestedQuantity,
        condition: revision.requestedConditionNote,
      }
    : {
        goods: revision.offeredGoods,
        quantity: revision.offeredQuantity,
        condition: revision.offeredConditionNote,
      };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <GoodsTerm item={gives.goods} quantity={gives.quantity} tone="give" />
        <GoodsTerm
          item={receives.goods}
          quantity={receives.quantity}
          tone="receive"
        />
      </div>
      <div className="grid gap-3 rounded-[16px] bg-[var(--sunken)] p-4 text-[12px] sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">履约方式</p>
          <strong className="mt-1 block">
            {exchangeFulfillmentMethodMeta[revision.fulfillmentMethod].label}
          </strong>
        </div>
        <div>
          <p className="text-muted-foreground">你付出的品相</p>
          <strong className="mt-1 block break-words">
            {gives.condition || '未补充'}
          </strong>
        </div>
        <div>
          <p className="text-muted-foreground">你收到的品相</p>
          <strong className="mt-1 block break-words">
            {receives.condition || '未补充'}
          </strong>
        </div>
      </div>
      {revision.message ? (
        <blockquote className="border-l-2 border-[var(--violet)] pl-4 text-[13px] leading-relaxed break-words">
          {revision.message}
        </blockquote>
      ) : null}
    </div>
  );
}

function CounterForm({
  offer,
  listing,
  proposerTradable,
  recipientTradable,
  viewerId,
}: {
  offer: TradeOfferView;
  listing: TradeListingView | null;
  proposerTradable: TradeInventoryItem[];
  recipientTradable: TradeInventoryItem[];
  viewerId: string;
}) {
  const latest = offer.latestRevision;
  const methods = listing
    ? listing.fulfillmentMethod === 'either'
      ? (['shipping', 'meetup'] as const)
      : ([listing.fulfillmentMethod] as const)
    : (['shipping', 'meetup'] as const);

  return (
    <details className="rounded-[18px] border border-[var(--violet)] bg-[var(--violet-soft)]/50 p-4">
      <summary className="cursor-pointer font-semibold text-[var(--violet)]">
        修改方案 · 还可议价 {MAX_OFFER_COUNTERS - offer.counterCount} 次
      </summary>
      <form action={counterTradeOfferAction} className="mt-5 space-y-4">
        <input name="offerId" type="hidden" value={offer.id} />
        <input name="revisionNumber" type="hidden" value={offer.counterCount} />
        <label className="block text-sm font-semibold">
          {viewerId === offer.proposerId
            ? '你愿意提供的 SKU'
            : '希望对方提供的 SKU'}
          <select
            className="ui-input mt-2 w-full"
            defaultValue={latest.offeredGoods.id}
            name="offeredGoodsId"
          >
            {proposerTradable.map((item) => (
              <option key={item.goods.id} value={item.goods.id}>
                {item.goods.name} · 可换 {item.tradableQuantity}
              </option>
            ))}
          </select>
        </label>
        {listing ? (
          <input
            name="requestedGoodsId"
            type="hidden"
            value={listing.goods.id}
          />
        ) : (
          <label className="block text-sm font-semibold">
            {viewerId === offer.recipientId
              ? '你愿意给出的 SKU'
              : '希望对方给出的 SKU'}
            <select
              className="ui-input mt-2 w-full"
              defaultValue={latest.requestedGoods.id}
              name="requestedGoodsId"
            >
              {recipientTradable.map((item) => (
                <option key={item.goods.id} value={item.goods.id}>
                  {item.goods.name} · 可换 {item.tradableQuantity}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            报价方数量
            <input
              className="ui-input mt-2 w-full"
              defaultValue={latest.offeredQuantity}
              min={1}
              name="offeredQuantity"
              type="number"
            />
          </label>
          <label className="block text-sm font-semibold">
            接价方数量
            <input
              className="ui-input mt-2 w-full"
              defaultValue={latest.requestedQuantity}
              max={listing?.offeredQuantity}
              min={1}
              name="requestedQuantity"
              type="number"
            />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">履约方式</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {methods.map((method) => (
              <label
                className="rounded-full border border-[var(--rule)] px-3 py-2 text-sm has-[:checked]:border-[var(--violet)] has-[:checked]:bg-[var(--surface)]"
                key={method}
              >
                <input
                  className="mr-2"
                  defaultChecked={method === latest.fulfillmentMethod}
                  name="fulfillmentMethod"
                  type="radio"
                  value={method}
                />
                {exchangeFulfillmentMethodMeta[method].label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">
          你提供物的品相
          <input
            className="ui-input mt-2 w-full"
            defaultValue={
              viewerId === offer.proposerId
                ? (latest.offeredConditionNote ?? '')
                : (latest.requestedConditionNote ?? '')
            }
            maxLength={280}
            name="conditionNote"
            placeholder="未拆 / 已拆摆 / 瑕疵位置"
          />
        </label>
        <label className="block text-sm font-semibold">
          这次调整的说明
          <textarea
            className="ui-input mt-2 min-h-20 w-full resize-y"
            maxLength={600}
            name="message"
            placeholder="说明为什么调整；不要在这里发送地址或联系方式。"
            required
          />
        </label>
        <Button type="submit" variant="outline">
          提交第 {offer.counterCount + 1}/{MAX_OFFER_COUNTERS} 次议价
        </Button>
      </form>
    </details>
  );
}

export function TradeOfferPanel({
  offer,
  listing,
  proposerTradable,
  recipientTradable,
  viewerId,
}: {
  offer: TradeOfferView;
  listing: TradeListingView | null;
  proposerTradable: TradeInventoryItem[];
  recipientTradable: TradeInventoryItem[];
  viewerId: string;
}) {
  const viewerIsProposer = viewerId === offer.proposerId;
  const partnerId = viewerIsProposer ? offer.recipientId : offer.proposerId;
  const partnerLabel = viewerIsProposer
    ? offer.recipientLabel
    : offer.proposerLabel;
  const canRespond =
    offer.status === 'pending' && offer.awaitingUserId === viewerId;
  const canCounter = canRespond && offer.counterCount < MAX_OFFER_COUNTERS;
  const canWithdraw =
    offer.status === 'pending' &&
    offer.awaitingUserId !== viewerId &&
    offer.latestRevision.actorId === viewerId;

  return (
    <div className="space-y-5">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-kicker">当前正式方案</p>
            <h1 className="mt-2 text-[clamp(28px,4vw,40px)]">
              {viewerIsProposer ? '你与' : ''}
              {partnerLabel}
              {viewerIsProposer ? ' 的协商' : '向你的出价'}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip px-3 py-1.5 text-[12px]">
              {exchangeOfferStatusLabels[offer.status]}
            </span>
            <span className="chip border-[var(--violet)] bg-[var(--violet-soft)] px-3 py-1.5 text-[12px] text-[var(--violet)]">
              {negotiationStageLabel(offer.counterCount)}
            </span>
          </div>
        </div>
        <div className="mt-6">
          <CurrentTerms
            revision={offer.latestRevision}
            viewerIsProposer={viewerIsProposer}
          />
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">下一步</p>
            <h2 className="mt-2 text-[22px]">
              {offer.status !== 'pending'
                ? exchangeOfferStatusLabels[offer.status]
                : canRespond
                  ? '轮到你确认当前方案'
                  : `等待 ${partnerLabel} 回复`}
            </h2>
          </div>
          <form action={startConversationAction}>
            <input name="recipientId" type="hidden" value={partnerId} />
            <input name="contextType" type="hidden" value="offer" />
            <input name="contextId" type="hidden" value={offer.id} />
            <Button type="submit" variant="outline">
              私信沟通
            </Button>
          </form>
        </div>

        {canRespond ? (
          <div className="mt-5 space-y-4">
            <form
              action={decideTradeOfferAction}
              className="rounded-[18px] border border-[var(--exchange)] bg-[var(--exchange-soft)] p-4"
            >
              <input name="offerId" type="hidden" value={offer.id} />
              <input
                name="revisionNumber"
                type="hidden"
                value={offer.counterCount}
              />
              <input name="decision" type="hidden" value="accept" />
              <label className="flex items-start gap-3 text-[12px] leading-relaxed">
                <input
                  className="mt-1"
                  name="confirm"
                  type="checkbox"
                  value="yes"
                />
                <span>
                  我已核对双方
                  SKU、数量、品相与履约方式；接受后将生成换谷单，并结束同帖其他出价。
                </span>
              </label>
              <Button className="mt-4 w-full" type="submit">
                接受当前方案并成交
              </Button>
            </form>
            {canCounter ? (
              <CounterForm
                listing={listing}
                offer={offer}
                proposerTradable={proposerTradable}
                recipientTradable={recipientTradable}
                viewerId={viewerId}
              />
            ) : (
              <p className="callout text-sm">
                已用完 3 次议价；现在只能接受或拒绝当前方案。
              </p>
            )}
            <form action={decideTradeOfferAction}>
              <input name="offerId" type="hidden" value={offer.id} />
              <input
                name="revisionNumber"
                type="hidden"
                value={offer.counterCount}
              />
              <button
                className="min-h-11 w-full rounded-[14px] border border-[var(--destructive)] px-4 text-sm font-semibold text-[var(--destructive)]"
                name="decision"
                type="submit"
                value="decline"
              >
                拒绝并结束协商
              </button>
            </form>
          </div>
        ) : null}

        {canWithdraw ? (
          <form action={decideTradeOfferAction} className="mt-5">
            <input name="offerId" type="hidden" value={offer.id} />
            <input
              name="revisionNumber"
              type="hidden"
              value={offer.counterCount}
            />
            <button
              className="text-muted-foreground text-sm hover:text-[var(--destructive)]"
              name="decision"
              type="submit"
              value="withdraw"
            >
              撤回当前方案并结束协商
            </button>
          </form>
        ) : null}

        {offer.acceptedExchangeId ? (
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-[14px] bg-[var(--shu)] px-5 text-sm font-semibold text-white"
            href="/me/exchanges"
          >
            进入换谷单 →
          </Link>
        ) : null}
      </section>

      <section className="panel p-5 sm:p-6">
        <p className="section-kicker">协商记录</p>
        <h2 className="mt-2 text-[22px]">每次正式变更都留在这里</h2>
        <ol className="mt-5 space-y-0">
          {offer.revisions.map((revision, index) => (
            <li
              className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 pb-6 last:pb-0"
              key={revision.id}
            >
              <span className="relative z-10 mt-1 grid size-6 place-items-center rounded-full bg-[var(--violet)] text-[10px] font-bold text-white">
                {revision.revisionNumber}
              </span>
              {index < offer.revisions.length - 1 ? (
                <span className="absolute top-6 bottom-0 left-[11px] w-px bg-[var(--rule)]" />
              ) : null}
              <div className="min-w-0 rounded-[14px] bg-[var(--sunken)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                  <strong>{revision.actorLabel}</strong>
                  <span className="num">
                    {formatCatalogDate(revision.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed">
                  {revision.offeredGoods.name} × {revision.offeredQuantity} ⇄{' '}
                  {revision.requestedGoods.name} × {revision.requestedQuantity}
                </p>
                {revision.message ? (
                  <p className="text-muted-foreground mt-2 text-[12px] break-words">
                    {revision.message}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
