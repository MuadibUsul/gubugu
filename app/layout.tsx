import type { Metadata } from 'next';

import { AuthStatusDock } from '@/components/auth/auth-status-dock';
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
        <div aria-hidden className="site-atmosphere">
          <div className="site-orb site-orb--primary" />
          <div className="site-orb site-orb--accent" />
          <div className="site-orb site-orb--veil" />
          <div className="site-frame" />
        </div>
        <AuthStatusDock />
        <SiteNavigation />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
