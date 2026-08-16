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
          ? 'group flex h-full min-h-[10.5rem] w-full flex-col justify-between rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--accent)_72%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_16%,white),color-mix(in_oklab,var(--background)_90%,var(--card)))] px-4 py-4 text-left transition disabled:translate-y-0 disabled:opacity-60'
          : 'group flex h-full min-h-[10.5rem] w-full flex-col justify-between rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_82%,transparent),color-mix(in_oklab,var(--surface-soft)_88%,var(--background)))] px-4 py-4 text-left transition hover:border-[color:color-mix(in_oklab,var(--accent)_48%,var(--border))] disabled:translate-y-0 disabled:opacity-60'
      }
      disabled={pending}
      name="status"
      type="submit"
      value={status}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-lg leading-tight font-semibold">
            {label}
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {description}
          </p>
        </div>
        <span
          className={
            active
              ? 'text-foreground inline-flex min-h-9 min-w-[5rem] shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_oklab,var(--accent)_74%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_16%,white)] px-3 py-1 text-center text-[0.68rem] font-semibold whitespace-nowrap uppercase'
              : 'border-border/70 bg-card/76 text-muted-foreground inline-flex min-h-9 min-w-[5rem] shrink-0 items-center justify-center rounded-full border px-3 py-1 text-center text-[0.68rem] font-semibold whitespace-nowrap uppercase'
          }
        >
          {pending ? '保存中' : active ? '已选中' : '未选中'}
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
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              收藏状态
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              登录后管理
            </h2>
          </div>

          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
              登录
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              收藏状态
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              标记这件 SKU
            </h2>
          </div>
          <div className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            {userLabel ?? '已登录'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {state.activeStatuses.length > 0 ? (
            state.activeStatuses.map((status) => (
              <span
                className="text-foreground rounded-full border border-[color:color-mix(in_oklab,var(--accent)_60%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_16%,white)] px-3 py-1 text-xs font-semibold uppercase"
                key={status}
              >
                {userGoodsStatusMeta[status].label}
              </span>
            ))
          ) : (
            <span className="border-border/70 text-muted-foreground rounded-full border border-dashed px-3 py-1 text-xs uppercase">
              尚未标记
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
                  ? 'border-destructive/30 bg-destructive/8 text-muted-foreground rounded-[var(--radius)] border px-4 py-3 text-sm leading-7'
                  : 'border-border/70 bg-background/78 text-muted-foreground rounded-[var(--radius)] border px-4 py-3 text-sm leading-7'
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
