'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  userGoodsStatusValues,
  type UserGoodsStatus,
} from '@/lib/user-goods-status';
import {
  toggleUserGoodsStatusAction,
  type ToggleUserGoodsStatusActionState,
} from '@/server/user-goods/actions';

type SearchCardActionsProps = {
  goodsId: string;
  isAuthenticated: boolean;
  /**
   * 当前真实的收藏状态。
   *
   * 这个曾经写死成空数组，是一个会丢数据的缺陷：按钮一律显示未选中，而
   * toggleUserGoodsStatus 按数据库真实状态切换 —— 对一件已拥有的条目点
   * 「我有这件」，服务端会把已存在的那行删掉，收藏就没了。
   */
  activeStatuses: UserGoodsStatus[];
};

const actionLabels = {
  owned: '我有这件',
  wanted: '想要',
  exchange: '可交换',
} as const satisfies Record<UserGoodsStatus, string>;

function ToggleButton({
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
          ? 'rounded-[var(--radius)] border border-[var(--shu)] bg-[var(--shu)] px-2.5 py-1 text-[12.5px] text-[var(--shu-ink)] disabled:opacity-60'
          : 'border-input text-muted-foreground hover:border-rule-2 hover:text-foreground rounded-[var(--radius)] border px-2.5 py-1 text-[12.5px] disabled:opacity-60'
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

export function SearchCardActions({
  goodsId,
  isAuthenticated,
  activeStatuses,
}: SearchCardActionsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const [state, formAction] = useActionState(toggleUserGoodsStatusAction, {
    status: 'idle',
    activeStatuses,
  } satisfies ToggleUserGoodsStatusActionState);

  if (!isAuthenticated) {
    return (
      <Link
        className="relative z-20 text-[12.5px] text-[var(--shu)] underline-offset-4 hover:underline"
        href={`/login?next=${encodeURIComponent(nextPath)}`}
      >
        登录后收藏
      </Link>
    );
  }

  return (
    <form action={formAction} className="relative z-20 flex flex-wrap gap-1.5">
      <input name="goodsId" type="hidden" value={goodsId} />
      <input name="nextPath" type="hidden" value={nextPath} />

      {userGoodsStatusValues.map((status) => (
        <ToggleButton
          active={state.activeStatuses.includes(status)}
          key={status}
          label={actionLabels[status]}
          status={status}
        />
      ))}
    </form>
  );
}
