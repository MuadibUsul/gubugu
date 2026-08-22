'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import type { UserGoodsStatus } from '@/lib/user-goods-status';
import {
  toggleUserGoodsStatusAction,
  type ToggleUserGoodsStatusActionState,
} from '@/server/user-goods/actions';

type SearchCardActionsProps = {
  goodsId: string;
  isAuthenticated: boolean;
  /**
   * 当前真实状态。owned 在这里表示已入柜；是否点亮由 isLit 单独决定。
   */
  activeStatuses: UserGoodsStatus[];
  isLit: boolean;
};

function CabinetButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-pressed={false}
      className="flex min-h-11 w-full items-center justify-center rounded-[12px] border border-[var(--violet)] bg-[var(--surface)] px-2 text-center text-[12px] font-semibold text-[var(--violet)] transition-[transform,background-color] duration-150 ease-[var(--ease)] active:scale-[.97] disabled:opacity-60 motion-reduce:transform-none"
      disabled={pending}
      type="submit"
    >
      {pending ? '正在收进谷柜…' : '♡ 收进谷柜'}
    </button>
  );
}

export function SearchCardActions({
  goodsId,
  isAuthenticated,
  activeStatuses,
  isLit,
}: SearchCardActionsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const [state, formAction] = useActionState(toggleUserGoodsStatusAction, {
    status: 'idle',
    activeStatuses,
  } satisfies ToggleUserGoodsStatusActionState);
  const isInCabinet = state.activeStatuses.includes('owned');

  if (!isAuthenticated) {
    return (
      <Link
        className="relative z-20 flex min-h-11 w-full items-center justify-center rounded-[12px] border border-[var(--rule)] bg-[var(--surface)] px-2 text-center text-[12px] font-semibold text-[var(--shu)]"
        href={`/login?next=${encodeURIComponent(nextPath)}`}
      >
        登录后收进谷柜
      </Link>
    );
  }

  if (isLit) {
    return (
      <span className="flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[var(--kin-soft)] px-2 text-center text-[12px] font-bold text-[var(--ink)]">
        ✓ 已点亮
      </span>
    );
  }

  if (isInCabinet) {
    return (
      <>
        <Link
          className="scan-only relative z-20 flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,var(--shu),var(--violet))] px-2 text-center text-[12px] font-bold text-white transition-transform duration-150 ease-[var(--ease)] active:scale-[.97] motion-reduce:transform-none"
          href="/recognition"
        >
          ◎ 扫描点亮
        </Link>
        {/* 点亮 is phone-only; on desktop web the scan entry is hidden and this
            stand-in explains where to light it instead of a dead action. */}
        <span className="scan-hint min-h-11 w-full items-center justify-center rounded-[12px] border border-[var(--rule)] bg-[var(--surface)] px-2 text-center text-[12px] font-semibold text-[var(--muted-foreground)]">
          已入柜 · 在手机上点亮
        </span>
      </>
    );
  }

  return (
    <form action={formAction} className="relative z-20">
      <input name="goodsId" type="hidden" value={goodsId} />
      <input name="nextPath" type="hidden" value={nextPath} />
      <input name="status" type="hidden" value="owned" />
      <CabinetButton />
      {state.status === 'error' && state.message ? (
        <p
          className="mt-1.5 text-[11px] leading-4 text-[var(--destructive)]"
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
