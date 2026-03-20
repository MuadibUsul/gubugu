type SiteShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function SiteShell({
  children,
  eyebrow,
  title,
  description,
}: SiteShellProps) {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_58%)]" />
      <div className="pointer-events-none absolute -top-20 right-[-7rem] size-[24rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)] blur-2xl" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 md:px-8 md:py-14">
        <header className="collection-panel max-w-4xl overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.42em] uppercase">
            {eyebrow}
          </p>
          <h1 className="font-heading text-foreground mt-4 max-w-4xl text-5xl leading-[0.92] text-balance md:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[color:color-mix(in_oklab,var(--foreground)_74%,var(--background))] md:text-lg">
            {description}
          </p>
        </header>

        <div className="mt-10 flex-1">{children}</div>
      </div>
    </main>
  );
}
