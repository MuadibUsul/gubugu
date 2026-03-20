import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { searchGoodsCatalog } from '@/server/data';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

import { HomeSectionState } from './home-section-state';

type HomeShelfItem = Awaited<
  ReturnType<typeof searchGoodsCatalog>
>['items'][number];

function ShelfHighlightCard({ item }: { item: HomeShelfItem }) {
  const primaryCharacter = item.characters[0];

  return (
    <article className="panel-float group relative overflow-hidden rounded-[1.9rem] border border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_86%,transparent),color-mix(in_oklab,var(--surface-soft)_84%,var(--background)))] shadow-[0_28px_78px_-40px_color-mix(in_oklab,var(--shadow-tint)_74%,transparent)]">
      <div className="relative h-56 overflow-hidden border-b border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)]">
        {item.primaryImageUrl ? (
          <Image
            alt={item.name}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 1024px) 100vw, 30rem"
            src={item.primaryImageUrl}
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_34%,color-mix(in_oklab,var(--background)_76%,var(--card))_100%)]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,color-mix(in_oklab,white_18%,transparent)_42%,transparent_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
              藏品聚焦
            </span>
            <span className="hud-chip text-foreground px-3 py-1 text-xs">
              {item.goodsType}
            </span>
          </div>

          <div className="hud-card max-w-[18rem] px-4 py-3 backdrop-blur">
            <p className="text-muted-foreground text-[0.66rem] font-semibold tracking-[0.28em] uppercase">
              {item.skuCode}
            </p>
            <p className="text-foreground mt-2 text-sm font-semibold">
              {item.series.name}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="hud-chip text-muted-foreground px-3 py-1 text-xs">
              {item.ip.name}
            </span>
            {primaryCharacter ? (
              <span className="hud-chip text-muted-foreground px-3 py-1 text-xs">
                {primaryCharacter.name}
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="font-heading text-foreground text-3xl leading-none">
              {item.name}
            </h3>
            {item.description ? (
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {item.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              className="hud-chip text-foreground/84 px-3 py-1 text-xs"
              key={tag.id}
            >
              {tag.name}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/goods/${item.slug}`}>打开商品</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/ips/${item.ip.slug}/series/${item.series.slug}`}>
              打开系列
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function HomeShelfHighlightsFallback() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="bg-muted h-3 w-32 animate-pulse rounded-full" />
        <div className="bg-muted/80 h-10 w-64 animate-pulse rounded-full" />
        <div className="bg-muted/65 h-5 w-full max-w-2xl animate-pulse rounded-full" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="hud-card h-[28rem] animate-pulse" key={index} />
        ))}
      </div>
    </section>
  );
}

export async function HomeShelfHighlightsSection() {
  let items: HomeShelfItem[] = [];
  let state: 'ready' | 'empty' | 'error' = 'ready';

  try {
    const results = await searchGoodsCatalog({
      page: 1,
      pageSize: 3,
    });

    items = results.items;
    state = items.length === 0 ? 'empty' : 'ready';
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      console.error(error);
    }

    state = 'error';
  }

  if (state === 'error') {
    return (
      <HomeSectionState
        description="当前精选商品暂时不可用，请稍后刷新后再试。"
        eyebrow="数据不可用"
        title="精选商品加载失败"
        tone="error"
      />
    );
  }

  if (state === 'empty') {
    return (
      <HomeSectionState
        description="当前还没有已发布的商品记录。等 SKU 数据就绪后，这里会直接展示具体商品，而不是只停留在 IP 层。"
        eyebrow="空状态"
        title="精选商品为空"
        tone="warning"
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
            藏品聚焦
          </p>
          <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
            直接给出可进入的 SKU
          </h2>
          <p className="text-muted-foreground max-w-3xl text-sm leading-7 sm:text-base">
            首页不只停留在 IP 导航层。这里直接落到真实商品记录，让你能立即检查图库、评论、评分、收藏状态和交换线索是不是对得上。
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/search">打开完整搜索</Link>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {items.map((item) => (
          <ShelfHighlightCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}
