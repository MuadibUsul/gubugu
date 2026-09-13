import type { Metadata } from 'next';

import { DesignPreview } from '@/components/design-preview/design-preview';
import { requireAdminAccess } from '@/server/auth/admin';

export const metadata: Metadata = {
  title: 'UI / VI 样板',
  description: '谷布谷第一阶段品牌、谷库、谷柜与藏品详情交互样板。',
};

export const dynamic = 'force-dynamic';

export default async function DesignPreviewPage() {
  await requireAdminAccess('/admin/design-preview');
  return <DesignPreview />;
}
