/**
 * 骨架屏要画的是**这一页的**形状 —— 扉、目次、近收藏。
 * 旧版画的是已经不存在的 hero 卡与统计卡组，那会让首屏先闪一个完全不同的
 * 布局再跳到真实内容。
 */
function Line({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

export default function HomeLoading() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      {/* 扉 */}
      <section className="spread border-border border-b pb-16">
        <div>
          <Line className="h-3 w-10" />
        </div>
        <div className="min-w-0 space-y-5">
          <Line className="h-12 w-full max-w-[34rem]" />
          <Line className="h-12 w-full max-w-[28rem]" />
          <Line className="h-px w-full max-w-[22rem]" />
          <div className="flex gap-10">
            <Line className="h-4 w-24" />
            <Line className="h-4 w-20" />
          </div>
          <Line className="h-12 w-full max-w-[540px]" />
        </div>
      </section>

      {/* 目次 */}
      <section className="spread border-border border-b py-16">
        <div>
          <Line className="h-3 w-10" />
        </div>
        <div className="min-w-0">
          <Line className="h-7 w-40" />
          <div className="mt-6 space-y-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="border-border flex items-baseline gap-4 border-b py-5"
                key={index}
              >
                <Line className="h-3 w-8 shrink-0" />
                <Line className="h-6 w-48" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 近收藏 */}
      <section className="spread py-16">
        <div>
          <Line className="h-3 w-10" />
        </div>
        <div className="min-w-0">
          <Line className="h-7 w-32" />
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Line className="aspect-[3/4] w-full" key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
