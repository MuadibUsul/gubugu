function SearchLoadingCard() {
  return (
    <div className="collection-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div className="bg-muted h-3 w-28 animate-pulse rounded-full" />
        <div className="bg-muted/80 h-12 w-52 animate-pulse rounded-[1rem]" />
        <div className="bg-muted/60 h-5 w-full max-w-xl animate-pulse rounded-full" />
      </div>
      <div className="mt-6 grid gap-4 2xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="border-border/70 bg-card/72 h-[30rem] animate-pulse rounded-[1.8rem] border"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_58%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-[92rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="space-y-5">
            <div className="bg-muted h-3 w-36 animate-pulse rounded-full" />
            <div className="bg-muted/85 h-16 w-full max-w-4xl animate-pulse rounded-[1.45rem]" />
            <div className="bg-muted/65 h-5 w-full max-w-2xl animate-pulse rounded-full" />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="bg-muted/80 h-15 animate-pulse rounded-[1.45rem]" />
              <div className="bg-muted/70 h-15 w-full animate-pulse rounded-[1.45rem] lg:w-36" />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="border-border/70 bg-card/72 h-24 animate-pulse rounded-[1.45rem] border"
                  key={index}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="collection-panel p-5 sm:p-6">
            <div className="space-y-4">
              <div className="bg-muted h-3 w-24 animate-pulse rounded-full" />
              <div className="bg-muted/80 h-11 w-36 animate-pulse rounded-[1rem]" />
              <div className="bg-muted/60 h-5 w-full animate-pulse rounded-full" />
            </div>
            <div className="mt-6 grid gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  className="border-border/70 bg-card/72 h-14 animate-pulse rounded-[1.2rem] border"
                  key={index}
                />
              ))}
            </div>
          </aside>
          <SearchLoadingCard />
        </section>
      </div>
    </main>
  );
}
