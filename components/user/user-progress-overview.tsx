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
              点亮进度
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                收藏点亮概览
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7 sm:text-base">
                进度会基于这个收藏者当前正在追踪的 SKU 计算，因此点亮感知会绑定真实收藏范围，而不是一个空泛的仪表盘数字。
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="border-border/65 bg-card/74 rounded-[1.8rem] border p-5">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                点亮比例
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-heading text-foreground text-6xl leading-none">
                  {data.summary.litProgressPercentage}
                </span>
                <span className="text-muted-foreground pb-2 text-lg font-semibold">
                  %
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                当前已追踪的 {data.summary.trackedGoodsCount} 个 SKU 中，有 {data.summary.ownedCount} 个已经被点亮。
              </p>
            </div>

            <div className="border-border/65 bg-background/74 rounded-[1.8rem] border p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                  收藏计量
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
              当前收藏结构
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
                    <span className="text-muted-foreground text-sm">
                    可交换
                  </span>
                  <span className="text-foreground text-sm font-semibold">
                    {data.summary.exchangeCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-border/65 bg-background/74 rounded-[1.8rem] border border-dashed p-5">
            <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
              可见性
            </p>
            <h3 className="font-heading text-foreground mt-4 text-3xl leading-none">
              收藏展示保持克制
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              当前收藏页已经读取真实收藏数据。公开、仅关注者可见和私密等分享规则可以后续再扩展，而无需改动 SKU 级模型。
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
