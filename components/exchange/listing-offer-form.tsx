import { Button } from '@/components/ui/button';
import { exchangeFulfillmentMethodMeta } from '@/lib/exchange/fulfillment';
import type { TradeInventoryItem, TradeListingView } from '@/server/data/trade';
import { createListingOfferAction } from '@/server/trade/actions';

export function ListingOfferForm({
  listing,
  inventory,
  ownerWantedGoodsIds,
}: {
  listing: TradeListingView;
  inventory: TradeInventoryItem[];
  ownerWantedGoodsIds: Set<string>;
}) {
  const eligible =
    listing.offerPolicy === 'wishlist_only'
      ? inventory.filter((item) => ownerWantedGoodsIds.has(item.goods.id))
      : inventory;
  if (!eligible.length) {
    return (
      <div className="empty-state">
        <strong>暂时没有符合规则的可换 SKU</strong>
        {listing.offerPolicy === 'wishlist_only'
          ? '发布者只收愿望单中的谷子；整理你的可换收藏后再来看看。'
          : '先把一件谷子标记为「可以交换」，才能提交正式出价。'}
      </div>
    );
  }

  const methods =
    listing.fulfillmentMethod === 'either'
      ? (['shipping', 'meetup'] as const)
      : ([listing.fulfillmentMethod] as const);

  return (
    <form action={createListingOfferAction} className="space-y-5">
      <input name="listingId" type="hidden" value={listing.id} />
      <input name="requestedGoodsId" type="hidden" value={listing.goods.id} />
      <div>
        <p className="section-kicker">提交正式方案</p>
        <h2 className="mt-2 text-[24px]">用哪件谷子来换？</h2>
        <p className="text-muted-foreground mt-2 text-[12px]">
          初次出价不计入 3 次议价。私信沟通不会改变这里的正式方案。
        </p>
      </div>
      <label className="block text-sm font-semibold">
        你提供的 SKU
        <select className="ui-input mt-2 w-full" name="offeredGoodsId">
          {eligible.map((item) => (
            <option key={item.goods.id} value={item.goods.id}>
              {item.goods.name} · 可换 {item.tradableQuantity}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          你提供的数量
          <input
            className="ui-input mt-2 w-full"
            defaultValue={1}
            min={1}
            name="offeredQuantity"
            required
            type="number"
          />
        </label>
        <label className="block text-sm font-semibold">
          希望换到的数量
          <input
            className="ui-input mt-2 w-full"
            defaultValue={1}
            max={listing.offeredQuantity}
            min={1}
            name="requestedQuantity"
            required
            type="number"
          />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">最终履约方式</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {methods.map((method) => (
            <label
              className="rounded-[14px] border border-[var(--rule)] p-3 text-sm has-[:checked]:border-[var(--violet)] has-[:checked]:bg-[var(--violet-soft)]"
              key={method}
            >
              <input
                className="mr-2"
                defaultChecked={method === methods[0]}
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
        你的谷子品相
        <input
          className="ui-input mt-2 w-full"
          maxLength={280}
          name="conditionNote"
          placeholder="未拆 / 已拆摆 / 瑕疵位置"
        />
      </label>
      <label className="block text-sm font-semibold">
        方案说明（可选）
        <textarea
          className="ui-input mt-2 min-h-24 w-full resize-y"
          maxLength={600}
          name="message"
          placeholder="只写与方案有关的补充；联系方式请到私信里沟通。"
        />
      </label>
      <Button className="min-h-11 w-full" type="submit">
        提交出价
      </Button>
    </form>
  );
}
