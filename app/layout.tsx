import type { Metadata, Viewport } from 'next';

import { BottomTabBar } from '@/components/app-shell/bottom-tab-bar';
import { PwaProvider } from '@/components/app-shell/pwa-provider';
import { siteConfig } from '@/lib/config/site';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    title: '谷布谷',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  keywords: [
    'anime goods',
    'collectibles',
    'goods encyclopedia',
    'gubugu',
    'web collection tracker',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f1e5' },
    { media: '(prefers-color-scheme: dark)', color: '#201c16' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="scroll-smooth" lang="zh-CN">
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <a
          className="fixed top-3 left-3 z-[100] -translate-y-20 rounded-[12px] bg-[var(--shu)] px-4 py-2 text-sm font-bold text-white focus:translate-y-0"
          href="#main-content"
        >
          跳到主要内容
        </a>
        {/* App 为唯一标准：不再有桌面顶部导航；内容居中成手机列，宽屏也显示同一套
            App 界面（底部 Tab + 每屏自带的头部）。 */}
        <div
          className="mx-auto w-full max-w-[560px] pb-[calc(66px+env(safe-area-inset-bottom))]"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </div>
        <BottomTabBar />
        <PwaProvider />
      </body>
    </html>
  );
}
