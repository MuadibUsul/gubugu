function Line({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <section className="spread border-border border-b pb-12">
        <div>
          <Line className="h-3 w-10" />
        </div>
        <div className="min-w-0 space-y-5">
          <Line className="h-11 w-full max-w-[24rem]" />
          <Line className="h-px w-full max-w-[20rem]" />
          <Line className="h-12 w-full max-w-[560px]" />
        </div>
      </section>
      <section className="spread py-12">
        <div>
          <Line className="h-3 w-10" />
        </div>
        <div className="min-w-0">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Line className="h-5 w-full max-w-[32rem]" key={index} />
            ))}
          </div>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Line className="aspect-[3/4] w-full" key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
