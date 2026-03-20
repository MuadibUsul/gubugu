import type { ReactNode } from 'react';

type AdminReviewMetric = {
  label: string;
  value: string | number;
};

type AdminReviewPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: AdminReviewMetric[];
  note: string;
  emptyLabel: string;
  hasItems: boolean;
  children: ReactNode;
};

export function AdminReviewPanel({
  eyebrow,
  title,
  description,
  metrics,
  note,
  emptyLabel,
  hasItems,
  children,
}: AdminReviewPanelProps) {
  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
            {eyebrow}
          </p>
          <h2 className="font-heading text-foreground text-3xl leading-none">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm leading-7">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              className="border-border/70 bg-background/78 rounded-[1.25rem] border px-4 py-4"
              key={`${eyebrow}-${metric.label}`}
            >
              <p className="text-muted-foreground text-[0.65rem] tracking-[0.22em] uppercase">
                {metric.label}
              </p>
              <p className="text-foreground mt-2 text-2xl font-semibold">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="border-border/70 bg-card/74 rounded-[1.3rem] border px-4 py-4">
          <p className="text-muted-foreground text-[0.65rem] tracking-[0.22em] uppercase">
            说明
          </p>
          <p className="text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] mt-2 text-sm leading-7">
            {note}
          </p>
        </div>

        {hasItems ? (
          <div className="space-y-3">{children}</div>
        ) : (
          <div className="border-border/70 bg-background/74 rounded-[1.45rem] border border-dashed px-4 py-5 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_70%,var(--background))]">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
}
