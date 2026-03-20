import Link from 'next/link';

const entryPoints = [
  {
    eyebrow: '相机入口',
    title: '相机式识别',
    description: '拍照或上传后直接得到候选 SKU，确认后落到真实详情页。',
    href: '/recognition',
    cta: '打开识别入口',
  },
  {
    eyebrow: '收藏视角',
    title: '收藏者笔记本',
    description: '公开收藏页已经接入，可直接查看已拥有、想要和可交换三层状态。',
    href: '/users/collector',
    cta: '查看收藏页',
  },
  {
    eyebrow: '搜索路径',
    title: '结构化搜索',
    description: '系列、角色、标签和 SKU 维度都已经连到真实搜索结果。',
    href: '/search?tagSlugs=spring-bloom',
    cta: '进入筛选结果',
  },
] as const;

const statusChips = ['识别已接入', '搜索优先', 'SKU 直连'] as const;

export function HomeFeatureRail() {
  return (
    <aside className="relative grid gap-4 xl:pt-[3.9rem]">
      <div className="space-y-4 px-1">
        <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
          已接通入口
        </p>

        <div className="space-y-4">
          <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
            从首页直达
            <br />
            核心功能入口
          </h2>
          <p className="text-muted-foreground text-sm leading-7 sm:text-base">
            识别入口、公开收藏页和结构化搜索都能从首页直接进入，浏览路径保持统一，不需要绕行到次级页面。
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {entryPoints.map((item) => (
          <Link
            className="hud-card panel-float px-4 py-4"
            href={item.href}
            key={item.href}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.66rem] font-semibold tracking-[0.26em] uppercase">
                  {item.eyebrow}
                </p>
                <h3 className="text-foreground text-base font-semibold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  {item.description}
                </p>
              </div>
              <span className="border-border/60 text-muted-foreground rounded-full border px-3 py-1 text-[0.68rem] tracking-[0.2em] uppercase">
                前往
              </span>
            </div>
            <p className="text-foreground/82 mt-4 text-sm font-medium">
              {item.cta}
            </p>
          </Link>
        ))}
      </div>

      <div className="hud-card p-4">
        <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.3em] uppercase">
          当前站点状态
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
