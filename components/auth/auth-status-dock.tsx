import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getAdminRoleForUser } from '@/lib/admin-access';
import { signOutAction } from '@/server/auth/actions';
import { getAuthUser } from '@/server/auth/session';

function getAdminEntryLabel(role: 'admin' | 'moderator') {
  return role === 'admin' ? '内容管理' : '审核队列';
}

export async function AuthStatusDock() {
  const user = await getAuthUser();
  const adminRole = user ? getAdminRoleForUser(user) : null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 left-4 z-50 flex justify-end md:left-auto">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-[1.45rem] border border-[color:color-mix(in_oklab,var(--accent)_24%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_92%,transparent),color-mix(in_oklab,var(--surface-soft)_88%,var(--background)))] px-3 py-3 shadow-[0_24px_64px_-30px_color-mix(in_oklab,var(--shadow-tint)_78%,transparent),inset_0_1px_0_color-mix(in_oklab,white_10%,transparent)] backdrop-blur-2xl">
        {user ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden min-w-[7.5rem] text-right md:block">
              <p className="text-muted-foreground text-[0.62rem] font-semibold tracking-[0.34em] uppercase">
                当前账户
              </p>
              <p className="text-foreground mt-1 text-sm font-semibold">
                {user.displayLabel}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/me/collection">我的收藏</Link>
            </Button>
            {adminRole ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/admin">{getAdminEntryLabel(adminRole)}</Link>
              </Button>
            ) : null}
            <form action={signOutAction}>
              <Button size="sm" type="submit">
                退出登录
              </Button>
            </form>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link href="/login?next=%2Fme%2Fcollection">登录</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
