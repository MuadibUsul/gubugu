import Link from 'next/link';

const entryPoints = [
  {
    eyebrow: '识别入口',
    title: '从实物反查',
    href: '/recognition',
    cta: '打开识别',
  },
  {
    eyebrow: '收藏册',
    title: '查看个人收藏',
    href: '/me/collection',
    cta: '进入收藏',
  },
  {
    eyebrow: '筛选搜索',
    title: '从标签和系列进入',
    href: '/search?tag=spring-bloom',
    cta: '进入搜索',
  },
] as const;

const statusChips = ['识别可用', '状态可写入', '社区已挂接 SKU'] as const;

export function HomeFeatureRail() {
  return (
    <aside className="relative grid gap-4 xl:pt-[3.4rem]">
      <div className="space-y-4 px-1">
        <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
          真实入口
        </p>

        <div className="space-y-4">
          <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
            直接进入，
            <br />
            不绕远路。
          </h2>
        </div>
      </div>

      <div className="grid gap-3">
        {entryPoints.map((item) => (
          <Link
            className="panel-float rounded-[1.7rem] border border-[color:color-mix(in_oklab,var(--border)_86%,white_8%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_92%,transparent),color-mix(in_oklab,var(--surface-soft)_95%,var(--background)))] px-5 py-5"
            href={item.href}
            key={item.href}
          >
            <div className="space-y-3">
              <p className="text-[0.66rem] font-semibold tracking-[0.26em] text-[color:color-mix(in_oklab,var(--foreground)_46%,var(--background))] uppercase">
                {item.eyebrow}
              </p>
              <h3 className="text-foreground text-xl leading-tight font-semibold">
                {item.title}
              </h3>
              <p className="text-sm font-semibold text-[color:color-mix(in_oklab,var(--accent)_72%,var(--foreground))]">
                {item.cta}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-[1.7rem] border border-[color:color-mix(in_oklab,var(--border)_86%,white_8%)] bg-[color:color-mix(in_oklab,var(--card)_84%,var(--background))] p-4">
        <p className="text-[0.68rem] font-semibold tracking-[0.3em] text-[color:color-mix(in_oklab,var(--foreground)_46%,var(--background))] uppercase">
          当前能力
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {statusChips.map((chip) => (
            <span
              className="hud-chip text-muted-foreground px-3 py-1 text-xs"
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
