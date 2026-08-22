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
  return (
    <main>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-10 md:px-10">
        <section className="border-border border-b pb-8">
          <div className="relative">
            <div className="space-y-4">
              <p className="section-kicker">实物识别 · 点亮收藏</p>
              <h1 className="font-heading text-foreground max-w-5xl text-[clamp(32px,4.6vw,54px)] leading-[1.08] text-balance">
                扫描手里的谷子，点亮它。
              </h1>
              <p className="text-muted-foreground max-w-[54ch] text-sm">
                相机扫描并确认真实候选后，谷柜里的灰色缩略图会恢复彩色。上传图片只用于查找
                SKU，不会点亮收藏。
              </p>
            </div>
          </div>
        </section>

        <RecognitionShell />
      </div>
    </main>
  );
}
