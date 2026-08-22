function Line({ className }: { className: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded-[12px] ${className}`} />
  );
}

export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="rounded-[26px] border border-[var(--rule)] bg-[var(--shu-soft)] p-6 sm:p-9">
        <div className="space-y-4">
          <Line className="h-6 w-28" />
          <Line className="h-12 w-full max-w-[26rem]" />
          <Line className="h-5 w-full max-w-[32rem]" />
          <Line className="h-14 w-full max-w-[680px]" />
        </div>
      </section>
      <section className="grid gap-6 py-9 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Line className="h-[520px] w-full rounded-[20px]" />
        <div>
          <Line className="h-10 w-52" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Line
                className="aspect-[4/3] w-full rounded-[20px]"
                key={index}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
