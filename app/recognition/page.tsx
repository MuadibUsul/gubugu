import type { Metadata } from 'next';

import { RecognitionShell } from '@/components/recognition/recognition-shell';

export const metadata: Metadata = {
  title: '相机识别',
  description: '拍摄或上传图片，匹配候选 SKU。',
};

export default function RecognitionPage() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_58%)]" />
      <div className="pointer-events-none absolute top-[-6rem] right-[-12rem] size-[30rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_68%)]" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-[-10rem] size-[24rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[96rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_36%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_48%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_90%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)]" />

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
