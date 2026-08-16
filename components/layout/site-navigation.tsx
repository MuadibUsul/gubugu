import Link from 'next/link';

import { SiteNavLinks } from '@/components/layout/site-nav-links';
import { getAdminRoleForUser } from '@/lib/admin-access';
import { signOutAction } from '@/server/auth/actions';
import { getAuthUser } from '@/server/auth/session';

/**
 * One sticky bar. This used to be two stacked floating panels — an account dock
 * over a pill-shaped nav — which cost 80px of every page before any content and
 * was a large part of why the site read as cluttered.
 */
const primaryLinks = [
  { href: '/', label: '图鉴' },
  { href: '/search', label: '搜索' },
  { href: '/recognition', label: '识别' },
  { href: '/me/collection', label: '我的收藏' },
] as const;

function getAdminEntryLabel(role: 'admin' | 'moderator') {
  return role === 'admin' ? '后台' : '审核';
}

export async function SiteNavigation() {
  const user = await getAuthUser();
  const adminRole = user ? getAdminRoleForUser(user) : null;

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-card sticky top-0 z-30 border-b"
    >
      <div className="mx-auto flex h-[62px] max-w-[1180px] items-center gap-7 px-5 md:px-10">
        <Link className="font-heading mr-auto text-xl font-semibold" href="/">
          谷布谷<span className="text-[17px] text-[var(--shu)]">図鑑</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <SiteNavLinks links={primaryLinks} />
        </div>

        {adminRole ? (
          <Link
            className="text-muted-foreground hover:text-foreground hidden text-sm md:inline"
            href="/admin"
          >
            {getAdminEntryLabel(adminRole)}
          </Link>
        ) : null}

        {user ? (
          <form action={signOutAction}>
            <button
              className="border-input text-muted-foreground hover:text-foreground rounded-[var(--radius)] border px-3 py-1.5 text-[13px]"
              type="submit"
            >
              退出
            </button>
          </form>
        ) : (
          <Link
            className="rounded-[var(--radius)] bg-[var(--shu)] px-4 py-1.5 text-[13px] font-medium text-[var(--shu-ink)] hover:text-[var(--shu-ink)]"
            href="/login?next=%2Fme%2Fcollection"
          >
            登录
          </Link>
        )}
      </div>

      <div className="border-border mx-auto flex max-w-[1180px] items-center gap-6 overflow-x-auto border-t px-5 py-2 md:hidden">
        <SiteNavLinks links={primaryLinks} />
      </div>
    </nav>
  );
}
