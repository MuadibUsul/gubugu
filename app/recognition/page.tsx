import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ScanBatch } from '@/components/recognition/scan-batch';
import { z } from 'zod';
import { getOwnedUserScanAssetKey } from '@/server/data/user-scans';
import { requireAuthUser } from '@/server/auth/session';
import { isMobileRequest } from '@/server/device';

export const metadata: Metadata = {
  title: '扫描点亮',
  description: '扫描现实中的谷子，确认 SKU 并点亮谷柜收藏。',
};

export default async function RecognitionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 点亮 scans a physical 谷子 with a phone camera. Desktop web has no entry to
  // this flow, and a direct URL must be blocked too — a 404 keeps it fully
  // hidden rather than revealing a "wrong device" page.
  if (!(await isMobileRequest())) {
    notFound();
  }

  const user = await requireAuthUser('/recognition');
  const query = await searchParams;
  let supplement: { id: string; frontUrl: string } | undefined;
  if (query?.scanId) {
    const id = z.string().uuid().safeParse(query.scanId);
    if (
      !id.success ||
      !(await getOwnedUserScanAssetKey({ scanId: id.data, userId: user.id }))
    )
      notFound();
    supplement = { id: id.data, frontUrl: `/api/user-scans/${id.data}/image` };
  }
  // 页面只负责鉴权，采集、正反面配对和批量核对交由 ScanBatch。
  return (
    <main className="mx-auto w-full max-w-[560px] p-3">
      <ScanBatch supplement={supplement} />
    </main>
  );
}
