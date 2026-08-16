import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { RemoteImage } from '@/components/ui/remote-image';
import type { CharacterEncyclopediaViewData } from '@/server/data';

import type { CharacterPageControls } from './character-query';

type CharacterHeroProps = {
  data: CharacterEncyclopediaViewData;
  controls: CharacterPageControls;
  viewerLabel: string;
};

export function CharacterHero({
  data,
  controls,
  viewerLabel,
}: CharacterHeroProps) {
  const featuredGoods = data.goods.slice(0, 3);

  return (
    <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_48%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_88%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-5 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] sm:inset-x-8 lg:inset-x-10" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-7">
          <div className="space-y-4">
            <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
              角色图鉴
            </p>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-sm">
                  {data.ip.name}
                </span>
                <span className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-sm">
                  {viewerLabel}
                </span>
              </div>
              <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5.2rem]">
                {data.character.name}
              </h1>
              <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                {data.character.description ||
                  '角色图鉴页会把谷子卡片、完成度、系列批次和点亮状态压缩到同一视野中，兼顾沉浸感与高密度浏览。'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                商品
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.summary.goodsCount}
              </p>
            </div>
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                已点亮
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.completion.character.ownedGoods}
              </p>
            </div>
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                系列
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.summary.seriesCount}
              </p>
            </div>
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                进度
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.completion.character.progressPercentage}%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={`/search?characterSlug=${data.character.slug}`}>
                在搜索页继续筛选
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/search?ipSlug=${controls.ipSlug}&characterSlug=${controls.characterSlug}`}
              >
                收束到角色相关 SKU
              </Link>
            </Button>
          </div>
        </div>

        <aside className="border-border/70 relative overflow-hidden rounded-[var(--radius)] border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_74%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)] p-5">
          <div className="pointer-events-none absolute top-8 -right-14 size-40 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_70%)]" />
          <div className="pointer-events-none absolute bottom-6 -left-12 size-36 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_72%)]" />

          <div className="relative flex h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  沉浸式档案
                </p>
                <h2 className="font-heading text-foreground text-4xl leading-none">
                  游戏角色图鉴式入口
                </h2>
              </div>
              <div className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase">
                精选
              </div>
            </div>

            <div className="border-border/70 relative overflow-hidden rounded-[var(--radius)] border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_14%,white),color-mix(in_oklab,var(--background)_94%,var(--card)))] p-5">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,color-mix(in_oklab,white_24%,transparent)_42%,transparent_100%)]" />
              <div className="relative flex items-center gap-4">
                <div className="border-border/70 relative size-28 shrink-0 overflow-hidden rounded-[var(--radius)] border bg-[color:color-mix(in_oklab,var(--background)_72%,transparent)]">
                  {data.character.avatarImageUrl ? (
                    <RemoteImage
                      alt={data.character.name}
                      className="size-full object-cover object-center"
                      sizes="7rem"
                      src={data.character.avatarImageUrl}
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[0.68rem] uppercase">
                    角色立绘区
                  </p>
                  <h3 className="font-heading text-foreground text-3xl leading-none">
                    {data.character.name}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-7">
                    头图区保留人物沉浸氛围，同时把点亮和系列信息留在首屏可见范围内。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {featuredGoods.map((item) => (
                <div
                  className="border-border/65 bg-background/76 rounded-[var(--radius)] border px-4 py-3"
                  key={item.id}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-muted-foreground text-[0.66rem] uppercase">
                        精选商品
                      </p>
                      <p className="text-foreground mt-2 text-sm font-semibold">
                        {item.name}
                      </p>
                    </div>
                    <span
                      className={
                        item.isOwned
                          ? 'text-foreground rounded-full border border-[color:color-mix(in_oklab,var(--accent)_70%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_18%,white)] px-3 py-1 text-[0.68rem] font-semibold uppercase'
                          : 'border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase'
                      }
                    >
                      {item.isOwned ? '已点亮' : '未点亮'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
