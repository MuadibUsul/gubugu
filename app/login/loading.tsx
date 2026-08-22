function Block({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[14px] bg-[var(--muted)] ${className}`}
    />
  );
}

export default function LoginLoading() {
  return (
    <main className="mx-auto w-full max-w-[1060px] px-4 py-8 sm:px-6 md:px-8 md:py-12">
      <section className="grid min-h-[620px] overflow-hidden rounded-[28px] border border-[var(--rule)] bg-[var(--surface)] lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="bg-[var(--shu-soft)] p-8 sm:p-10 lg:p-12">
          <Block className="h-6 w-28" />
          <Block className="mt-6 h-14 w-full max-w-96" />
          <Block className="mt-3 h-14 w-full max-w-80" />
        </div>
        <div className="order-first space-y-5 p-6 sm:p-9 lg:order-none lg:p-10">
          <Block className="h-9 w-32" />
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
        </div>
      </section>
    </main>
  );
}
