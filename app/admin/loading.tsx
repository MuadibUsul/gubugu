function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[1.4rem] bg-muted/70 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_11%,transparent),transparent_64%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-[96rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="space-y-5">
              <div className="flex gap-2">
                <LoadingBlock className="h-7 w-28 rounded-full" />
                <LoadingBlock className="h-7 w-28 rounded-full" />
                <LoadingBlock className="h-7 w-28 rounded-full" />
              </div>
              <LoadingBlock className="h-3 w-40" />
              <LoadingBlock className="h-18 w-full max-w-4xl" />
              <LoadingBlock className="h-5 w-full max-w-3xl" />
            </div>
            <div className="grid gap-3">
              <LoadingBlock className="h-40" />
              <LoadingBlock className="h-32" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="collection-panel p-5 sm:p-6" key={index}>
              <div className="space-y-3">
                <LoadingBlock className="h-3 w-28" />
                <LoadingBlock className="h-14 w-24" />
                <LoadingBlock className="h-4 w-full" />
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_320px]">
          <div className="collection-panel p-5 sm:p-6">
            <div className="space-y-5">
              <LoadingBlock className="h-3 w-36" />
              <LoadingBlock className="h-12 w-60" />
              <LoadingBlock className="h-4 w-full max-w-2xl" />
              <div className="grid gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <LoadingBlock className="h-24" key={index} />
                ))}
              </div>
              <LoadingBlock className="h-[26rem] w-full" />
            </div>
          </div>

          <div className="collection-panel p-5 sm:p-6">
            <div className="space-y-4">
              <LoadingBlock className="h-3 w-28" />
              <LoadingBlock className="h-10 w-56" />
              <LoadingBlock className="h-4 w-full" />
              {Array.from({ length: 3 }).map((_, index) => (
                <LoadingBlock className="h-24" key={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="collection-panel p-5 sm:p-6" key={index}>
              <div className="space-y-4">
                <LoadingBlock className="h-3 w-32" />
                <LoadingBlock className="h-10 w-48" />
                <LoadingBlock className="h-4 w-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <LoadingBlock className="h-24" />
                  <LoadingBlock className="h-24" />
                </div>
                <LoadingBlock className="h-24" />
                <LoadingBlock className="h-32" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
