function Line({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

export default function UserLoading() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <section className="spread border-border border-b pb-14">
        <div>
          <Line className="h-3 w-12" />
        </div>
        <div className="min-w-0 space-y-5">
          <Line className="h-4 w-32" />
          <Line className="h-11 w-64" />
          <Line className="h-px w-full max-w-[20rem]" />
          <div className="flex gap-14">
            {Array.from({ length: 4 }).map((_, index) => (
              <Line className="h-12 w-16" key={index} />
            ))}
          </div>
        </div>
      </section>
      <section className="spread py-14">
        <div>
          <Line className="h-3 w-10" />
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Line className="aspect-[3/4] w-full" key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
