export const siteConfig = {
  name: '谷布谷图鉴',
  description:
    '一个面向中文用户、以精品谷物浏览、搜索与收藏流程为核心的 Web 优先图鉴站点。',
  locale: 'zh-CN',
} as const;

export type SiteConfig = typeof siteConfig;
