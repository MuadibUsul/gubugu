'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { toggleUserGoodsStatusAction } from '@/server/user-goods/actions';

type SearchCardActionsProps = {
  goodsId: string;
  goodsSlug: string;
  isAuthenticated: boolean;
  compact?: boolean;
};

export function SearchCardActions({
  goodsId,
  goodsSlug,
  isAuthenticated,
  compact = false,
}: SearchCardActionsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const [state, formAction] = useActionState(toggleUserGoodsStatusAction, {
    status: 'idle',
    activeStatuses: [],
  });

  if (!isAuthenticated) {
    return (
      <div className="relative z-20 flex flex-wrap gap-2">
        <Button asChild size={compact ? 'sm' : 'default'} variant="secondary">
          <Link href={`/goods/${goodsSlug}`}>这就是它</Link>
        </Button>
        <Button asChild size={compact ? 'sm' : 'default'} variant="outline">
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
            登录后收藏
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="relative z-20 space-y-2">
      <input name="goodsId" type="hidden" value={goodsId} />
      <input name="nextPath" type="hidden" value={nextPath} />
      <div className="flex flex-wrap gap-2">
        <Button asChild size={compact ? 'sm' : 'default'} variant="secondary">
          <Link href={`/goods/${goodsSlug}`}>这就是它</Link>
        </Button>
        <Button name="status" size={compact ? 'sm' : 'default'} type="submit" value="owned">
          已拥有
        </Button>
        <Button
          name="status"
          size={compact ? 'sm' : 'default'}
          type="submit"
          value="wanted"
          variant="outline"
        >
          想要
        </Button>
      </div>
      {state.message ? (
        <p className="text-muted-foreground text-xs">{state.message}</p>
      ) : null}
    </form>
  );
}
