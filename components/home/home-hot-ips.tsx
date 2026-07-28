import Link from 'next/link';

import { HomeSectionState } from '@/components/home/home-section-state';
import { Button } from '@/components/ui/button';
import { listHotIps, type HomeHotIp } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

function getIpCardAccent(index: number) {
  const accents = [
    'from-[color:color-mix(in_oklab,var(--primary)_14%,transparent)] via-[color:color-mix(in_oklab,var(--surface-strong)_96%,var(--card))] to-[color:color-mix(in_oklab,var(--background)_94%,var(--card))]',
    'from-[color:color-mix(in_oklab,var(--accent)_16%,transparent)] via-[color:color-mix(in_oklab,var(--surface-strong)_96%,var(--card))] to-[color:color-mix(in_oklab,var(--background)_94%,var(--card))]',
    'from-[color:color-mix(in_oklab,var(--secondary)_16%,transparent)] via-[color:color-mix(in_oklab,var(--surface-strong)_96%,var(--card))] to-[color:color-mix(in_oklab,var(--background)_94%,var(--card))]',
  ] as const;

  return accents[index % accents.length];
}

function HotIpCard({ ip, index }: { ip: HomeHotIp; index: number }) {
  return (
    <article
      className={`panel-float group relative overflow-hidden rounded-[2rem] border border-[color:color-mix(in_oklab,var(--border)_86%,white_8%)] bg-gradient-to-br ${getIpCardAccent(index)} p-6 shadow-[0_30px_78px_-42px_color-mix(in_oklab,var(--shadow-tint)_44%,transparent)]`}
    >
      {ip.coverImageUrl ? (
        <div
          className="absolute inset-y-0 right-0 w-[46%] bg-cover bg-center opacity-[0.18] transition duration-500 group-hover:scale-[1.02] group-hover:opacity-[0.24]"
          style={{
            backgroundImage: `linear-gradient(270deg, transparent 0%, color-mix(in oklab, var(--background) 40%, transparent) 58%, color-mix(in oklab, var(--background) 96%, transparent) 100%), url(${ip.coverImageUrl})`,
          }}
        />
      ) : null}

      <div className="relative flex h-full flex-col justify-between gap-10">
        <div className="max-w-[28rem] space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.34em] text-[color:color-mix(in_oklab,var(--foreground)_46%,var(--background))] uppercase">
                热门作品
              </p>
              <h3 className="font-heading text-foreground mt-3 text-4xl leading-none">
                {ip.name}
              </h3>
              {ip.nameLocalized && ip.nameLocalized !== ip.name ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  {ip.nameLocalized}
                </p>
              ) : null}
            </div>

            <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
              作品入口
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="hud-card px-4 py-3">
            <p className="text-[0.68rem] tracking-[0.28em] text-[color:color-mix(in_oklab,var(--foreground)_46%,var(--background))] uppercase">
              商品
            </p>
            <p className="font-heading text-foreground mt-2 text-3xl leading-none">
              {ip.goodsCount}
            </p>
          </div>

          <div className="hud-card px-4 py-3">
            <p className="text-[0.68rem] tracking-[0.28em] text-[color:color-mix(in_oklab,var(--foreground)_46%,var(--background))] uppercase">
              角色
            </p>
            <p className="font-heading text-foreground mt-2 text-3xl leading-none">
              {ip.characterCount}
            </p>
          </div>

          <div className="hud-card px-4 py-3">
            <p className="text-[0.68rem] tracking-[0.28em] text-[color:color-mix(in_oklab,var(--foreground)_46%,var(--background))] uppercase">
              系列
            </p>
            <p className="font-heading text-foreground mt-2 text-3xl leading-none">
              {ip.seriesCount}
            </p>
          </div>
        </div>

        <Button asChild className="w-fit rounded-full" variant="secondary">
          <Link href={`/ips/${ip.slug}`}>进入作品页</Link>
        </Button>
      </div>
    </article>
  );
}

export function HomeHotIpsFallback() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="bg-muted h-3 w-28 animate-pulse rounded-full" />
        <div className="bg-muted/80 h-10 w-48 animate-pulse rounded-full" />
        <div className="bg-muted/65 h-5 w-full max-w-2xl animate-pulse rounded-full" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="hud-card h-[18rem] animate-pulse" key={index} />
        ))}
      </div>
    </section>
  );
}

export async function HomeHotIpsSection() {
  let hotIps: HomeHotIp[] = [];
  let state: 'ready' | 'empty' | 'error' = 'ready';

  try {
    hotIps = await listHotIps({ limit: 3 });
    state = hotIps.length === 0 ? 'empty' : 'ready';
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    state = 'error';
  }

  if (state === 'error') {
    return (
      <HomeSectionState
        description="当前热门作品入口暂时不可用，请稍后刷新后再试。"
        eyebrow="数据不可用"
        title="作品入口加载失败"
        tone="error"
      />
    );
  }

  if (state === 'empty') {
    return (
      <HomeSectionState
        description="暂无作品记录。"
        eyebrow="空状态"
        title="作品入口为空"
        tone="warning"
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
            世界观入口
          </p>
          <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
            从喜欢的作品进入，
            <br />
            再找到属于你的那件周边。
          </h2>
        </div>

        <div className="hud-chip text-muted-foreground px-4 py-2 text-sm">
          当前展示 {hotIps.length} 个作品入口
        </div>
      </div>

      <div
        className={`grid gap-4 ${hotIps.length > 1 ? 'xl:grid-cols-2' : ''}`}
      >
        {hotIps.map((ip, index) => (
          <HotIpCard ip={ip} index={index} key={ip.id} />
        ))}
      </div>
    </section>
  );
}
