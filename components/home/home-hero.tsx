import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { HomePrimarySearch } from './home-primary-search';

const browseLinks = [
  { href: '/search?goodsType=acrylic-stand', label: '立牌' },
  { href: '/search?goodsType=can-badge', label: '徽章' },
  { href: '/search?tag=spring-bloom', label: '春日主题' },
] as const;

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[2.8rem] px-1">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--surface-line)_86%,transparent),transparent)]" />
      <div className="pointer-events-none absolute top-10 left-[8%] h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_70%)] blur-[110px]" />
      <div className="pointer-events-none absolute right-[8%] bottom-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_72%)] blur-[130px]" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.5fr)]">
        <div className="collection-panel px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.38em] uppercase">
                Search First
              </p>
              <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.92] sm:text-[4.5rem] xl:text-[5.2rem]">
                先找到正确的 SKU，
                <br />
                再决定要不要收。
              </h1>
            </div>

            <HomePrimarySearch />

            <div className="flex flex-wrap gap-2">
              {browseLinks.map((item) => (
                <Link className="hud-chip px-3 py-1.5 text-sm" href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <article className="collection-panel flex flex-col justify-between px-6 py-7">
            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.32em] uppercase">
                Secondary
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none">
                不知道名字？
                <br />
                直接识别。
              </h2>
            </div>
            <Button asChild className="mt-6 w-full" variant="secondary">
              <Link href="/recognition">拍照 / 上传识别</Link>
            </Button>
          </article>

          <article className="collection-panel px-6 py-6">
            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.32em] uppercase">
                Explore
              </p>
              <Button asChild className="w-full" variant="ghost">
                <Link href="/search">浏览全部 SKU</Link>
              </Button>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
