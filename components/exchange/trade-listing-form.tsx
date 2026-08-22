import { Button } from '@/components/ui/button';
import {
  exchangeFulfillmentMethodMeta,
  type ExchangeFulfillmentMethod,
} from '@/lib/exchange/fulfillment';
import {
  exchangeOfferPolicyMeta,
  exchangeOfferPolicyValues,
} from '@/lib/exchange/negotiation';
import type { TradeInventoryItem } from '@/server/data/trade';
import { createTradeListingAction } from '@/server/trade/actions';

function goodsOption(item: TradeInventoryItem) {
  return `${item.goods.name} · ${item.goods.skuCode}`;
}

export function TradeListingForm({
  tradable,
  wanted,
  prefilledGoodsId,
  prefilledWantedGoodsId,
}: {
  tradable: TradeInventoryItem[];
  wanted: TradeInventoryItem[];
  prefilledGoodsId?: string;
  prefilledWantedGoodsId?: string;
}) {
  if (!tradable.length) {
    return (
      <div className="empty-state">
        <strong>先点亮一件现实中的谷子</strong>在 SKU
        详情收藏进谷柜，通过扫描识别点亮后，再标记为「可以交换」并填写可换数量。
      </div>
    );
  }

  return (
    <form action={createTradeListingAction} className="space-y-7">
      <section className="panel space-y-5 p-5 sm:p-6">
        <div>
          <p className="section-kicker">01 · 你拿出什么</p>
          <h2 className="mt-2 text-[24px]">选择可换 SKU</h2>
        </div>
        <label className="block text-sm font-semibold">
          可换谷子
          <select
            className="ui-input mt-2 w-full"
            defaultValue={prefilledGoodsId ?? tradable[0]?.goods.id}
            name="goodsId"
            required
          >
            {tradable.map((item) => (
              <option key={item.goods.id} value={item.goods.id}>
                {goodsOption(item)} · 当前可换 {item.tradableQuantity}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            本帖最多换出数量
            <input
              className="ui-input mt-2 w-full"
              defaultValue={1}
              max={99}
              min={1}
              name="offeredQuantity"
              required
              type="number"
            />
          </label>
          <label className="block text-sm font-semibold">
            品相说明
            <input
              className="ui-input mt-2 w-full"
              maxLength={280}
              name="conditionNote"
              placeholder="例如：未拆封，外袋有轻微折痕"
            />
          </label>
        </div>
      </section>

      <section className="panel space-y-5 p-5 sm:p-6">
        <div>
          <p className="section-kicker">02 · 接受什么出价</p>
          <h2 className="mt-2 text-[24px]">把边界说清楚</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {exchangeOfferPolicyValues.map((policy, index) => (
            <label
              className="cursor-pointer rounded-[18px] border border-[var(--rule)] p-4 has-[:checked]:border-[var(--shu)] has-[:checked]:bg-[var(--shu-soft)]"
              key={policy}
            >
              <span className="flex items-start gap-3">
                <input
                  className="mt-1"
                  defaultChecked={index === 0 && wanted.length > 0}
                  name="offerPolicy"
                  required
                  type="radio"
                  value={policy}
                />
                <span>
                  <strong className="block">
                    {exchangeOfferPolicyMeta[policy].label}
                  </strong>
                  <span className="text-muted-foreground mt-1 block text-[12px] leading-relaxed">
                    {exchangeOfferPolicyMeta[policy].description}
                  </span>
                </span>
              </span>
            </label>
          ))}
        </div>
        {!wanted.length ? (
          <p className="callout text-sm">
            你还没有愿望单；请选择「也看其他谷」，或先把目标 SKU 标记为想要。
          </p>
        ) : (
          <label className="block text-sm font-semibold">
            最优先想换到（可选）
            <select
              className="ui-input mt-2 w-full"
              defaultValue={prefilledWantedGoodsId ?? ''}
              name="wantedGoodsId"
            >
              <option value="">以整个愿望单为准</option>
              {wanted.map((item) => (
                <option key={item.goods.id} value={item.goods.id}>
                  {goodsOption(item)}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="panel space-y-5 p-5 sm:p-6">
        <div>
          <p className="section-kicker">03 · 履约与说明</p>
          <h2 className="mt-2 text-[24px]">让对方知道怎么换</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            ['shipping', 'meetup', 'either'] as ExchangeFulfillmentMethod[]
          ).map((method) => (
            <label
              className="cursor-pointer rounded-[16px] border border-[var(--rule)] p-3 text-sm has-[:checked]:border-[var(--violet)] has-[:checked]:bg-[var(--violet-soft)]"
              key={method}
            >
              <input
                className="mr-2"
                defaultChecked={method === 'either'}
                name="fulfillmentMethod"
                required
                type="radio"
                value={method}
              />
              {exchangeFulfillmentMethodMeta[method].label}
            </label>
          ))}
        </div>
        <label className="block text-sm font-semibold">
          换谷说明
          <textarea
            className="ui-input mt-2 min-h-28 w-full resize-y"
            maxLength={600}
            name="description"
            placeholder="包装情况、希望怎么沟通，以及不接受的情况。不要填写公开联系方式或地址。"
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          城市提示（可选）
          <input
            className="ui-input mt-2 w-full"
            maxLength={128}
            name="locationHint"
            placeholder="例如：杭州，可地铁站面交"
          />
        </label>
      </section>

      <div className="flex flex-col gap-3 rounded-[20px] bg-[var(--sunken)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground max-w-[64ch] text-[12px] leading-relaxed">
          发布后核心
          SKU、数量和接价规则会冻结；有出价时只可暂停或关闭。全程只支持以物换物，不接受现金补差。
        </p>
        <Button className="min-h-11 shrink-0" type="submit">
          发布换谷帖
        </Button>
      </div>
    </form>
  );
}
