'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { RecordSlips } from '@/components/collection/record-slips';
import {
  userGoodsStatusMeta,
  userGoodsStatusValues,
  type UserGoodsStatus,
} from '@/lib/user-goods-status';
import {
  toggleUserGoodsStatusAction,
  type ToggleUserGoodsStatusActionState,
} from '@/server/user-goods/actions';

type GoodsStatusActionsProps = {
  activeStatuses: UserGoodsStatus[];
  goodsId: string;
  goodsSlug: string;
  isAuthenticated: boolean;
  userLabel: string | null;
};

/** 「我有这件」比「已拥有」更像一句话，而不是一个字段名。 */
const actionLabels = {
  owned: '我有这件',
  wanted: '想要',
  exchange: '可以交换',
} as const satisfies Record<UserGoodsStatus, string>;

function StatusButton({
  active,
  label,
  status,
}: {
  active: boolean;
  label: string;
  status: UserGoodsStatus;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-pressed={active}
      className={
        active
          ? 'rounded-[var(--radius)] border border-[var(--shu)] bg-[var(--shu)] px-4 py-2 text-[14px] font-medium text-[var(--shu-ink)] disabled:opacity-60'
          : 'border-input text-muted-foreground hover:border-rule-2 hover:text-foreground rounded-[var(--radius)] border px-4 py-2 text-[14px] disabled:opacity-60'
      }
      disabled={pending}
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
  goodsId,
  goodsSlug,
  isAuthenticated,
  userLabel,
}: GoodsStatusActionsProps) {
  const nextPath = `/goods/${goodsSlug}`;

  const [state, formAction] = useActionState(toggleUserGoodsStatusAction, {
    status: 'idle',
    activeStatuses,
  } satisfies ToggleUserGoodsStatusActionState);

  const owned = state.activeStatuses.includes('owned');

  // 盖章只属于「刚进来」那一刻，已经拥有的条目每次渲染都盖一遍会把它降级成
  // 装饰。这个判断由服务端给出：动作完成后会 revalidate 重渲染，客户端那时
  // 比对前后状态两边都已经是已拥有，比不出翻转。
  const justAcquired = state.justAcquired === true;

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
      <RecordSlips unlocked={state.unlocked} />

      <div className="flex items-baseline justify-between gap-4">
        <p className="lbl">收藏状态</p>
        <span className="lbl">{userLabel ?? '已登录'}</span>
      </div>

      {/* 入藏的印记。朱印落在这里，因为这一行说的就是「它已经进来了」。 */}
      <div className="mt-3 flex min-h-[34px] items-center gap-3">
        {owned ? (
          <>
            <span
              className={`seal seal--inline ${justAcquired ? 'seal--stamp' : ''}`}
            >
              藏
            </span>
            <span className="state state--lit">已收录</span>
          </>
        ) : (
          <span className="state state--off">还没有收录</span>
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
    </div>
  );
}
