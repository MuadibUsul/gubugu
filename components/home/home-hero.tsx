import { Button } from '@/components/ui/button';

const quickSearches = [
  '亚克力立牌',
  '徽章',
  '迷你色纸',
  '春日主题',
  '双人图',
] as const;

const archiveLenses = [
  {
    label: 'IP',
    value: '世界观入口',
    note: '先锁定作品，再向角色和系列收束。',
  },
  {
    label: '角色',
    value: '角色维度',
    note: '适合找单推和双人图相关谷子。',
  },
  {
    label: '系列',
    value: '活动批次',
    note: '适合看整套完成度和系列限定。',
  },
  {
    label: 'SKU',
    value: '最小实体',
    note: '状态、评分、评论、交换都落在 SKU。',
  },
] as const;

const liveCapabilities = [
  '热门 IP、精选 SKU 和搜索入口同屏协同',
  '收藏状态、评分、评论和交换都回到 SKU',
  '公开收藏页与识别入口已经可以直接打开',
] as const;

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[2.8rem] px-1">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--surface-line)_86%,transparent),transparent)]" />
      <div className="pointer-events-none absolute top-10 left-[8%] h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_70%)] blur-[110px]" />
      <div className="pointer-events-none absolute right-[8%] bottom-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_72%)] blur-[130px]" />
      <div className="pointer-events-none absolute inset-y-12 left-0 w-px bg-[linear-gradient(180deg,transparent,color-mix(in_oklab,var(--accent)_34%,transparent),transparent)]" />

      <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1.24fr)_minmax(23rem,0.76fr)] xl:items-start">
        <div className="space-y-8 pt-6 md:pt-10">
          <div className="max-w-[70rem] space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold tracking-[0.3em] uppercase">
                幻想科技图鉴
              </span>
              <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold tracking-[0.26em] uppercase">
                搜索优先
              </span>
            </div>

            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.38em] uppercase">
              PC 优先收藏图鉴
            </p>

            <div className="relative max-w-[44rem]">
              <div className="pointer-events-none absolute -left-5 top-4 h-28 w-px bg-[linear-gradient(180deg,transparent,color-mix(in_oklab,var(--accent)_56%,transparent),transparent)]" />
              <h1 className="font-heading text-foreground text-5xl leading-[0.92] sm:text-[4.5rem] lg:text-[5rem] xl:text-[5.35rem]">
                先搜索，再进入属于收藏者的图鉴现场。
              </h1>
            </div>

            <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_78%,var(--background))] sm:text-lg">
              从 IP、角色、系列到 SKU，一次把图鉴、官图、评分、评论和收藏状态串起来。首页第一件事不是看资讯，而是直接收束到你要找的谷子。
            </p>
          </div>

          <form
            action="/search"
            className="relative max-w-3xl overflow-hidden rounded-[2rem] border border-[color:color-mix(in_oklab,var(--accent)_20%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--surface-strong)_88%,transparent)_0%,color-mix(in_oklab,var(--surface-soft)_78%,var(--background))_100%)] p-3 shadow-[0_30px_90px_-52px_color-mix(in_oklab,var(--shadow-tint)_74%,transparent)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_12%,transparent)_0%,transparent_42%,color-mix(in_oklab,var(--primary)_12%,transparent)_100%)]" />
            <label
              className="text-muted-foreground relative mb-3 block px-3 text-[0.72rem] font-semibold tracking-[0.32em] uppercase"
              htmlFor="home-search-query"
            >
              搜索 IP / 角色 / 系列 / SKU
            </label>

            <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                autoComplete="off"
                className="ui-field-lg h-15 px-5 text-base sm:text-lg"
                id="home-search-query"
                name="query"
                placeholder="试试输入角色名、系列名、SKU 编号或标签"
                type="search"
              />
              <Button
                className="h-15 rounded-[1.4rem] px-7 text-base"
                size="lg"
                type="submit"
              >
                搜索图鉴
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 px-1">
              {quickSearches.map((item) => (
                <button
                  className="hud-chip panel-float text-foreground/86 px-3 py-1.5 text-sm"
                  key={item}
                  name="query"
                  type="submit"
                  value={item}
                >
                  {item}
                </button>
              ))}
            </div>
          </form>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {archiveLenses.map((lens) => (
              <article
                className="panel-float relative overflow-hidden rounded-[1.65rem] border border-[color:color-mix(in_oklab,var(--accent)_14%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_72%,transparent),color-mix(in_oklab,var(--surface-soft)_70%,var(--background)))] px-4 py-4 shadow-[0_26px_70px_-48px_color-mix(in_oklab,var(--shadow-tint)_68%,transparent)]"
                key={lens.label}
              >
                <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--surface-line)_72%,transparent),transparent)]" />
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.3em] uppercase">
                  {lens.label}
                </p>
                <h2 className="text-foreground mt-3 text-lg font-semibold">
                  {lens.value}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {lens.note}
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="relative grid gap-4 xl:pt-10">
          <article className="panel-float relative overflow-hidden rounded-[2.2rem] border border-[color:color-mix(in_oklab,var(--accent)_16%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_86%,transparent)_0%,color-mix(in_oklab,var(--surface-soft)_82%,var(--background))_100%)] px-6 py-7 shadow-[0_34px_90px_-50px_color-mix(in_oklab,var(--shadow-tint)_74%,transparent)]">
            <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--surface-line)_82%,transparent),transparent)]" />
            <div className="pointer-events-none absolute top-12 right-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_68%)] blur-2xl" />

            <div className="relative space-y-4">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.34em] uppercase">
                图鉴界面
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none">
                图鉴不是表格，<br />
                而是实体收藏的索引面。
              </h2>
              <p className="text-muted-foreground text-sm leading-7">
                热门 IP、精选 SKU、公开藏页和识别入口都已经接通。首页继续坚持 search-first，不再退回到资讯堆叠页。
              </p>
            </div>
          </article>

          <article className="panel-float relative overflow-hidden rounded-[1.9rem] border border-[color:color-mix(in_oklab,var(--accent)_14%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_76%,transparent),color-mix(in_oklab,var(--surface-soft)_76%,var(--background)))] px-5 py-5 shadow-[0_28px_72px_-48px_color-mix(in_oklab,var(--shadow-tint)_68%,transparent)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.66rem] font-semibold tracking-[0.34em] uppercase">
                  当前可用界面
                </p>
                <h3 className="font-heading text-foreground text-3xl leading-none">
                  结构、图片与状态
                  <br />
                  必须一起到位
                </h3>
              </div>

              <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
                已上线
              </span>
            </div>
          </article>

          <div className="grid gap-3">
            {liveCapabilities.map((item) => (
              <div
                className="hud-card panel-float px-4 py-3 text-sm leading-6 text-[color:color-mix(in_oklab,var(--foreground)_86%,var(--background))]"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
