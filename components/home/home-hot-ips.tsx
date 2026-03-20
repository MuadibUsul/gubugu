import Link from 'next/link';

import { HomeSectionState } from '@/components/home/home-section-state';
import { Button } from '@/components/ui/button';
import { listHotIps, type HomeHotIp } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

function getIpCardAccent(index: number) {
  const accents = [
    'from-[color:color-mix(in_oklab,var(--accent)_22%,transparent)] via-[color:color-mix(in_oklab,var(--surface-strong)_92%,var(--card))] to-[color:color-mix(in_oklab,var(--background)_88%,var(--card))]',
    'from-[color:color-mix(in_oklab,var(--primary)_18%,transparent)] via-[color:color-mix(in_oklab,var(--surface-strong)_92%,var(--card))] to-[color:color-mix(in_oklab,var(--background)_90%,var(--card))]',
    'from-[color:color-mix(in_oklab,var(--secondary)_22%,transparent)] via-[color:color-mix(in_oklab,var(--surface-strong)_92%,var(--card))] to-[color:color-mix(in_oklab,var(--background)_90%,var(--card))]',
  ] as const;

  return accents[index % accents.length];
}

function HotIpCard({ ip, index }: { ip: HomeHotIp; index: number }) {
  return (
    <article
      className={`panel-float group relative overflow-hidden rounded-[1.9rem] border border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))] bg-gradient-to-br ${getIpCardAccent(index)} p-5 shadow-[0_30px_78px_-42px_color-mix(in_oklab,var(--shadow-tint)_74%,transparent)]`}
    >
      {ip.coverImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12] transition duration-500 group-hover:scale-[1.03] group-hover:opacity-[0.16]"
          style={{
            backgroundImage: `url(${ip.coverImageUrl})`,
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_36%),linear-gradient(135deg,transparent_0%,color-mix(in_oklab,white_18%,transparent)_46%,transparent_100%)]" />

      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.34em] uppercase">
                热门 IP
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
              精选
            </span>
          </div>

          <p className="max-w-xl text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_76%,var(--background))]">
            这个 IP 下当前已发布 {ip.goodsCount} 件商品、{ip.characterCount}{' '}
            个角色和 {ip.seriesCount} 条系列线。它应该直接成为图鉴浏览入口，而不只是搜索跳板。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="hud-card px-4 py-3">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.28em] uppercase">
              商品
            </p>
            <p className="font-heading text-foreground mt-2 text-3xl leading-none">
              {ip.goodsCount}
            </p>
          </div>

          <div className="hud-card px-4 py-3">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.28em] uppercase">
              角色
            </p>
            <p className="font-heading text-foreground mt-2 text-3xl leading-none">
              {ip.characterCount}
            </p>
          </div>

          <div className="hud-card px-4 py-3">
            <p className="text-muted-foreground text-[0.68rem] tracking-[0.28em] uppercase">
              系列
            </p>
            <p className="font-heading text-foreground mt-2 text-3xl leading-none">
              {ip.seriesCount}
            </p>
          </div>
        </div>

        <Button asChild className="rounded-full" variant="secondary">
          <Link href={`/ips/${ip.slug}`}>打开 IP 页面</Link>
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
        description="当前热门 IP 暂时不可用，请稍后刷新后再试。"
        eyebrow="数据不可用"
        title="热门 IP 卡片加载失败"
        tone="error"
      />
    );
  }

  if (state === 'empty') {
    return (
      <HomeSectionState
        description="当前还没有已发布的 IP 记录。等真实图鉴数据就绪后，这里会展示最适合作为浏览入口的 IP。"
        eyebrow="空状态"
        title="热门 IP 卡片为空"
        tone="warning"
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
            热门 IP
          </p>
          <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
            热门作品入口
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
            首页优先给出最有价值的图鉴浏览入口，而不是平铺最新更新列表。每张卡片现在都能直接打开对应的 IP 页面。
          </p>
        </div>

        <div className="hud-chip text-muted-foreground px-4 py-2 text-sm">
          当前展示 {hotIps.length} 个入口
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
