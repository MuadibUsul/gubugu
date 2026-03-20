import { Suspense } from 'react';

import { HomeFeatureRail } from '@/components/home/home-feature-rail';
import { HomeHero } from '@/components/home/home-hero';
import {
  HomeShelfHighlightsFallback,
  HomeShelfHighlightsSection,
} from '@/components/home/home-shelf-highlights';
import {
  HomeHotIpsFallback,
  HomeHotIpsSection,
} from '@/components/home/home-hot-ips';

export default function Home() {
  return (
    <main className="relative isolate overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[52rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_52%)]" />
      <div className="pointer-events-none absolute top-[-8rem] right-[-14rem] size-[34rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_68%)] blur-2xl" />
      <div className="pointer-events-none absolute top-[18rem] left-[-10rem] size-[26rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--secondary)_20%,transparent),transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8rem] left-[16%] h-40 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_72%)] blur-[110px]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--surface-line)_88%,transparent),transparent)] md:inset-x-12 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[112rem] flex-col gap-12 px-6 py-[5rem] md:px-10 md:py-20 xl:px-14 xl:py-24">
        <HomeHero />

        <section className="grid gap-x-8 gap-y-10 xl:grid-cols-[minmax(0,1.52fr)_minmax(22rem,0.78fr)] xl:items-start">
          <Suspense fallback={<HomeHotIpsFallback />}>
            <HomeHotIpsSection />
          </Suspense>
          <HomeFeatureRail />
        </section>

        <Suspense fallback={<HomeShelfHighlightsFallback />}>
          <HomeShelfHighlightsSection />
        </Suspense>
      </div>
    </main>
  );
}
