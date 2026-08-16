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
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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
                ? 'text-foreground relative text-sm font-medium after:absolute after:inset-x-0 after:-bottom-[21px] after:h-[2px] after:bg-[var(--shu)] after:content-[""]'
                : 'text-muted-foreground hover:text-foreground text-sm'
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
