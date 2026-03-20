import type { Metadata } from 'next';

import { RecognitionShell } from '@/components/recognition/recognition-shell';

export const metadata: Metadata = {
  title: '相机式识别',
  description:
    '用于 SKU 确认的相机式拍摄、上传降级与候选匹配入口。',
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

          <div className="relative space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm tracking-[0.22em] uppercase">
                相机入口
              </span>
              <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm tracking-[0.22em] uppercase">
                候选匹配
              </span>
              <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm tracking-[0.22em] uppercase">
                先确认后进入
              </span>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
              <div className="space-y-4">
                <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
                  识别主台
                </p>
                <h1 className="font-heading text-foreground max-w-5xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5.2rem]">
                  像识别台，不像普通上传页
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                  这里是相机式识别入口。用户先完成取景、拍照或上传，再查看候选结果并最终确认到具体 SKU。
                </p>
              </div>

              <aside className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="border-border/70 bg-background/78 rounded-[1.7rem] border px-5 py-5">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    输入
                  </p>
                  <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                    2
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    摄像头或上传图片
                  </p>
                </div>
                <div className="border-border/70 bg-background/78 rounded-[1.7rem] border px-5 py-5">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    结果
                  </p>
                  <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                    Top 5
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    按相似度排序
                  </p>
                </div>
                <div className="border-border/70 bg-background/78 rounded-[1.7rem] border px-5 py-5">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    边界
                  </p>
                  <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                    SKU
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    最终仍由用户确认
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <RecognitionShell />
      </div>
    </main>
  );
}
