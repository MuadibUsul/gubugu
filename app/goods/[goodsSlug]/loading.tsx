function Line({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

export default function GoodsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <section className="spread border-border border-b pb-14">
        <div>
          <Line className="h-3 w-10" />
        </div>
        <div className="min-w-0 space-y-4">
          <Line className="h-4 w-56" />
          <Line className="h-11 w-full max-w-[30rem]" />
          <Line className="h-px w-full max-w-[20rem]" />
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <Line className="aspect-[4/3] w-full" />
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
