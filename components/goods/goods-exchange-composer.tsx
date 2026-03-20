'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  exchangeFulfillmentMethodMeta,
  exchangeFulfillmentMethodValues,
} from '@/lib/exchange-listing';
import type { ExchangeGoodsOption } from '@/server/data';
import { initialCreateExchangeListingActionState } from '@/server/exchange/action-state';
import { createExchangeListingAction } from '@/server/exchange/actions';

type GoodsExchangeComposerProps = {
  goodsId: string;
  goodsName: string;
  goodsSlug: string;
  hasPendingSubmission: boolean;
  isAuthenticated: boolean;
  userLabel: string | null;
  wantedGoodsOptions: ExchangeGoodsOption[];
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? '提交中...' : '提交审核'}
    </button>
  );
}

export function GoodsExchangeComposer({
  goodsId,
  goodsName,
  goodsSlug,
  hasPendingSubmission,
  isAuthenticated,
  userLabel,
  wantedGoodsOptions,
}: GoodsExchangeComposerProps) {
  const [state, formAction] = useActionState(
    createExchangeListingAction,
    initialCreateExchangeListingActionState,
  );
  const nextPath = useMemo(() => `/goods/${goodsSlug}`, [goodsSlug]);
  const [selectedWantedGoodsId, setSelectedWantedGoodsId] = useState(
    wantedGoodsOptions[0]?.id ?? '',
  );
  const selectedWantedGoods =
    wantedGoodsOptions.find((item) => item.id === selectedWantedGoodsId) ??
    wantedGoodsOptions[0] ??
    null;

  if (!isAuthenticated) {
    return (
      <div className="border-border/70 bg-background/76 rounded-[1.75rem] border p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
              发布意向
            </p>
            <h3 className="font-heading text-foreground text-3xl leading-none">
              我有这件，想换另一件
            </h3>
            <p className="text-muted-foreground text-sm leading-7">
              登录后才能发布交换意向。这里仅记录你有什么、想换什么，不处理金钱、担保或仲裁，提交后也可能先进入待审核。
            </p>
          </div>

          <Button asChild>
            <Link
              href={`/login?next=${encodeURIComponent(`${nextPath}#exchange-desk`)}`}
            >
              登录后发布
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (wantedGoodsOptions.length === 0) {
    return (
      <div className="border-border/70 bg-background/76 rounded-[1.75rem] border border-dashed p-5">
        <p className="text-muted-foreground text-sm leading-7">
          暂时还没有其他已发布 SKU 可供选择为目标。先保留这个区域，后续再升级成更完整的选择器。
        </p>
      </div>
    );
  }

  return (
    <div className="border-border/70 bg-background/76 rounded-[1.75rem] border p-5">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
              发布意向
            </p>
            <span className="border-border/70 bg-card/80 text-muted-foreground rounded-full border px-3 py-1 text-xs">
              {userLabel ?? '已登录收藏者'}
            </span>
          </div>
          <h3 className="font-heading text-foreground text-3xl leading-none">
            我有 A，想换 B
          </h3>
          <p className="text-muted-foreground text-sm leading-7">
            当前 SKU 会固定作为你拿出的物品。选择想换的目标 SKU，补充说明后提交一个轻量交换意向即可。
          </p>
        </div>

        {hasPendingSubmission ? (
          <div className="border-border/70 bg-accent/12 text-foreground rounded-[1.3rem] border px-4 py-4 text-sm leading-7">
            你最近一次交换意向已经进入待审核状态。只有人工通过后才会公开展示。
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-border/70 bg-card/74 rounded-[1.45rem] border px-4 py-4">
            <p className="text-muted-foreground text-[0.66rem] tracking-[0.24em] uppercase">
              我有
            </p>
            <p className="text-foreground mt-2 text-sm font-semibold">
              {goodsName}
            </p>
          </div>
          <div className="border-border/70 bg-card/74 rounded-[1.45rem] border px-4 py-4">
            <p className="text-muted-foreground text-[0.66rem] tracking-[0.24em] uppercase">
              想换
            </p>
            <p className="text-foreground mt-2 text-sm font-semibold">
              {selectedWantedGoods?.name ?? '请选择目标 SKU'}
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <input name="goodsId" type="hidden" value={goodsId} />
          <input name="nextPath" type="hidden" value={nextPath} />

          <div className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.68rem] font-semibold tracking-[0.28em] uppercase"
              htmlFor="exchange-wanted-goods"
            >
              目标 SKU
            </label>
            <select
              className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 w-full rounded-[1.35rem] border px-4 py-3 text-sm outline-none focus-visible:ring-2"
              id="exchange-wanted-goods"
              name="wantedGoodsId"
              onChange={(event) => setSelectedWantedGoodsId(event.target.value)}
              required
              value={selectedWantedGoodsId}
            >
              {wantedGoodsOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.skuCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label
              className="text-muted-foreground block text-[0.68rem] font-semibold tracking-[0.28em] uppercase"
              htmlFor="exchange-note"
            >
              交换说明
            </label>
            <textarea
              className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-28 w-full rounded-[1.35rem] border px-4 py-4 text-sm leading-7 outline-none focus-visible:ring-2"
              id="exchange-note"
              maxLength={600}
              name="note"
              placeholder="例如：我这边有一件带套未拆的重复，优先想换双人色纸。这里只记录交换意向，不处理支付。"
              required
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label
                className="text-muted-foreground block text-[0.68rem] font-semibold tracking-[0.28em] uppercase"
                htmlFor="exchange-condition-note"
              >
                品相说明
              </label>
              <textarea
                className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-24 w-full rounded-[1.35rem] border px-4 py-4 text-sm leading-7 outline-none focus-visible:ring-2"
                id="exchange-condition-note"
                maxLength={280}
                name="conditionNote"
                placeholder="例如：已套袋、未拆封、短暂摆放过、边角轻微磨损等。"
              />
            </div>

            <div className="space-y-3">
              <label
                className="text-muted-foreground block text-[0.68rem] font-semibold tracking-[0.28em] uppercase"
                htmlFor="exchange-location-hint"
              >
                地区提示
              </label>
              <input
                className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 w-full rounded-[1.35rem] border px-4 py-3 text-sm outline-none focus-visible:ring-2"
                id="exchange-location-hint"
                maxLength={128}
                name="locationHint"
                placeholder="例如：上海、杭州，或更具体一些的面交区域。"
                type="text"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
            <fieldset className="space-y-3">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                交换方式
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {exchangeFulfillmentMethodValues.map((method) => (
                  <label
                    className="cursor-pointer"
                    htmlFor={`exchange-fulfillment-${method}`}
                    key={method}
                  >
                    <input
                      className="peer sr-only"
                      defaultChecked={method === 'either'}
                      id={`exchange-fulfillment-${method}`}
                      name="fulfillmentMethod"
                      type="radio"
                      value={method}
                    />
                    <span className="border-border/70 bg-card/76 text-muted-foreground peer-checked:border-accent peer-checked:bg-accent/14 peer-checked:text-foreground flex min-h-24 flex-col rounded-[1.25rem] border px-4 py-4 text-left transition">
                      <span className="text-sm font-semibold">
                        {exchangeFulfillmentMethodMeta[method].label}
                      </span>
                      <span className="mt-2 text-xs leading-6">
                        {exchangeFulfillmentMethodMeta[method].description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                附加选项
              </p>
              <div className="grid gap-3">
                <label className="border-border/70 bg-background/74 flex items-start gap-3 rounded-[1.25rem] border px-4 py-4">
                  <input
                    className="border-border mt-1 size-4 rounded"
                    name="allowMulti"
                    type="checkbox"
                    value="1"
                  />
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      接受多换一
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      接受打包交换或多件组合交换。
                    </p>
                  </div>
                </label>
                <label className="border-border/70 bg-background/74 flex items-start gap-3 rounded-[1.25rem] border px-4 py-4">
                  <input
                    className="border-border mt-1 size-4 rounded"
                    name="allowCash"
                    type="checkbox"
                    value="1"
                  />
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      接受补差
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      这里只是表达意愿，即使审核通过也不会在这里生成支付或下单流程。
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>
          </div>

          {state.status === 'error' && state.message ? (
            <div className="border-destructive/30 bg-destructive/8 text-muted-foreground rounded-[1.25rem] border px-4 py-3 text-sm leading-7">
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <SubmitButton />
            <span className="border-border/70 bg-card/76 text-muted-foreground inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm">
              仅待审核意向，不处理金钱
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
