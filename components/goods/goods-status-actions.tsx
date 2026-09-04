'use client';

import Link from 'next/link';
import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { GoodsShareCard } from '@/components/goods/goods-share-card';
import {
  userGoodsStatusMeta,
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
  goodsName: string;
  isAuthenticated: boolean;
  isWatching: boolean;
  updateFeedback?: 'saved' | 'reserved' | 'unlit' | 'active';
};

const CELL =
  'flex flex-col items-center justify-center gap-1 rounded-[10px] border py-2 text-[11px] font-medium transition-colors disabled:opacity-40';
const CELL_OFF = 'border-[var(--rule)] text-[var(--ink-2)]';

const ICONS: Record<'scan' | UserGoodsStatus, ReactNode> = {
  scan: (
    <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
      <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" />
    </svg>
  ),
  owned: (
    <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
      <path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z" />
    </svg>
  ),
  wanted: (
    <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
      <path d="M178,32c-20.65,0-38.73,8.88-50,23.89C116.73,40.88,98.65,32,78,32A62.07,62.07,0,0,0,16,94c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,220.66,240,164,240,94A62.07,62.07,0,0,0,178,32Z" />
    </svg>
  ),
  exchange: (
    <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
      <path d="M213.66,181.66l-32,32a8,8,0,0,1-11.32-11.32L188.69,184H48a8,8,0,0,1,0-16H188.69l-18.35-18.34a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,213.66,181.66Zm-139.32-64a8,8,0,0,0,11.32-11.32L67.31,88H208a8,8,0,0,0,0-16H67.31L85.66,53.66A8,8,0,0,0,74.34,42.34l-32,32a8,8,0,0,0,0,11.32Z" />
    </svg>
  ),
};

const ACTIVE_CLASS: Record<UserGoodsStatus, string> = {
  owned: 'border-[var(--violet)] bg-[var(--violet-soft)] text-[var(--violet)]',
  wanted: 'border-[var(--want)] bg-[var(--want-soft)] text-[var(--want)]',
  exchange:
    'border-[var(--exchange)] bg-[var(--exchange-soft)] text-[var(--exchange)]',
};

const STATUS_LABEL: Record<UserGoodsStatus, string> = {
  owned: '收藏',
  wanted: '想要',
  exchange: '交换',
};

function StatusCell({
  status,
  active,
  disabled = false,
}: {
  status: UserGoodsStatus;
  active: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      aria-pressed={active}
      className={`${CELL} ${active ? ACTIVE_CLASS[status] : CELL_OFF}`}
      disabled={pending || disabled}
      name="status"
      type="submit"
      value={status}
    >
      {ICONS[status]}
      <span>{STATUS_LABEL[status]}</span>
    </button>
  );
}

export function GoodsStatusActions({
  activeStatuses,
  statusDetails,
  goodsId,
  goodsSlug,
  goodsName,
  isAuthenticated,
  isWatching,
  updateFeedback,
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
    <div className="pt-1">
      {/* 一行图标：扫描 / 收藏 / 想要 / 交换 / 分享 */}
      <form action={formAction}>
        <input name="goodsId" type="hidden" value={goodsId} />
        <input name="nextPath" type="hidden" value={nextPath} />
        <div className="grid grid-cols-5 gap-1.5">
          <Link
            aria-label="扫描点亮"
            className={`scan-only ${CELL} border-[var(--shu)] text-[var(--shu)]`}
            href="/recognition"
          >
            {ICONS.scan}
            <span>扫描</span>
          </Link>
          <StatusCell
            active={state.activeStatuses.includes('owned')}
            status="owned"
          />
          <StatusCell
            active={state.activeStatuses.includes('wanted')}
            status="wanted"
          />
          <StatusCell
            active={state.activeStatuses.includes('exchange')}
            disabled={!isLit && !state.activeStatuses.includes('exchange')}
            status="exchange"
          />
          <GoodsShareCard
            goodsName={goodsName}
            goodsSlug={goodsSlug}
            triggerClassName={`${CELL} ${CELL_OFF}`}
          />
        </div>
      </form>

      <p className="mt-3 text-[12.5px]">
        {isLit ? (
          <span className="state state--lit">已通过实物识别点亮</span>
        ) : inCabinet ? (
          <span className="state state--wanted">已入谷柜 · 等待扫描点亮</span>
        ) : (
          <span className="state state--off">还没有收藏进谷柜</span>
        )}
      </p>

      {state.message ? (
        <p
          className={
            state.status === 'error'
              ? 'mt-2 text-[13px] text-[var(--destructive)]'
              : 'text-muted-foreground mt-2 text-[13px]'
          }
        >
          {state.message}
        </p>
      ) : null}

      {state.activeStatuses.includes('exchange') ? (
        <Link
          className="mt-4 flex min-h-11 items-center justify-center rounded-[12px] bg-[var(--exchange)] px-4 text-sm font-semibold text-white"
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
