import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/config/site';

// Web App Manifest：让站点可安装为独立 App（Phase 1 PWA）。Capacitor 阶段套壳复用同一套。
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: siteConfig.name,
    short_name: '谷布谷',
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: siteConfig.locale,
    dir: 'ltr',
    background_color: '#f7f1e5',
    theme_color: '#f7f1e5',
    categories: ['entertainment', 'shopping', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
