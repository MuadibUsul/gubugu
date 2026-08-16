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
        <SiteNavigation />
        {children}
      </body>
    </html>
  );
}
