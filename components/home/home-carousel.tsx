import Link from 'next/link';

import { RemoteImage } from '@/components/ui/remote-image';

// 首页轮播位：精选内容 + 广告位共用一套版式。纯 CSS 滚动吸附（原生滑动 + 露边引导），
// 无 JS，契合站点渐进增强架构。广告位（isAd）用同一张卡结构，融入纸张观感、不像贴片。

export type HomeSlide = {
  id: string;
  kicker: string;
  title: string;
  desc: string;
  href: string;
  imageUrl: string | null;
  isAd?: boolean;
};

export function HomeCarousel({ slides }: { slides: HomeSlide[] }) {
  if (slides.length === 0) return null;

  return (
    <section aria-label="精选与推荐" className="mt-6 sm:mt-8">
      <div className="home-carousel flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
        {slides.map((slide, index) => (
          <Link
            className="group relative aspect-[16/8] w-[86%] shrink-0 snap-center overflow-hidden rounded-[24px] border border-[var(--rule)] shadow-[var(--shadow-card)] sm:aspect-[16/6.2] sm:w-[92%]"
            href={slide.href}
            id={`home-slide-${slide.id}`}
            key={slide.id}
          >
            {slide.imageUrl ? (
              <RemoteImage
                alt={slide.title}
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                priority={index === 0}
                sizes="(max-width: 1023px) 92vw, 1100px"
                src={slide.imageUrl}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(150deg,color-mix(in oklab,var(--surface) 88%,var(--shu-soft)),color-mix(in oklab,var(--surface) 82%,var(--violet-soft)))',
                }}
              />
            )}
            {/* 底部渐隐让字幕板在任何图上都可读，但用象牙色而非黑色，保持纸张调性。 */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--paper)_88%,transparent),transparent)]" />

            {slide.isAd ? (
              <span className="absolute top-3 right-3 rounded-full border border-[var(--gold,#a8894f)] bg-[var(--paper)] px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-[var(--gold,#a8894f)] uppercase">
                广告位
              </span>
            ) : null}

            <div className="absolute right-4 bottom-4 left-4 sm:right-6 sm:bottom-5 sm:left-6">
              <span className="text-[11px] font-bold tracking-[0.18em] text-[var(--shu)] uppercase">
                {slide.kicker}
              </span>
              <h3 className="mt-1.5 text-[clamp(18px,2.4vw,26px)] leading-tight font-bold text-balance text-[var(--ink)]">
                {slide.title}
              </h3>
              <p className="text-muted-foreground mt-1 line-clamp-1 max-w-[48ch] text-[13px]">
                {slide.desc}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-[var(--shu)]">
                {slide.isAd ? '了解合作' : '去看看'} →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="mt-3 flex justify-center gap-2">
          {slides.map((slide) => (
            <a
              aria-label={`跳到：${slide.title}`}
              className="block size-2 rounded-full bg-[var(--rule-2)] transition-colors hover:bg-[var(--shu)]"
              href={`#home-slide-${slide.id}`}
              key={slide.id}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
