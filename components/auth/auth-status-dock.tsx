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
    <div className="pointer-events-none fixed top-3 right-3 left-3 z-50 flex justify-center sm:top-4 sm:right-4 sm:left-4">
      <div className="pointer-events-auto flex w-full max-w-[78rem] flex-col gap-3 rounded-[1.45rem] border border-[color:color-mix(in_oklab,var(--accent)_24%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_92%,transparent),color-mix(in_oklab,var(--surface-soft)_88%,var(--background)))] px-3 py-3 shadow-[0_24px_64px_-30px_color-mix(in_oklab,var(--shadow-tint)_78%,transparent),inset_0_1px_0_color-mix(in_oklab,white_10%,transparent)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
        {user ? (
          <>
            <div className="min-w-0">
              <p className="text-muted-foreground eyebrow-label">当前账户</p>
              <p className="text-foreground mt-1 truncate text-sm font-semibold">
                {user.displayLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground eyebrow-label">收藏同步</p>
              <p className="text-foreground mt-1 text-sm leading-6">
                登录后保存你的收藏状态
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/login?next=%2Fme%2Fcollection">登录</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
