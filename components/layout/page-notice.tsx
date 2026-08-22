import Link from 'next/link';

export type PageNoticeAction = {
  href: string;
  label: string;
};

type PageNoticeProps = {
  eyebrow: string;
  railLabel?: string;
  title: string;
  description: string;
  actions?: PageNoticeAction[];
  /** 错误页要给一个重试按钮，它不是链接。 */
  onRetryLabel?: string;
  children?: React.ReactNode;
};

export function PageNotice({
  eyebrow,
  railLabel,
  title,
  description,
  actions = [],
  children,
}: PageNoticeProps) {
  return (
    <main className="mx-auto w-full max-w-[920px] px-4 py-10 sm:px-6 md:px-8 md:py-16">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--rule)] bg-[linear-gradient(135deg,var(--shu-soft),color-mix(in_oklab,var(--violet-soft)_72%,var(--surface)))] p-6 shadow-[var(--shadow-card)] sm:p-10 lg:p-12">
        <span className="absolute -top-20 -right-16 size-56 rounded-full bg-[color-mix(in_oklab,var(--violet)_9%,transparent)] blur-3xl" />
        <div className="relative min-w-0">
          <div className="grid size-14 place-items-center rounded-[18px] bg-[var(--surface)] text-2xl font-extrabold text-[var(--shu)] shadow-[var(--shadow-card)]">
            ✦
          </div>
          <p className="section-kicker mt-6">
            {eyebrow}
            {railLabel ? ` · ${railLabel}` : ''}
          </p>
          <h1 className="mt-4 text-[clamp(30px,4vw,46px)] leading-[1.14] text-balance">
            {title}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[58ch]">
            {description}
          </p>

          {children}

          {actions.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  className="rounded-[14px] border border-[var(--rule)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-card)] hover:border-[var(--shu)]"
                  href={action.href}
                  key={action.href}
                >
                  {action.label} <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
