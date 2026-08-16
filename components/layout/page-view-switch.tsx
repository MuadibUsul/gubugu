import Link from 'next/link';

import { cn } from '@/lib/utils';

type PageViewSwitchItem = {
  href: string;
  label: string;
  description?: string;
  active?: boolean;
  badge?: string;
};

type PageViewSwitchProps = {
  items: PageViewSwitchItem[];
  className?: string;
};

export function PageViewSwitch({ items, className }: PageViewSwitchProps) {
  return (
    <nav
      aria-label="Page section navigation"
      className={cn(
        'collection-panel flex flex-wrap gap-3 p-3 sm:p-4',
        className,
      )}
    >
      {items.map((item) => (
        <Link
          className={cn(
            'group min-w-0 basis-full rounded-[var(--radius)] border px-4 py-3 transition duration-300 sm:basis-[calc(50%-0.375rem)] lg:flex-1',
            item.active
              ? 'border-[color:color-mix(in_oklab,var(--accent)_52%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_14%,white),color-mix(in_oklab,var(--background)_88%,var(--card)))]'
              : 'border-border/70 bg-background/72 hover:bg-card/82 hover:border-[color:color-mix(in_oklab,var(--primary)_28%,var(--border))]',
          )}
          href={item.href}
          key={item.href}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-semibold">
                {item.label}
              </p>
              {item.description ? (
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {item.description}
                </p>
              ) : null}
            </div>
            {item.badge ? (
              <span className="border-border/70 bg-card/80 text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-semibold">
                {item.badge}
              </span>
            ) : null}
          </div>
        </Link>
      ))}
    </nav>
  );
}
