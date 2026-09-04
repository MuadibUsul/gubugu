'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BrandSeal } from '@/components/app-shell/mobile-app-header';

/**
 * 宽屏顶部导航（`>= 1024px` 才出现，与底部五 Tab 互斥）。
 *
 * 刻意不放「扫描」：识别是手机专属能力，服务端对桌面 UA 直接 404。在 PC 上摆一个
 * 点进去只会失败的相机入口，比不摆更糟。（计划 5.1 要求 PC 给出移动端引导或二维码，
 * 那属于扫描页自身的桌面态，见 Phase 4，不在导航里做。）
 *
 * 与底部 Tab 共享同一组路由，不存在第二套导航模型。
 */

const LINKS = [
  {
    href: '/search',
    label: '谷库',
    match: (p: string) => p.startsWith('/search'),
  },
  {
    href: '/matches',
    label: '换谷',
    match: (p: string) => p.startsWith('/matches'),
  },
  {
    href: '/leaderboard',
    label: '排行',
    match: (p: string) => p.startsWith('/leaderboard'),
  },
  {
    href: '/me/collection',
    label: '我的谷柜',
    match: (p: string) => p.startsWith('/me'),
  },
] as const;

const searchIcon = (
  <svg width="15" height="15" viewBox="0 0 256 256" fill="var(--ink-3)">
    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
  </svg>
);

export function DesktopNav() {
  const pathname = usePathname() ?? '/';

  return (
    <header className="sticky top-0 z-40 hidden border-b border-[var(--rule)] bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur lg:block">
      <nav
        aria-label="主导航"
        className="mx-auto flex w-full max-w-[1240px] items-center gap-6 px-8 py-3"
      >
        <Link
          className="flex flex-none items-center gap-2.5"
          href="/"
          aria-label="谷布谷图鉴首页"
        >
          <BrandSeal size={28} />
          <span className="font-heading text-[17px] leading-none">
            谷布谷图鉴
          </span>
        </Link>

        <ul className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.match(pathname);

            return (
              <li key={link.href}>
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-[10px] px-3 py-2 text-[14px] transition-colors ${
                    active
                      ? 'bg-[var(--shu-soft)] font-semibold text-[var(--shu-ink)]'
                      : 'text-[var(--ink-2)] hover:bg-[var(--surface)]'
                  }`}
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          aria-label="搜索"
          className="ml-auto flex w-[280px] items-center gap-2 rounded-[10px] border border-[var(--rule)] bg-[var(--surface)] px-3 py-2"
          href="/search"
        >
          {searchIcon}
          <span className="text-[12.5px] text-[var(--ink-3)]">
            搜角色、系列、SKU
          </span>
        </Link>

        <Link
          aria-label="通知"
          className="relative flex-none text-[var(--ink-2)]"
          href="/me/notifications"
        >
          <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
            <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z" />
          </svg>
        </Link>
      </nav>
    </header>
  );
}
