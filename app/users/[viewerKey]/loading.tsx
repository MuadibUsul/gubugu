function UserSectionSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <section className="collection-panel p-6 sm:p-7">
      <div className="space-y-4">
        <div className="bg-muted h-3 w-32 animate-pulse rounded-full" />
        <div className="bg-muted/85 h-12 w-52 animate-pulse rounded-[1rem]" />
        <div className="bg-muted/60 h-5 w-full max-w-2xl animate-pulse rounded-full" />
      </div>
      <div
        className={`mt-6 grid gap-4 ${tall ? '2xl:grid-cols-2' : 'lg:grid-cols-2'}`}
      >
        {Array.from({ length: tall ? 4 : 2 }).map((_, index) => (
          <div
            className={`border-border/70 bg-card/72 animate-pulse rounded-[1.6rem] border ${
              tall ? 'h-[28rem]' : 'h-36'
            }`}
            key={index}
          />
        ))}
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_56%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
            <div className="space-y-6">
              <div className="bg-muted h-3 w-40 animate-pulse rounded-full" />
              <div className="bg-muted/85 h-16 w-full max-w-4xl animate-pulse rounded-[1.5rem]" />
              <div className="bg-muted/60 h-5 w-full max-w-2xl animate-pulse rounded-full" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="border-border/70 bg-card/72 h-28 animate-pulse rounded-[1.4rem] border"
                    key={index}
                  />
                ))}
              </div>
            </div>
            <div className="border-border/70 bg-card/72 h-[28rem] animate-pulse rounded-[2rem] border" />
          </div>
        </section>
        <UserSectionSkeleton />
        <UserSectionSkeleton tall />
        <UserSectionSkeleton tall />
        <UserSectionSkeleton tall />
        <UserSectionSkeleton tall />
      </div>
    </main>
  );
}
