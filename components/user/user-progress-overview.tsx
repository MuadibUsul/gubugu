import type { UserProfilePageData } from '@/server/data';

type UserProgressOverviewProps = {
  data: UserProfilePageData;
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[color:color-mix(in_oklab,var(--background)_76%,var(--card))]">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--accent)_78%,white),color-mix(in_oklab,var(--primary)_60%,white))]"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

export function UserProgressOverview({ data }: UserProgressOverviewProps) {
  return (
    <section className="collection-panel p-6 sm:p-7">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              Progress
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              点亮进度
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="border-border/65 bg-card/74 rounded-[1.8rem] border p-5">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                完成度
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-heading text-foreground text-6xl leading-none">
                  {data.summary.litProgressPercentage}
                </span>
                <span className="text-muted-foreground pb-2 text-lg font-semibold">
                  %
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                {data.summary.ownedCount} / {data.summary.trackedGoodsCount}
              </p>
            </div>

            <div className="border-border/65 bg-background/74 rounded-[1.8rem] border p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                  收藏进度
                </p>
                <span className="text-muted-foreground text-sm">
                  {data.summary.ownedCount}/{data.summary.trackedGoodsCount}
                </span>
              </div>
              <div className="mt-4">
                <ProgressBar value={data.summary.litProgressPercentage} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="border-border/60 bg-card/74 rounded-[1.3rem] border px-4 py-3">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    已追踪
                  </p>
                  <p className="font-heading text-foreground mt-2 text-3xl leading-none">
                    {data.summary.trackedGoodsCount}
                  </p>
                </div>
                <div className="border-border/60 bg-card/74 rounded-[1.3rem] border px-4 py-3">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    图片
                  </p>
                  <p className="font-heading text-foreground mt-2 text-3xl leading-none">
                    {data.summary.visiblePhotoCount}
                  </p>
                </div>
                <div className="border-border/60 bg-card/74 rounded-[1.3rem] border px-4 py-3">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    评分
                  </p>
                  <p className="font-heading text-foreground mt-2 text-3xl leading-none">
                    {data.summary.ratingCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="border-border/65 bg-card/74 rounded-[1.8rem] border p-5">
            <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
              当前结构
            </p>
            <div className="mt-4 grid gap-3">
              <div className="border-border/60 bg-background/76 rounded-[1.35rem] border px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">已拥有</span>
                  <span className="text-foreground text-sm font-semibold">
                    {data.summary.ownedCount}
                  </span>
                </div>
              </div>
              <div className="border-border/60 bg-background/76 rounded-[1.35rem] border px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">想要</span>
                  <span className="text-foreground text-sm font-semibold">
                    {data.summary.wantedCount}
                  </span>
                </div>
              </div>
              <div className="border-border/60 bg-background/76 rounded-[1.35rem] border px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">可交换</span>
                  <span className="text-foreground text-sm font-semibold">
                    {data.summary.exchangeCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
