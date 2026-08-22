'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  userGoodsStatusMeta,
  userGoodsStatusValues,
  type UserGoodsStatus,
} from '@/lib/user-goods-status';
import {
  toggleUserGoodsStatusAction,
  updateUserGoodsDetailsAction,
  type ToggleUserGoodsStatusActionState,
} from '@/server/user-goods/actions';
import type { UserGoodsStateSnapshot } from '@/server/data/user-goods';
import { toggleGoodsWatchAction } from '@/server/social/actions';

type GoodsStatusActionsProps = {
  activeStatuses: UserGoodsStatus[];
  statusDetails: UserGoodsStateSnapshot['statuses'];
  goodsId: string;
  goodsSlug: string;
  isAuthenticated: boolean;
  isWatching: boolean;
  updateFeedback?: 'saved' | 'reserved' | 'unlit' | 'active';
  userLabel: string | null;
};

const actionLabels = {
  owned: '收藏进谷柜',
  wanted: '想要',
  exchange: '可以交换',
} as const satisfies Record<UserGoodsStatus, string>;

function StatusButton({
  active,
  label,
  status,
  unavailable = false,
}: {
  active: boolean;
  label: string;
  status: UserGoodsStatus;
  unavailable?: boolean;
}) {
  const { pending } = useFormStatus();
  const activeClass = {
    owned:
      'border-[var(--violet)] bg-[var(--violet-soft)] text-[var(--violet)]',
    wanted: 'border-[var(--want)] bg-[var(--want-soft)] text-[var(--want)]',
    exchange:
      'border-[var(--exchange)] bg-[var(--exchange-soft)] text-[var(--exchange)]',
  }[status];

  return (
    <button
      aria-pressed={active}
      className={
        active
          ? `rounded-[var(--radius)] border px-4 py-2 text-[14px] font-medium disabled:opacity-60 ${activeClass}`
          : 'border-input text-muted-foreground hover:border-rule-2 hover:text-foreground rounded-[var(--radius)] border px-4 py-2 text-[14px] disabled:opacity-60'
      }
      disabled={pending || (unavailable && !active)}
      name="status"
      type="submit"
      value={status}
    >
      {label}
    </button>
  );
}

export function GoodsStatusActions({
  activeStatuses,
  statusDetails,
  goodsId,
  goodsSlug,
  isAuthenticated,
  isWatching,
  updateFeedback,
  userLabel,
}: GoodsStatusActionsProps) {
  const nextPath = `/goods/${goodsSlug}`;

  const [state, formAction] = useActionState(toggleUserGoodsStatusAction, {
    status: 'idle',
    activeStatuses,
  } satisfies ToggleUserGoodsStatusActionState);

  const inCabinet = state.activeStatuses.includes('owned');
  const isLit = Boolean(
    statusDetails.find((detail) => detail.status === 'owned')?.litAt,
  );

  if (!isAuthenticated) {
    return (
      <div className="border-border border-t pt-6">
        <p className="lbl">收藏状态</p>
        <p className="text-muted-foreground mt-2 text-sm">
          登录后可以把它记进你的收藏。
        </p>
        <Link
          className="mt-4 inline-block rounded-[var(--radius)] bg-[var(--shu)] px-5 py-2.5 text-[14px] font-medium text-[var(--shu-ink)]"
          href={`/login?next=${encodeURIComponent(nextPath)}`}
        >
          登录
        </Link>
      </div>
    );
  }

  return (
    <div className="border-border border-t pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="lbl">收藏状态</p>
        <span className="lbl">{userLabel ?? '已登录'}</span>
      </div>

      <div className="mt-3 flex min-h-[34px] items-center gap-3">
        {isLit ? (
          <>
            <span className="seal seal--inline">亮</span>
            <span className="state state--lit">已通过实物识别点亮</span>
          </>
        ) : inCabinet ? (
          <span className="state state--wanted">已入谷柜 · 等待扫描点亮</span>
        ) : (
          <span className="state state--off">还没有收藏进谷柜</span>
        )}

        {state.activeStatuses
          .filter((status) => status !== 'owned')
          .map((status) => (
            <span className="lbl" key={status}>
              {userGoodsStatusMeta[status].label}
            </span>
          ))}
      </div>

      <form action={formAction} className="mt-5">
        <input name="goodsId" type="hidden" value={goodsId} />
        <input name="nextPath" type="hidden" value={nextPath} />

        <div className="flex flex-wrap gap-2">
          {userGoodsStatusValues.map((status) => (
            <StatusButton
              active={state.activeStatuses.includes(status)}
              key={status}
              label={actionLabels[status]}
              status={status}
              unavailable={status === 'exchange' && !isLit}
            />
          ))}
        </div>

        {state.message ? (
          <p
            className={
              state.status === 'error'
                ? 'mt-4 text-[13px] text-[var(--destructive)]'
                : 'text-muted-foreground mt-4 text-[13px]'
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>

      {!isLit ? (
        <div className="mt-4 rounded-[16px] border border-[var(--violet)]/30 bg-[var(--violet-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--violet)]">
            扫描现实中的谷子，点亮这枚收藏
          </p>
          <p className="text-muted-foreground mt-1 text-[12.5px] leading-relaxed">
            普通收藏只会收入谷柜并保持灰色；识别确认后才计入完成度并开放换谷。
          </p>
          <Link
            aria-label={`扫描实物并点亮 ${goodsSlug}`}
            className="mt-3 inline-flex min-h-11 items-center rounded-[13px] bg-[var(--violet)] px-4 text-sm font-semibold text-white"
            href="/recognition"
          >
            去扫描点亮 →
          </Link>
        </div>
      ) : null}

      {state.activeStatuses.includes('exchange') ? (
        <Link
          className="mt-4 flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--exchange)] px-4 text-sm font-semibold text-white"
          href={`/matches/new?goodsId=${goodsId}`}
        >
          用这件谷子发布换谷帖 →
        </Link>
      ) : null}

      {statusDetails.length > 0 ? (
        <details className="border-border mt-5 border-t pt-5">
          <summary className="text-muted-foreground cursor-pointer text-sm">
            数量与愿望优先级
          </summary>
          <div className="mt-4 space-y-3">
            {updateFeedback ? (
              <p
                className={
                  updateFeedback !== 'saved'
                    ? 'callout text-sm text-[var(--destructive)]'
                    : 'callout text-sm text-[var(--exchange)]'
                }
                role="status"
              >
                {updateFeedback === 'reserved'
                  ? '这件谷子已有成交后的库存预留，数量不能低于履约中的件数。'
                  : updateFeedback === 'unlit'
                    ? '未通过实物识别点亮，不能设置可换数量。'
                    : updateFeedback === 'active'
                      ? '请先移除可换状态，再调整谷柜中的数量。'
                      : '数量与优先级已保存。'}
              </p>
            ) : null}
            {statusDetails.map((detail) => (
              <form
                action={updateUserGoodsDetailsAction}
                className="border-border grid gap-3 rounded-[var(--radius)] border p-3 sm:grid-cols-2"
                key={detail.status}
              >
                <p className="text-sm font-medium">
                  {userGoodsStatusMeta[detail.status].label}
                </p>
                <label className="text-muted-foreground text-[12px]">
                  数量
                  <input
                    className="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
                    defaultValue={detail.quantity}
                    min={1}
                    name="quantity"
                    type="number"
                  />
                </label>
                <label className="text-muted-foreground text-[12px]">
                  可换数量
                  <input
                    className="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm disabled:opacity-50"
                    defaultValue={detail.tradableQuantity}
                    disabled={detail.status !== 'exchange'}
                    min={0}
                    name="tradableQuantity"
                    type="number"
                  />
                </label>
                <label className="text-muted-foreground text-[12px]">
                  愿望优先级
                  <select
                    className="border-input bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
                    defaultValue={detail.wishlistPriority}
                    name="wishlistPriority"
                  >
                    <option value="normal">普通</option>
                    <option value="super_want">超想要</option>
                  </select>
                </label>
                <button
                  className="border-input rounded-[var(--radius)] border px-3 py-2 text-[13px] font-semibold hover:border-[var(--shu)] sm:col-span-2"
                  type="submit"
                >
                  保存
                </button>
                <input name="goodsId" type="hidden" value={goodsId} />
                <input name="status" type="hidden" value={detail.status} />
                <input name="nextPath" type="hidden" value={nextPath} />
                {detail.status !== 'exchange' ? (
                  <input name="tradableQuantity" type="hidden" value="0" />
                ) : null}
              </form>
            ))}
          </div>
        </details>
      ) : null}
      <details className="mt-4 text-sm">
        <summary className="text-muted-foreground cursor-pointer">
          蹲谷提醒
        </summary>
        <form action={toggleGoodsWatchAction} className="mt-2">
          <input name="goodsId" type="hidden" value={goodsId} />
          <input name="nextPath" type="hidden" value={nextPath} />
          <button className="text-[var(--shu)] hover:underline" type="submit">
            {isWatching ? '取消提醒' : '有新的可换供给时通知我'}
          </button>
        </form>
      </details>
    </div>
  );
}
