function Line({ className }: { className: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded-[12px] ${className}`} />
  );
}

export default function HomeLoading() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-20 sm:px-6 md:px-8 md:pt-8">
      <section className="grid min-h-[510px] gap-10 rounded-[28px] border border-[var(--rule)] bg-[var(--surface)] p-6 sm:p-9 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:p-12">
        <div className="space-y-5">
          <Line className="h-6 w-32" />
          <Line className="h-14 w-full max-w-[34rem]" />
          <Line className="h-14 w-full max-w-[28rem]" />
          <Line className="h-5 w-full max-w-[30rem]" />
          <Line className="h-14 w-full max-w-[38rem]" />
        </div>
        <div className="hidden grid-cols-2 gap-4 lg:grid">
          <Line className="aspect-[4/3] w-full" />
          <Line className="mt-16 aspect-[4/3] w-full" />
        </div>
      </section>

      <section className="py-16">
        <Line className="h-10 w-40" />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Line className="h-[154px] w-full rounded-[20px]" key={index} />
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-[var(--sunken)] p-6 sm:p-9">
        <Line className="h-10 w-40" />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Line className="aspect-[4/3] w-full rounded-[20px]" key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
