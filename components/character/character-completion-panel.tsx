import type { CharacterEncyclopediaViewData } from '@/server/data';

type CharacterCompletionPanelProps = {
  data: CharacterEncyclopediaViewData;
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[color:color-mix(in_oklab,var(--background)_76%,var(--card))]">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--accent)_78%,white),color-mix(in_oklab,var(--primary)_60%,white))]"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function getPublicationStatusLabel(status: string) {
  switch (status) {
    case 'published':
      return '已发布';
    case 'draft':
      return '草稿';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
}

export function CharacterCompletionPanel({
  data,
}: CharacterCompletionPanelProps) {
  const { character, series, ip } = data.completion;

  return (
    <section className="collection-panel p-6 sm:p-7">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              补全进度
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                角色完成度
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7 sm:text-base">
                已拥有状态会直接点亮角色卡池。当前页面同时给出角色与系列两个层级的补全进度，便于继续追踪收集进展。
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="border-border/65 bg-card/74 rounded-[1.8rem] border p-5">
              <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                角色进度
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-heading text-foreground text-6xl leading-none">
                  {character.progressPercentage}
                </span>
                <span className="text-muted-foreground pb-2 text-lg font-semibold">
                  %
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                已点亮 {character.ownedGoods} / {character.totalGoods} 件，剩余{' '}
                {character.remainingGoods} 件待收录进收藏墙。
              </p>
            </div>

            <div className="border-border/65 bg-background/74 rounded-[1.8rem] border p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                  点亮进度条
                </p>
                <span className="text-muted-foreground text-sm">
                  {character.ownedGoods}/{character.totalGoods}
                </span>
              </div>
              <div className="mt-4">
                <ProgressBar value={character.progressPercentage} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="border-border/60 bg-card/74 rounded-[1.3rem] border px-4 py-3">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    已点亮商品
                  </p>
                  <p className="font-heading text-foreground mt-2 text-3xl leading-none">
                    {character.ownedGoods}
                  </p>
                </div>
                <div className="border-border/60 bg-card/74 rounded-[1.3rem] border px-4 py-3">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    系列
                  </p>
                  <p className="font-heading text-foreground mt-2 text-3xl leading-none">
                    {character.completedSeriesCount}/
                    {character.totalSeriesCount}
                  </p>
                </div>
                <div className="border-border/60 bg-card/74 rounded-[1.3rem] border px-4 py-3">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    剩余
                  </p>
                  <p className="font-heading text-foreground mt-2 text-3xl leading-none">
                    {character.remainingGoods}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {series.map((item) => (
              <div
                className="border-border/65 bg-card/72 rounded-[1.5rem] border p-4"
                key={item.id}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-muted-foreground text-[0.66rem] font-semibold tracking-[0.28em] uppercase">
                      系列完成度
                    </p>
                    <h3 className="text-foreground mt-2 text-lg font-semibold">
                      {item.name}
                    </h3>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {item.ownedGoods} / {item.totalGoods}
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressBar value={item.progressPercentage} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="border-border/65 bg-card/74 rounded-[1.8rem] border p-5">
            <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
              系列维度
            </p>
            <h3 className="font-heading text-foreground mt-4 text-3xl leading-none">
              系列补全一目了然
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              当前已经汇总每个系列的已拥有数量与总量，适合继续沿着系列维度浏览和补件。
            </p>
          </div>

          <div className="border-border/65 bg-background/74 rounded-[1.8rem] border border-dashed p-5">
            <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
              作品视角
            </p>
            <h3 className="font-heading text-foreground mt-4 text-3xl leading-none">
              作品范围概览
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              这里同步展示当前角色所属作品的图鉴范围，方便继续沿着作品与系列两个方向浏览。
            </p>
            <div className="border-border/60 bg-card/70 text-muted-foreground mt-4 rounded-[1.35rem] border px-4 py-3 text-sm">
              图鉴状态: {getPublicationStatusLabel(ip.status)} / 所属作品:{' '}
              {data.ip.name}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
