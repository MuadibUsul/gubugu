import type { Metadata } from 'next';

import { AdminCrawlerShell } from '@/components/admin/admin-crawler-shell';
import { requireAdminAccess } from '@/server/auth/admin';
import { getAdminCrawlerPageData } from '@/server/data/admin-crawler';

export const metadata: Metadata = {
  title: '采集工作台',
  description: '管理白名单来源、采集草稿和定时扫描运行记录。',
};

export const dynamic = 'force-dynamic';

type AdminCrawlerPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCrawlerPage({
  searchParams,
}: AdminCrawlerPageProps) {
  await requireAdminAccess('/admin/crawler');
  const query = (await searchParams) ?? {};
  const singleValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const data = await getAdminCrawlerPageData({
    view: singleValue(query.view),
  });
  const feedback = {
    'source-saved': { tone: 'success' as const, text: '白名单来源已保存。' },
    'source-toggled': {
      tone: 'success' as const,
      text: '来源启用状态已更新。',
    },
    'scan-started': {
      tone: 'success' as const,
      text: '扫描已在后台启动，全量爬取需数十分钟，可在运行记录 / 待审核队列刷新查看进度。',
    },
    'scan-finished': {
      tone: 'success' as const,
      text: '扫描已完成，结果已写入运行记录。',
    },
    'draft-rejected': {
      tone: 'success' as const,
      text: '采集草稿已拒绝。',
    },
    'draft-published': {
      tone: 'success' as const,
      text: '草稿已审核并发布到谷库。',
    },
    'invalid-source': {
      tone: 'error' as const,
      text: '来源设置不完整，请检查后重试。',
    },
    'invalid-url': {
      tone: 'error' as const,
      text: '来源或图片域名无效，仅支持标准 HTTP(S) 地址。',
    },
    'duplicate-source': {
      tone: 'error' as const,
      text: '这个入口 URL 已在白名单中。',
    },
    'manual-empty': {
      tone: 'error' as const,
      text: '这一页没有可识别的商品结构，该站可能需要专用适配器。',
    },
    'manual-error': {
      tone: 'error' as const,
      text: '抓取失败（可能被站点拦截或超时），请稍后重试或改用手工填写。',
    },
    'manual-invalid': {
      tone: 'error' as const,
      text: '链接无效，仅支持标准 HTTP(S) 地址。',
    },
  }[singleValue(query.notice) ?? singleValue(query.error) ?? ''];

  return <AdminCrawlerShell data={data} feedback={feedback} />;
}
