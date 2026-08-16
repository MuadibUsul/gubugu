import type { Metadata } from 'next';

import { RecognitionShell } from '@/components/recognition/recognition-shell';

export const metadata: Metadata = {
  title: '相机识别',
  description: '拍摄或上传图片，匹配候选 SKU。',
};

export default function RecognitionPage() {
  return (
    <main>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-5 py-14 md:px-10">
        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="relative space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm uppercase">
                相机入口
              </span>
              <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm uppercase">
                候选匹配
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                识别
              </p>
              <h1 className="font-heading text-foreground max-w-5xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5.2rem]">
                拍一张，找到它。
              </h1>
            </div>
          </div>
        </section>

        <RecognitionShell />
      </div>
    </main>
  );
}
