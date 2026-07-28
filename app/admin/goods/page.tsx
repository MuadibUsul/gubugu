import type { Metadata } from 'next';

import { AdminGoodsManagementShell } from '@/components/admin/admin-goods-management-shell';
import { requireAdminAccess } from '@/server/auth/admin';
import {
  getAdminGoodsManagementPageData,
  parseAdminGoodsManagementSearchParams,
} from '@/server/data/admin-goods';

export const metadata: Metadata = {
  title: '商品库管理',
  description: '用于管理 SKU 记录、基础属性、标签与官方图集的后台商品库页面。',
};

export const dynamic = 'force-dynamic';

type AdminGoodsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminGoodsPage({
  searchParams,
}: AdminGoodsPageProps) {
  await requireAdminAccess('/admin/goods');
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedQuery =
    parseAdminGoodsManagementSearchParams(resolvedSearchParams);
  const data = await getAdminGoodsManagementPageData(parsedQuery);

  return <AdminGoodsManagementShell data={data} />;
}
