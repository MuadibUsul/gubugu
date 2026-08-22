function Block({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[14px] bg-[var(--muted)] ${className}`}
    />
  );
}

export default function MatchesLoading() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="rounded-[28px] border border-[var(--rule)] bg-[var(--shu-soft)] p-6 sm:p-9">
        <Block className="h-6 w-36" />
        <Block className="mt-5 h-12 w-full max-w-96" />
        <Block className="mt-4 h-5 w-full max-w-[36rem]" />
        <div className="mt-6 flex gap-3">
          <Block className="h-10 w-32 rounded-full" />
          <Block className="h-10 w-32 rounded-full" />
        </div>
      </section>
      <section className="py-14">
        <Block className="mb-7 h-11 w-56" />
        <Block className="h-[420px] w-full rounded-[20px]" />
      </section>
    </main>
  );
}
