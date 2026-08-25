import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecognitionShell } from '@/components/recognition/recognition-shell';
import { requireAuthUser } from '@/server/auth/session';
import { isMobileRequest } from '@/server/device';

export const metadata: Metadata = {
  title: '扫描点亮',
  description: '扫描现实中的谷子，确认 SKU 并点亮谷柜收藏。',
};

export default async function RecognitionPage() {
  // 点亮 scans a physical 谷子 with a phone camera. Desktop web has no entry to
  // this flow, and a direct URL must be blocked too — a 404 keeps it fully
  // hidden rather than revealing a "wrong device" page.
  if (!(await isMobileRequest())) {
    notFound();
  }

  await requireAuthUser('/recognition');
  // 扫描是相机优先的沉浸界面，页面只作最薄的容器，交互全在 RecognitionShell。
  return (
    <main className="mx-auto w-full max-w-[560px] p-3">
      <RecognitionShell />
    </main>
  );
}
