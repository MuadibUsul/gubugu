import type { Metadata } from 'next';

import { SiteNavigation } from '@/components/layout/site-navigation';
import { siteConfig } from '@/lib/config/site';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'anime goods',
    'collectibles',
    'goods encyclopedia',
    'gubugu',
    'web collection tracker',
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
        <SiteNavigation />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
