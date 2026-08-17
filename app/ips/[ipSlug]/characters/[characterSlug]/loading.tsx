/** 骨架屏画的是收集册的形状：表头（缺口 + 收集条 + 系列行）与密排的一览。 */
function Line({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

export default function CharacterLoading() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <section className="spread border-border border-b pb-14">
        <div>
          <Line className="h-3 w-12" />
        </div>
        <div className="min-w-0 space-y-5">
          <Line className="h-4 w-40" />
          <Line className="h-11 w-full max-w-[22rem]" />
          <Line className="h-px w-full max-w-[20rem]" />
          <Line className="h-6 w-56" />

          {/* 收集条 */}
          <div className="slot-strip">
            {Array.from({ length: 13 }).map((_, index) => (
              <Line className="h-[19px] w-[15px]" key={index} />
            ))}
          </div>

          {/* 系列行 */}
          <div className="pt-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="series-row" key={index}>
                <Line className="h-4 w-48" />
                <Line className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="spread py-14">
        <div>
          <Line className="h-3 w-12" />
        </div>
        <div className="min-w-0">
          <div className="mb-10 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Line className="h-5 w-full max-w-[30rem]" key={index} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Line className="aspect-[3/4] w-full" key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
