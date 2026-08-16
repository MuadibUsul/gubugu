import { cn } from '@/lib/utils';

type HomeSectionStateProps = {
  title: string;
  description: string;
  eyebrow?: string;
  tone?: 'default' | 'warning' | 'error';
  className?: string;
};

export function HomeSectionState({
  title,
  description,
  eyebrow,
  tone = 'default',
  className,
}: HomeSectionStateProps) {
  return (
    <div
      className={cn(
        'collection-panel relative min-h-[18rem] p-6 sm:p-8',
        tone === 'warning' &&
          'border-[color:color-mix(in_oklab,var(--accent)_48%,var(--border))]',
        tone === 'error' &&
          'border-[color:color-mix(in_oklab,var(--destructive)_34%,var(--border))]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_46%)]" />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="font-heading text-foreground text-3xl leading-none sm:text-4xl">
            {title}
          </h3>
          <p className="text-muted-foreground max-w-xl text-sm leading-7 sm:text-base">
            {description}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="hud-card px-4 py-3" key={index}>
              <div className="bg-muted/80 h-2.5 w-20 rounded-full" />
              <div className="bg-muted/55 mt-3 h-7 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
