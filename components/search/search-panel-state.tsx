import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SearchPanelStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: 'default' | 'warning' | 'error';
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export function SearchPanelState({
  eyebrow,
  title,
  description,
  tone = 'default',
  actionHref,
  actionLabel,
  className,
}: SearchPanelStateProps) {
  return (
    <div
      className={cn(
        'collection-panel relative min-h-[22rem] overflow-hidden p-6 sm:p-8',
        tone === 'warning' &&
          'border-[color:color-mix(in_oklab,var(--accent)_46%,var(--border))]',
        tone === 'error' &&
          'border-[color:color-mix(in_oklab,var(--destructive)_32%,var(--border))]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_44%)]" />

      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="space-y-4">
          {eyebrow ? (
            <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
              {eyebrow}
            </p>
          ) : null}

          <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
            {title}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
            {description}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="border-border/60 bg-background/76 rounded-[var(--radius)] border px-4 py-3"
              key={index}
            >
              <div className="bg-muted/80 h-2.5 w-24 rounded-full" />
              <div className="bg-muted/55 mt-3 h-7 w-18 rounded-full" />
            </div>
          ))}
        </div>

        {actionHref && actionLabel ? (
          <div>
            <Button asChild variant="secondary">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
