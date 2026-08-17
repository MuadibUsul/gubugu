import Link from 'next/link';

import { listHotIps, type HomeHotIp } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

/**
 * 目次 —— 作品列表。
 *
 * 刻意不是卡片网格。图录的目录是带编号的条目行加引导线，一眼能数清有几部、
 * 每部多大；卡片墙做不到这件事，它把每个条目变成等大的色块。
 */
function ContentsRow({ ip, index }: { ip: HomeHotIp; index: number }) {
  return (
    <Link
      className="border-border group hover:border-rule-2 flex items-baseline gap-4 border-b py-5 last:border-b-0"
      href={`/ips/${ip.slug}`}
    >
      <span className="num w-10 shrink-0">
        {String(index + 1).padStart(3, '0')}
      </span>

      <span className="min-w-0">
        <span className="font-heading block text-[22px] leading-tight font-semibold transition-colors group-hover:text-[var(--shu)]">
          {ip.name}
        </span>
        {ip.nameLocalized && ip.nameLocalized !== ip.name ? (
          <span className="text-muted-foreground mt-1 block text-[13px]">
            {ip.nameLocalized}
          </span>
        ) : null}
      </span>

      {/* 引导线，把条目和它的数字连起来 —— 目录的做法 */}
      <span
        aria-hidden="true"
        className="border-border mx-1 hidden min-w-6 flex-1 translate-y-[-4px] border-b border-dotted sm:block"
      />

      <span className="num shrink-0 whitespace-nowrap">
        {ip.goodsCount} 件 · {ip.characterCount} 角色 · {ip.seriesCount} 系列
      </span>
    </Link>
  );
}

export function HomeContentsFallback() {
  return (
    <div className="spread">
      <div>
        <p className="lbl">目次</p>
      </div>
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="border-border border-b py-5" key={index}>
            <div className="bg-muted h-6 w-48 animate-pulse" />
          </div>
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
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    failed = true;
  }

  return (
    <section className="spread border-border border-b py-16">
      <div>
        <p className="lbl">目次</p>
        <div className="rail-jp">作品</div>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-5">
          <h2 className="text-[26px]">收录的作品</h2>
          {ips.length > 0 ? (
            <span className="num">全 {ips.length} 部</span>
          ) : null}
        </div>
        <div className="rule-kin mt-3" />

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
          <div className="mt-4">
            {ips.map((ip, index) => (
              <ContentsRow index={index} ip={ip} key={ip.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
