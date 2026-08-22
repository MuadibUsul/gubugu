import Link from 'next/link';

import { listHotIps, type HomeHotIp } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

function ContentsRow({ ip, index }: { ip: HomeHotIp; index: number }) {
  const tones = [
    'bg-[var(--shu-soft)] border-[color:color-mix(in_oklab,var(--shu)_18%,var(--rule))]',
    'bg-[var(--violet-soft)] border-[color:color-mix(in_oklab,var(--violet)_18%,var(--rule))]',
    'bg-[var(--sky-soft)] border-[color:color-mix(in_oklab,var(--sky)_18%,var(--rule))]',
  ] as const;

  return (
    <Link
      className={`panel-float group relative min-h-[154px] overflow-hidden rounded-[20px] border p-5 ${tones[index % tones.length]}`}
      href={`/ips/${ip.slug}`}
    >
      <span className="absolute -right-3 -bottom-5 font-mono text-[76px] leading-none font-black text-[var(--ink)]/[0.035]">
        {String(index + 1).padStart(2, '0')}
      </span>

      <span className="relative block min-w-0">
        <span className="num">IP · {String(index + 1).padStart(2, '0')}</span>
        <span className="font-heading mt-3 block text-[20px] leading-tight font-bold transition-colors group-hover:text-[var(--shu)]">
          {ip.name}
        </span>
        {ip.nameLocalized && ip.nameLocalized !== ip.name ? (
          <span className="text-muted-foreground mt-1 block text-[13px]">
            {ip.nameLocalized}
          </span>
        ) : null}
        <span className="text-muted-foreground mt-4 block text-[12px]">
          {ip.goodsCount} 件谷子 · {ip.characterCount} 个角色 · {ip.seriesCount}{' '}
          个系列
        </span>
      </span>
      <span className="absolute top-5 right-5 text-[var(--shu)]">↗</span>
    </Link>
  );
}

export function HomeContentsFallback() {
  return (
    <div className="py-14">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="bg-muted h-[154px] animate-pulse rounded-[20px]"
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
    ips = await listHotIps({ limit: 6 });
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    failed = true;
  }

  return (
    <section className="py-16">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="section-kicker">从喜欢的作品出发</p>
            <h2 className="mt-3 text-[clamp(28px,3.4vw,40px)]">热门作品</h2>
          </div>
          {ips.length > 0 ? (
            <Link
              className="text-muted-foreground text-sm font-semibold hover:text-[var(--shu)]"
              href="/search"
            >
              浏览全部 →
            </Link>
          ) : null}
        </div>

        {failed ? (
          <div className="empty-state mt-6">
            <strong>目次暂时读不出来</strong>
            数据源不可用，稍后刷新再试。
          </div>
        ) : ips.length === 0 ? (
          <div className="empty-state mt-6">
            <strong>还没有收录任何作品</strong>
            第一部作品录入之后，它会出现在这里。
          </div>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ips.map((ip, index) => (
              <ContentsRow index={index} ip={ip} key={ip.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
