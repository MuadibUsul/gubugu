function Block({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[14px] bg-[var(--muted)] ${className}`}
    />
  );
}

export default function MeLoading() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="rounded-[26px] border border-[var(--rule)] bg-[var(--shu-soft)] p-6 sm:p-9">
        <div className="flex items-center gap-5">
          <Block className="size-20 shrink-0 rounded-[20px]" />
          <div className="flex-1 space-y-3">
            <Block className="h-5 w-28" />
            <Block className="h-11 w-full max-w-72" />
            <Block className="h-4 w-52" />
          </div>
        </div>
      </section>
      <section className="grid gap-4 py-8 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Block className="h-32 w-full rounded-[20px]" key={index} />
        ))}
      </section>
      <Block className="h-16 w-full rounded-[18px]" />
    </main>
  );
}
