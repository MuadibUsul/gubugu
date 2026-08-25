import Link from 'next/link';

import { SiteNavLinks } from '@/components/layout/site-nav-links';
import { getAuthUser } from '@/server/auth/session';
import { isMobileRequest } from '@/server/device';

export async function SiteNavigation() {
  const [user, canScan] = await Promise.all([getAuthUser(), isMobileRequest()]);
  const primaryLinks = [
    { href: '/search', label: '谷库' },
    // 点亮 is phone-only, so the entry only appears on mobile. On desktop the
    // route itself 404s, so listing it here would be a dead link.
    ...(canScan ? [{ href: '/recognition', label: '点亮' }] : []),
    { href: '/matches', label: '换谷' },
    { href: '/leaderboard', label: '排行' },
    user
      ? { href: '/me', label: '我的' }
      : { href: '/login?next=%2Fme', label: '登录' },
  ];

  return (
    <nav
      aria-label="主导航"
      className="border-border/80 bg-card/95 sticky top-0 z-30 border-b"
    >
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-3 px-4 sm:px-6 md:gap-7 md:px-8">
        <Link
          aria-label="谷布谷首页"
          className="group mr-auto flex items-center gap-2.5"
          href="/"
        >
          <span className="relative grid size-9 place-items-center rounded-[12px] bg-[linear-gradient(145deg,var(--shu),var(--violet))] text-base font-extrabold text-white shadow-[0_10px_26px_-13px_var(--shu)] transition-transform duration-200 ease-[var(--ease)] group-active:scale-[.97]">
            谷
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--kin)]" />
          </span>
          <span className="hidden leading-none whitespace-nowrap sm:block">
            <span className="font-heading block text-[18px] font-extrabold tracking-[-0.04em] whitespace-nowrap">
              谷布谷
            </span>
            <span className="text-muted-foreground mt-1 hidden text-[9px] font-bold tracking-[0.14em] sm:block">
              GUBUGU
            </span>
          </span>
        </Link>

        {/* 移动端用底部 Tab 导航，顶部只留品牌，隐藏这组链接避免重复。 */}
        <div className="only-desktop items-center gap-1 sm:gap-2">
          <SiteNavLinks links={primaryLinks} />
        </div>
      </div>
    </nav>
  );
}
