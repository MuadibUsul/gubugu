'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
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

function StatusToggleButton({
  active,
  description,
  label,
  status,
}: {
  active: boolean;
  description: string;
  label: string;
  status: UserGoodsStatus;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-pressed={active}
      className={
        active
          ? 'group flex h-full min-h-[9.75rem] w-full flex-col justify-between rounded-[1.6rem] border border-[color:color-mix(in_oklab,var(--accent)_68%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_14%,white),color-mix(in_oklab,var(--background)_90%,var(--card)))] px-4 py-4 text-left shadow-[0_20px_44px_-30px_color-mix(in_oklab,var(--accent)_44%,transparent)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60'
          : 'group border-border/70 bg-background/78 flex h-full min-h-[9.75rem] w-full flex-col justify-between rounded-[1.6rem] border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[color:color-mix(in_oklab,var(--accent)_48%,var(--border))] disabled:translate-y-0 disabled:opacity-60'
      }
      disabled={pending}
      name="status"
      type="submit"
      value={status}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-base font-semibold leading-tight">
            {label}
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {description}
          </p>
        </div>
        <span
          className={
            active
              ? 'text-foreground inline-flex min-h-9 min-w-[4.75rem] shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_oklab,var(--accent)_72%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_16%,white)] px-3 py-1 text-center text-[0.68rem] font-semibold tracking-[0.22em] whitespace-nowrap uppercase'
              : 'border-border/70 bg-card/76 text-muted-foreground inline-flex min-h-9 min-w-[4.75rem] shrink-0 items-center justify-center rounded-full border px-3 py-1 text-center text-[0.68rem] font-semibold tracking-[0.22em] whitespace-nowrap uppercase'
          }
        >
          {pending ? '保存中' : active ? '已启用' : '未开启'}
        </span>
      </div>
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

  if (!isAuthenticated) {
    return (
      <section className="collection-panel p-5 sm:p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              收藏状态
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              管理这个 SKU 的收藏状态
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              登录后才能把这个 SKU 标记为已拥有、想要或可交换。已拥有状态会直接进入角色补全系统。
            </p>
          </div>

          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
              登录后管理状态
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              收藏状态
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              已拥有、想要、可交换
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              这三个状态可以自由组合开启。其中“已拥有”会点亮角色图鉴中的补全进度。
            </p>
          </div>
          <div className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            {userLabel ?? '已登录收藏者'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {state.activeStatuses.length > 0 ? (
            state.activeStatuses.map((status) => (
              <span
                className="text-foreground rounded-full border border-[color:color-mix(in_oklab,var(--accent)_60%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_16%,white)] px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase"
                key={status}
              >
                {userGoodsStatusMeta[status].label}
              </span>
            ))
          ) : (
            <span className="border-border/70 text-muted-foreground rounded-full border border-dashed px-3 py-1 text-xs tracking-[0.18em] uppercase">
              暂无状态
            </span>
          )}
        </div>

        <form action={formAction} className="space-y-4">
          <input name="goodsId" type="hidden" value={goodsId} />
          <input name="nextPath" type="hidden" value={nextPath} />

          <div className="grid gap-3 sm:grid-cols-3">
            {userGoodsStatusValues.map((status) => (
              <StatusToggleButton
                active={state.activeStatuses.includes(status)}
                description={userGoodsStatusMeta[status].description}
                key={status}
                label={userGoodsStatusMeta[status].label}
                status={status}
              />
            ))}
          </div>

          {state.message ? (
            <p
              className={
                state.status === 'error'
                  ? 'border-destructive/30 bg-destructive/8 text-muted-foreground rounded-[1.25rem] border px-4 py-3 text-sm leading-7'
                  : 'border-border/70 bg-background/78 text-muted-foreground rounded-[1.25rem] border px-4 py-3 text-sm leading-7'
              }
            >
              {state.message}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
