import type { Metadata } from 'next';

import { AdminCatalogManagementShell } from '@/components/admin/admin-catalog-management-shell';
import { requireAdminAccess } from '@/server/auth/admin';
import {
  getAdminCatalogPageData,
  parseAdminCatalogSearchParams,
} from '@/server/data/admin-catalog';

export const metadata: Metadata = {
  title: '核心图鉴管理',
  description:
    '用于管理 IP、角色和系列图鉴记录的后台页面。',
};

export const dynamic = 'force-dynamic';

type AdminCatalogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCatalogPage({
  searchParams,
}: AdminCatalogPageProps) {
  await requireAdminAccess('/admin/catalog');
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedQuery = parseAdminCatalogSearchParams(resolvedSearchParams);
  const data = await getAdminCatalogPageData(parsedQuery);

  return <AdminCatalogManagementShell data={data} />;
}
