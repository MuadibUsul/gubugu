'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// 移动端 App 外壳的底部导航（仅移动端显示，桌面保留顶部导航）。tab 是链接，无需水合即可跳转；
// 当前态用 usePathname 高亮（外壳在 layout 里，可正常水合）。中间「扫描」做成抬升的主按钮。

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
  center?: boolean;
};

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const TABS: Tab[] = [
  {
    href: '/',
    label: '首页',
    match: (p) => p === '/',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" {...stroke}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9h14v-9" />
        <path d="M10 19v-5h4v5" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: '谷库',
    match: (p) =>
      p.startsWith('/search') ||
      p.startsWith('/goods') ||
      p.startsWith('/ips') ||
      p.startsWith('/leaderboard'),
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" {...stroke}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
    ),
  },
  {
    href: '/recognition',
    label: '扫描',
    center: true,
    match: (p) => p.startsWith('/recognition'),
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" {...stroke}>
        <path d="M4 9V7a2 2 0 0 1 2-2h2" />
        <path d="M16 5h2a2 2 0 0 1 2 2v2" />
        <path d="M20 15v2a2 2 0 0 1-2 2h-2" />
        <path d="M8 19H6a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    href: '/matches',
    label: '换谷',
    match: (p) => p.startsWith('/matches'),
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" {...stroke}>
        <path d="M4 8h13l-3-3" />
        <path d="M20 16H7l3 3" />
      </svg>
    ),
  },
  {
    href: '/me',
    label: '我',
    match: (p) => p === '/me' || p.startsWith('/me/') || p.startsWith('/users'),
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" {...stroke}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
      </svg>
    ),
  },
];

export function BottomTabBar() {
  const pathname = usePathname() ?? '/';

  return (
    <nav
      aria-label="底部导航"
      className="app-tabbar fixed inset-x-0 bottom-0 z-50 border-t border-[var(--rule)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5 items-end px-2">
        {TABS.map((tab) => {
          const active = tab.match(pathname);

          if (tab.center) {
            return (
              <li key={tab.href} className="flex justify-center">
                <Link
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                  className="-mt-6 flex flex-col items-center gap-1"
                  href={tab.href}
                >
                  <span
                    className="grid size-14 place-items-center rounded-full border-4 border-[var(--paper)] text-[var(--shu-ink)] shadow-[var(--shadow-float)]"
                    style={{ background: 'var(--shu)' }}
                  >
                    {tab.icon}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--shu)]">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 py-2.5"
                href={tab.href}
                style={{ color: active ? 'var(--shu)' : 'var(--ink-2)' }}
              >
                {tab.icon}
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
