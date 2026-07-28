import type { Metadata } from 'next';

import { ModerationShell } from '@/components/admin/moderation-shell';
import { requireModeratorAccess } from '@/server/auth/admin';
import { getModerationQueueData } from '@/server/data';

export const metadata: Metadata = {
  title: '审核队列',
  description: '处理用户投稿、图片、评论和交换意向的审核队列。',
};

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  await requireModeratorAccess('/admin/moderation');
  const data = await getModerationQueueData();

  return <ModerationShell data={data} />;
}
