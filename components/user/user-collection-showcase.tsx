import Link from 'next/link';

import type { UserProfilePageData } from '@/server/data';

type UserCollectionShowcaseProps = {
  data: UserProfilePageData;
};

function pickRareItems(data: UserProfilePageData) {
  const all = [...data.goods.owned, ...data.goods.wanted, ...data.goods.exchange];
  const rareKeywords = ['限定', 'foil', 'special', '会场', '签名', '特典'];

  return all
    .filter((item) =>
      item.tags.some((tag) =>
        rareKeywords.some((keyword) =>
          tag.name.toLowerCase().includes(keyword.toLowerCase()),
        ),
      ),
    )
    .slice(0, 3);
}

function renderLinks(
  items: Array<{ id: string; slug: string; name: string }>,
  emptyLabel: string,
) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return items.map((item) => (
    <Link className="block text-sm font-semibold" href={`/goods/${item.slug}`} key={item.id}>
      {item.name}
    </Link>
  ));
}

export function UserCollectionShowcase({ data }: UserCollectionShowcaseProps) {
  const recentAdditions = [...data.goods.owned]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 3);
  const favorites = [...data.goods.owned]
    .filter((item) => Boolean(item.note))
    .slice(0, 3);
  const rareItems = pickRareItems(data);

  return (
    <section className="collection-panel p-6 sm:p-7">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              Showcase
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              这套收藏正在成形
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="hud-card px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                最近加入
              </p>
              <div className="mt-3 space-y-2">
                {renderLinks(recentAdditions, '还没有新加入的条目')}
              </div>
            </div>
            <div className="hud-card px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                稀有条目
              </p>
              <div className="mt-3 space-y-2">
                {renderLinks(rareItems, '暂时没有被标记为稀有的条目')}
              </div>
            </div>
            <div className="hud-card px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                偏爱收藏
              </p>
              <div className="mt-3 space-y-2">
                {renderLinks(favorites, '给喜欢的条目写备注后会出现在这里')}
              </div>
            </div>
          </div>
        </div>

        <div className="hud-card px-5 py-5">
          <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
            收藏身份
          </p>
          <div className="mt-4 space-y-3">
            <p className="text-foreground text-lg font-semibold">
              已拥有 {data.summary.ownedCount} 件，想要 {data.summary.wantedCount} 件，可交换 {data.summary.exchangeCount} 件。
            </p>
            <p className="text-muted-foreground text-sm leading-7">
              这不是普通列表，它正在呈现你的偏好和收藏方向。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
