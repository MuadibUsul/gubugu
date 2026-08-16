export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[94rem] items-center px-5 py-8 md:px-8 xl:px-10">
      <div className="collection-panel w-full overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="border-border/70 bg-background/78 aspect-[4/5] animate-pulse rounded-[var(--radius)] border" />
          <div className="space-y-4">
            <div className="bg-background/78 h-5 w-28 animate-pulse rounded-full" />
            <div className="bg-background/78 h-16 w-full animate-pulse rounded-[var(--radius)]" />
            <div className="bg-background/78 h-28 animate-pulse rounded-[var(--radius)]" />
            <div className="bg-background/78 h-48 animate-pulse rounded-[var(--radius)]" />
          </div>
        </div>
      </div>
    </main>
  );
}
