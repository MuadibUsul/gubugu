function HeroLoadingCard() {
  return (
    <section className="collection-panel px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.72fr)]">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="bg-muted h-3 w-40 animate-pulse rounded-full" />
            <div className="bg-muted/80 h-16 w-full max-w-4xl animate-pulse rounded-[1.5rem]" />
            <div className="bg-muted/65 h-16 w-full max-w-3xl animate-pulse rounded-[1.5rem]" />
            <div className="bg-muted/55 h-5 w-full max-w-2xl animate-pulse rounded-full" />
          </div>

          <div className="border-border/70 bg-background/72 rounded-[1.9rem] border p-3">
            <div className="bg-muted mb-3 h-3 w-60 animate-pulse rounded-full" />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="bg-muted/80 h-15 animate-pulse rounded-[1.4rem]" />
              <div className="bg-muted/70 h-15 w-full animate-pulse rounded-[1.4rem] lg:w-36" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  className="bg-muted/65 h-8 w-20 animate-pulse rounded-full"
                  key={index}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className="border-border/60 bg-card/70 h-36 animate-pulse rounded-[1.5rem] border"
                key={index}
              />
            ))}
          </div>
        </div>

        <div className="border-border/70 bg-card/80 h-[28rem] animate-pulse rounded-[2rem] border" />
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_58%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-[90rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <HeroLoadingCard />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_minmax(320px,0.78fr)]">
          <div className="collection-panel p-6 sm:p-8">
            <div className="space-y-3">
              <div className="bg-muted h-3 w-28 animate-pulse rounded-full" />
              <div className="bg-muted/80 h-10 w-52 animate-pulse rounded-full" />
              <div className="bg-muted/60 h-5 w-full max-w-2xl animate-pulse rounded-full" />
            </div>
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="border-border/70 bg-card/70 h-[18rem] animate-pulse rounded-[1.8rem] border"
                  key={index}
                />
              ))}
            </div>
          </div>

          <div className="collection-panel p-6 sm:p-8">
            <div className="space-y-4">
              <div className="bg-muted h-3 w-36 animate-pulse rounded-full" />
              <div className="bg-muted/80 h-12 w-56 animate-pulse rounded-[1rem]" />
              <div className="bg-muted/70 h-12 w-48 animate-pulse rounded-[1rem]" />
              <div className="bg-muted/55 h-5 w-full animate-pulse rounded-full" />
            </div>
            <div className="mt-8 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="border-border/70 bg-card/70 h-16 animate-pulse rounded-[1.4rem] border"
                  key={index}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
