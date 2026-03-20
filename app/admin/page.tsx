import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/admin-shell';
import { requireModeratorAccess } from '@/server/auth/admin';
import { getAdminDashboardData } from '@/server/data';

export const metadata: Metadata = {
  title: '管理工作台',
  description:
    '用于图鉴管理、审核处理和轻量运营统计的内部管理工作台。',
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const viewer = await requireModeratorAccess('/admin');
  const data = await getAdminDashboardData();

  return <AdminShell data={data} viewer={viewer} />;
}
