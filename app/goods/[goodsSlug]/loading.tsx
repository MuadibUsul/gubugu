function Line({ className }: { className: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded-[12px] ${className}`} />
  );
}

export default function GoodsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="rounded-[28px] border border-[var(--rule)] bg-[var(--surface)] p-5 sm:p-8 lg:p-10">
        <div className="min-w-0 space-y-4">
          <Line className="h-4 w-56" />
          <Line className="h-12 w-full max-w-[36rem]" />
          <Line className="h-8 w-48" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:gap-10">
            <Line className="aspect-[4/5] w-full rounded-[20px]" />
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Line className="h-5 w-full" key={index} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
