function Line({ className }: { className: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded-[12px] ${className}`} />
  );
}

export default function UserLoading() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="rounded-[28px] border border-[var(--rule)] bg-[var(--shu-soft)] p-5 sm:p-8 lg:p-10">
        <div className="space-y-5">
          <Line className="h-6 w-32" />
          <Line className="h-12 w-72" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Line className="h-24 w-full rounded-[18px]" key={index} />
            ))}
          </div>
          <Line className="h-20 w-full rounded-[18px]" />
        </div>
      </section>
      <section className="py-14">
        <Line className="mb-7 h-10 w-52" />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Line className="aspect-[3/4] w-full rounded-[20px]" key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
