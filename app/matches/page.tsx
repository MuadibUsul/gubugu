import type { Metadata } from 'next';
import Link from 'next/link';

import { TradeListingCard } from '@/components/exchange/trade-listing-card';
import { GoodsCardArt } from '@/components/goods/goods-card-art';
import { Button } from '@/components/ui/button';
import type { GoodsCardData } from '@/server/data/_shared';
import { requireAuthUser } from '@/server/auth/session';
import {
  getMatchesForUser,
  type DirectMatchView,
  type ThreePartyCycleView,
} from '@/server/data/matching';
import {
  listOpenTradeListings,
  listTradeActivityForUser,
} from '@/server/data/trade';
import { createCoordinationProposalAction } from '@/server/social/actions';
import { createDirectOfferAction } from '@/server/trade/actions';

export const metadata: Metadata = {
  title: '换谷 · 谷布谷图鉴',
  description:
    '基于你的谷柜与愿望单，后端匹配引擎为你找到可以互惠交换的收藏者，包括双向与三方循环换谷。',
};

function GoodsChip({ item }: { item: GoodsCardData }) {
  return (
    <Link
      className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-[14px] border border-[var(--rule)] bg-[var(--sunken)]/55 p-1.5 hover:border-[var(--shu)]"
      href={`/goods/${item.slug}`}
    >
      <GoodsCardArt
        alt={item.name}
        className="aspect-square"
        imageUrl={item.primaryImageUrl}
        sizes="64px"
      />
      <span className="line-clamp-2 text-[12px] leading-snug">{item.name}</span>
    </Link>
  );
}

function GoodsRow({ items }: { items: GoodsCardData[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-[13px]">—</p>;
  }
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <GoodsChip item={item} key={item.id} />
      ))}
    </div>
  );
}

function DirectMatchCard({ match }: { match: DirectMatchView }) {
  const offeredGoods = match.otherReceives[0];
  const requestedGoods = match.viewerReceives[0];

  return (
    <article className="panel-float rounded-[20px] border border-[var(--rule)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">换谷匹配度</p>
          <p className="font-heading text-[40px] leading-none text-[var(--shu)]">
            {match.score}
            <span className="ml-1 text-[18px] text-[var(--ink-3)]">/100</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-medium">{match.otherLabel}</p>
          {match.otherHandle ? (
            <Link
              className="num hover:text-[var(--shu)]"
              href={`/users/${match.otherHandle}`}
            >
              查看谷柜 →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="lbl mb-2">你将得到</p>
          <GoodsRow items={match.viewerReceives} />
        </div>
        <div>
          <p className="lbl mb-2">你需要提供</p>
          <GoodsRow items={match.otherReceives} />
        </div>
      </div>

      {/* 可解释的匹配拆解：分数由后端算好，前端只展示 */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {match.facets.map((facet) => (
          <div
            className="rounded-[12px] bg-[var(--sunken)] px-3 py-2.5"
            key={facet.key}
          >
            <p className="num">{facet.label}</p>
            <p className="font-heading mt-0.5 text-[15px]">
              {facet.score}
              <span className="text-[var(--ink-3)]">/{facet.max}</span>
            </p>
          </div>
        ))}
      </div>

      {offeredGoods && requestedGoods ? (
        <form
          action={createDirectOfferAction}
          className="border-border mt-5 space-y-3 border-t pt-4"
        >
          <input name="recipientId" type="hidden" value={match.otherUserId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              你提供的 SKU
              <select
                className="ui-input mt-2 w-full"
                defaultValue={offeredGoods.id}
                name="offeredGoodsId"
              >
                {match.otherReceives.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              你想换到的 SKU
              <select
                className="ui-input mt-2 w-full"
                defaultValue={requestedGoods.id}
                name="requestedGoodsId"
              >
                {match.viewerReceives.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              你提供的数量
              <input
                className="ui-input mt-2 w-full"
                defaultValue="1"
                min="1"
                name="offeredQuantity"
                type="number"
              />
            </label>
            <label className="text-sm font-semibold">
              希望换到的数量
              <input
                className="ui-input mt-2 w-full"
                defaultValue="1"
                min="1"
                name="requestedQuantity"
                type="number"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold">履约：</span>
            {(['shipping', 'meetup'] as const).map((method) => (
              <label key={method}>
                <input
                  className="mr-1.5"
                  defaultChecked={method === 'shipping'}
                  name="fulfillmentMethod"
                  type="radio"
                  value={method}
                />
                {method === 'shipping' ? '邮寄' : '面交'}
              </label>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="border-input bg-background rounded border px-3 py-2 text-sm"
              maxLength={280}
              name="conditionNote"
              placeholder="你的谷子品相（创建后冻结）"
            />
            <input
              className="border-input bg-background rounded border px-3 py-2 text-sm"
              maxLength={600}
              name="message"
              placeholder="给对方的说明（可选）"
            />
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            先进入协商，初次方案不计议价；双方最多再反提 3
            次，接受后才冻结成换谷单。
          </p>
          <Button type="submit">提交初次出价</Button>
        </form>
      ) : null}
    </article>
  );
}

function ThreePartyCard({ cycle }: { cycle: ThreePartyCycleView }) {
  return (
    <article className="panel-float min-w-0 space-y-4 rounded-[20px] border border-[var(--rule)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="lbl">三方循环换谷</p>
        <span className="num block min-w-0 flex-1 truncate text-right">
          {cycle.legs.map((leg) => leg.fromLabel).join(' → ')} →{' '}
          {cycle.legs[0]?.fromLabel}
        </span>
      </div>

      <div className="space-y-3">
        {cycle.legs.map((leg, index) => (
          <div
            className="border-border border-b pb-3 last:border-0"
            key={index}
          >
            <p className="text-[13px]">
              <span className="font-medium">{leg.fromLabel}</span>
              <span className="text-muted-foreground"> 从 </span>
              <span className="font-medium">{leg.toLabel}</span>
              <span className="text-muted-foreground"> 处换到</span>
            </p>
            <div className="mt-2">
              <GoodsRow items={leg.goods} />
            </div>
          </div>
        ))}
      </div>
      <form action={createCoordinationProposalAction}>
        <input
          name="participantIds"
          type="hidden"
          value={JSON.stringify(cycle.legs.map((leg) => leg.fromUserId))}
        />
        <input name="nextPath" type="hidden" value="/matches" />
        <Button type="submit" variant="outline">
          发起三方协调
        </Button>
      </form>
    </article>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuthUser('/matches');
  const [{ direct, threeParty }, listings, activity, query] = await Promise.all(
    [
      getMatchesForUser(user.id),
      listOpenTradeListings({ limit: 12 }),
      listTradeActivityForUser(user.id),
      searchParams,
    ],
  );
  const offerFeedback = one(query.offer);
  const pendingOffers = activity.offers.filter(
    (offer) => offer.status === 'pending',
  );
  const waitingForViewer = pendingOffers.filter(
    (offer) => offer.awaitingUserId === user.id,
  );

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--rule)] bg-[linear-gradient(135deg,var(--shu-soft),color-mix(in_oklab,var(--violet-soft)_72%,var(--surface)))] px-5 py-8 sm:px-8 sm:py-10">
        <span className="absolute -top-24 right-[8%] size-64 rounded-full bg-[color-mix(in_oklab,var(--violet)_9%,transparent)] blur-3xl" />
        <div className="relative min-w-0">
          <p className="section-kicker">谷布谷 · 以物换物中心</p>
          <h1 className="mt-4 text-[clamp(32px,4vw,48px)] leading-[1.12]">
            从一张换谷帖，走到双方都满意
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[68ch] leading-relaxed">
            公开发布可换
            SKU，选择「仅收愿望单」或「也看其他谷」；收到出价后双方最多议价 3
            次，接受最终方案才进入寄出与收货。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="chip px-3.5 py-2">
              <b className="text-foreground">{listings.length}</b>&nbsp;
              张开放换谷帖
            </span>
            <span className="chip px-3.5 py-2">
              <b className="text-foreground">{waitingForViewer.length}</b>&nbsp;
              件等你处理
            </span>
            <Link
              className="inline-flex min-h-10 items-center rounded-full bg-[var(--shu)] px-4 text-sm font-semibold text-white"
              href="/matches/new"
            >
              发布换谷帖
            </Link>
          </div>
        </div>
      </section>

      {offerFeedback ? (
        <p className="callout mt-5 text-sm" role="status">
          {{
            invalid: '出价参数不完整，请重新选择 SKU、数量与履约方式。',
            unavailable: '库存、愿望匹配或对方状态已经变化，暂时不能提交。',
            failed: '协商没有建立成功，请稍后重试。',
          }[offerFeedback] ?? '当前请求没有完成，请重新核对方案。'}
        </p>
      ) : null}

      <nav
        aria-label="换谷中心分区"
        className="mt-5 flex flex-wrap gap-2 rounded-[18px] border border-[var(--rule)] bg-[var(--surface)] p-2 shadow-[var(--shadow-card)]"
      >
        {[
          ['#plaza', '换谷广场'],
          ['#mine', '我的协商'],
          ['#matching', '愿望匹配'],
        ].map(([href, label]) => (
          <Link
            className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[var(--shu-soft)] hover:text-[var(--shu)]"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
        <Link
          className="ml-auto rounded-full px-4 py-2 text-sm font-semibold text-[var(--violet)] hover:bg-[var(--violet-soft)]"
          href="/me/exchanges"
        >
          已成交换谷单 →
        </Link>
      </nav>

      <section className="scroll-mt-24 py-14" id="plaza">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">换谷广场</p>
            <h2 className="mt-3 text-[clamp(28px,3.4vw,40px)]">
              看看大家拿出了什么
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-[var(--shu)]"
            href="/matches/new"
          >
            ＋ 发布我的换谷帖
          </Link>
        </div>
        {listings.length ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {listings.map((listing) => (
              <TradeListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="empty-state mt-7">
            <strong>广场上还没有开放帖子</strong>
            把一件重复谷标记为「可以交换」，发布第一张清楚说明边界的换谷帖。
          </div>
        )}
      </section>

      <section
        className="scroll-mt-24 border-t border-[var(--rule)] py-14"
        id="mine"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">我的换谷工作台</p>
            <h2 className="mt-3 text-[clamp(28px,3.4vw,40px)]">
              该处理的，一眼看到
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-[var(--shu)]"
            href="/me/exchanges"
          >
            查看完整记录 →
          </Link>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: '我的发布',
              value: activity.listings.length,
              note: '开放、暂停与已结束',
              tone: 'var(--exchange)',
            },
            {
              label: '协商中',
              value: pendingOffers.length,
              note: '双方正式方案',
              tone: 'var(--violet)',
            },
            {
              label: '等我处理',
              value: waitingForViewer.length,
              note: '接受、反提或拒绝',
              tone: 'var(--shu)',
            },
          ].map((item) => (
            <div className="panel p-5" key={item.label}>
              <p className="text-muted-foreground text-[12px] font-semibold">
                {item.label}
              </p>
              <p
                className="font-heading mt-2 text-[34px]"
                style={{ color: item.tone }}
              >
                {item.value}
              </p>
              <p className="text-muted-foreground mt-1 text-[12px]">
                {item.note}
              </p>
            </div>
          ))}
        </div>
        {pendingOffers.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {pendingOffers.slice(0, 6).map((offer) => {
              const viewerGives =
                offer.proposerId === user.id
                  ? offer.latestRevision.offeredGoods
                  : offer.latestRevision.requestedGoods;
              const viewerGets =
                offer.proposerId === user.id
                  ? offer.latestRevision.requestedGoods
                  : offer.latestRevision.offeredGoods;
              return (
                <Link
                  className="panel-float min-w-0 rounded-[18px] border border-[var(--rule)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
                  href={`/matches/offers/${offer.id}`}
                  key={offer.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={
                        offer.awaitingUserId === user.id
                          ? 'chip border-[var(--shu)] bg-[var(--shu-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--shu)]'
                          : 'chip px-2.5 py-1 text-[11px]'
                      }
                    >
                      {offer.awaitingUserId === user.id
                        ? '等你处理'
                        : '等待对方'}
                    </span>
                    <span className="num">议价 {offer.counterCount}/3</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold">
                    你出「{viewerGives.name}」⇄ 得到「{viewerGets.name}」
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state mt-5">
            <strong>当前没有进行中的协商</strong>
            从广场提交出价，或使用下面的双向匹配快速建立第一份正式方案。
          </div>
        )}
      </section>

      <section
        className="scroll-mt-24 border-t border-[var(--rule)] py-14"
        id="matching"
      >
        <div className="min-w-0">
          <p className="section-kicker">双向合拍</p>
          <h2 className="mt-3 mb-7 text-[clamp(28px,3.4vw,40px)]">
            彼此都想要
          </h2>
          {direct.length > 0 ? (
            <div
              className={`grid gap-5 ${direct.length > 1 ? 'lg:grid-cols-2' : ''}`}
            >
              {direct.map((match) => (
                <DirectMatchCard key={match.otherUserId} match={match} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>还没有双向匹配</strong>
              把更多谷子标记为「愿意交换」，并把想要的谷子加入愿望单，匹配引擎就能为你牵线。
            </div>
          )}
        </div>
      </section>

      <section className="border-border border-t py-14">
        <div className="min-w-0">
          <p className="section-kicker">三方循环</p>
          <h2 className="mt-3 mb-7 text-[clamp(28px,3.4vw,40px)]">
            多走一步，也能换到
          </h2>
          {threeParty.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {threeParty.map((cycle, index) => (
                <ThreePartyCard cycle={cycle} key={index} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>暂无三方循环</strong>
              当出现「你想要 B 的、B 想要 C 的、C
              想要你的」这种环时，会在这里出现三方换谷方案。
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
