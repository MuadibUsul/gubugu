import Link from 'next/link';

import { RemoteImage } from '@/components/ui/remote-image';
import { listHotIps, type HomeHotIp } from '@/server/data';
import { canUseDevelopmentDatabaseFallback } from '@/server/db/client';

// 热门作品：一排作品封面缩略（对齐设计稿）。横向滚动，点开进入作品页。
function ContentsThumb({ ip }: { ip: HomeHotIp }) {
  return (
    <Link className="group w-[84px] flex-none" href={`/ips/${ip.slug}`}>
      <div className="goods-card__art aspect-square rounded-[6px] border border-[var(--rule)]">
        {ip.coverImageUrl ? (
          <RemoteImage
            alt={ip.name}
            className="goods-card__art-image"
            sizes="84px"
            src={ip.coverImageUrl}
          />
        ) : (
          <span className="grid size-full place-items-center text-[20px] text-[var(--ink-3)]">
            {ip.name.slice(0, 1)}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-center text-[11.5px] font-medium transition-colors group-hover:text-[var(--shu)]">
        {ip.name}
      </p>
    </Link>
  );
}

export function HomeContentsFallback() {
  return (
    <div className="py-9 md:py-16">
      <div className="flex gap-[9px] overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="bg-muted size-[84px] animate-pulse rounded-[6px]"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export async function HomeContentsSection() {
  let ips: HomeHotIp[] = [];
  let failed = false;

  try {
    ips = await listHotIps({ limit: 12 });
  } catch (error) {
    if (!canUseDevelopmentDatabaseFallback(error)) throw error;

    failed = true;
  }

  if (failed || ips.length === 0) {
    return null;
  }

  return (
    <section className="py-9 md:py-16" aria-label="热门作品">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="section-kicker hidden md:inline-flex">
              从喜欢的作品出发
            </p>
            <h2 className="text-[clamp(16px,4.6vw,40px)] md:mt-3">热门作品</h2>
          </div>
          <Link
            className="text-muted-foreground shrink-0 text-[11.5px] font-semibold hover:text-[var(--shu)]"
            href="/search"
          >
            浏览全部 →
          </Link>
        </div>

        <div className="mt-3 flex gap-[9px] overflow-x-auto pb-1 [scrollbar-width:none] md:mt-7">
          {ips.map((ip) => (
            <ContentsThumb ip={ip} key={ip.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
