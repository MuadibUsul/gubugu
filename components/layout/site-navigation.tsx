import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getAdminRoleForUser } from '@/lib/admin-access';
import { getAuthUser } from '@/server/auth/session';

const primaryLinks = [
  { href: '/', label: '首页' },
  { href: '/search', label: '搜索图鉴' },
  { href: '/recognition', label: '拍照识别' },
] as const;

function getAdminEntryLabel(role: 'admin' | 'moderator') {
  return role === 'admin' ? '后台管理' : '审核队列';
}

export async function SiteNavigation() {
  const user = await getAuthUser();
  const adminRole = user ? getAdminRoleForUser(user) : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.9rem] z-40 flex justify-center px-4">
      <nav
        aria-label="Primary"
        className="pointer-events-auto flex w-full max-w-[78rem] flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-[color:color-mix(in_oklab,var(--border)_88%,white_10%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_92%,transparent),color-mix(in_oklab,var(--surface-soft)_94%,var(--background)))] px-4 py-3 shadow-[0_18px_44px_-28px_color-mix(in_oklab,var(--shadow-tint)_36%,transparent)] backdrop-blur-md"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {primaryLinks.map((link) => (
            <Button asChild className="rounded-full" key={link.href} size="sm" variant="ghost">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <Button asChild className="rounded-full" size="sm" variant="secondary">
              <Link href="/me/collection">我的收藏</Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full" size="sm" variant="secondary">
              <Link href="/login?next=%2Fme%2Fcollection">登录后管理收藏</Link>
            </Button>
          )}

          {adminRole ? (
            <Button asChild className="rounded-full" size="sm" variant="outline">
              <Link href="/admin">{getAdminEntryLabel(adminRole)}</Link>
            </Button>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
