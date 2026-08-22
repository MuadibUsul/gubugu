'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = {
  href: string;
  label: string;
};

type SiteNavLinksProps = {
  links: readonly NavLink[];
};

function isActive(pathname: string, href: string) {
  const [path = href] = href.split('?');

  if (path === '/') {
    return pathname === '/';
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function SiteNavLinks({ links }: SiteNavLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const active = isActive(pathname, link.href);

        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-full bg-[var(--shu-soft)] px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap text-[var(--shu)] sm:px-4 sm:text-sm'
                : 'text-muted-foreground hover:text-foreground rounded-full px-2.5 py-2 text-[13px] font-medium whitespace-nowrap hover:bg-[var(--sunken)] sm:px-4 sm:text-sm'
            }
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
