import { formatCatalogDate } from '@/lib/formatters';
import {
  goodsRatingDimensionMeta,
  goodsRatingVerdictMeta,
  goodsRatingVerdictValues,
} from '@/lib/goods-rating';
import type { GoodsDetailViewData } from '@/server/data';

import { GoodsCommunityComposer } from './goods-community-composer';
import { GoodsRatingComposer } from './goods-rating-composer';

type GoodsCommunityPanelProps = {
  data: GoodsDetailViewData;
  hasPendingSubmission: boolean;
  viewerLabel: string | null;
};

export function GoodsCommunityPanel({
  data,
  hasPendingSubmission,
  viewerLabel,
}: GoodsCommunityPanelProps) {
  const { goods, community } = data;
  const spotlightImages = community.posts.items.flatMap((post) =>
    post.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      altText: image.altText,
      postId: post.id,
    })),
  );

  return (
    <section
      className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]"
      id="community"
    >
      <aside className="space-y-6">
        <GoodsRatingComposer
          goodsId={goods.id}
          goodsSlug={goods.slug}
          isAuthenticated={Boolean(data.viewer.userId)}
          userLabel={viewerLabel}
          userRating={community.ratingSummary.userRating}
        />

        <div className="collection-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
                评分汇总
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none">
                社区评分
              </h2>
            </div>
            <div className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
              {community.ratingSummary.ratingCount} 条评分
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="border-border/70 bg-background/78 rounded-[1.5rem] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                总分
              </p>
              <p className="font-heading text-foreground mt-2 text-5xl leading-none">
                {community.ratingSummary.averageScore?.toFixed(2) ?? 'N/A'}
              </p>
            </div>
            <div className="border-border/70 bg-background/78 rounded-[1.5rem] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                值得入手
              </p>
              <p className="font-heading text-foreground mt-2 text-5xl leading-none">
                {community.ratingSummary.worthBuyingRate ?? 0}%
              </p>
            </div>
            <div className="border-border/70 bg-background/78 rounded-[1.5rem] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                我的评分
              </p>
              <p className="font-heading text-foreground mt-2 text-5xl leading-none">
                {community.ratingSummary.userRating
                  ? community.ratingSummary.userRating.overallScore.toFixed(2)
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {goodsRatingDimensionMeta.map((dimension) => {
              const average =
                community.ratingSummary.dimensionAverages[dimension.key];
              const width = average
                ? `${Math.max(Math.min((average / 5) * 100, 100), 0)}%`
                : '0%';

              return (
                <div
                  className="border-border/70 bg-background/74 rounded-[1.35rem] border px-4 py-4"
                  key={dimension.key}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {dimension.label}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm leading-6">
                        {dimension.title}
                      </p>
                    </div>
                    <p className="text-foreground text-sm font-semibold">
                      {average?.toFixed(2) ?? 'N/A'}
                    </p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[color:color-mix(in_oklab,var(--background)_76%,var(--card))]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--accent)_78%,white),color-mix(in_oklab,var(--primary)_60%,white))]"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {goodsRatingVerdictValues.map((verdict) => (
              <span
                className="border-border/70 bg-card/76 text-foreground rounded-full border px-3 py-1 text-sm"
                key={verdict}
              >
                {goodsRatingVerdictMeta[verdict].label}{' '}
                {community.ratingSummary.verdictCounts[verdict]}
              </span>
            ))}
          </div>
        </div>

        <GoodsCommunityComposer
          goodsId={goods.id}
          goodsSlug={goods.slug}
          hasPendingSubmission={hasPendingSubmission}
          isAuthenticated={Boolean(data.viewer.userId)}
          userLabel={viewerLabel}
        />

        <div className="collection-panel p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
                图片聚焦
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none">
                藏家晒单
              </h2>
            </div>
            <div className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
              {spotlightImages.length} 张图片
            </div>
          </div>

          {spotlightImages.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {spotlightImages.slice(0, 6).map((image) => (
                <div
                  className="border-border/70 bg-background/80 overflow-hidden rounded-[1.4rem] border"
                  key={image.id}
                >
                  <div
                    className="aspect-[1/1] bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${image.imageUrl})`,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="border-border/70 bg-background/74 text-muted-foreground mt-5 rounded-[1.5rem] border border-dashed px-4 py-4 text-sm leading-7">
              暂时还没有通过审核的晒单图片。新上传图片会先进入待审核状态，审核通过后才会展示在这个 SKU 的图库里。
            </div>
          )}
        </div>
      </aside>

      <div className="collection-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.3em] uppercase">
              评论
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              这个 SKU 下的留言
            </h2>
          </div>
          <div className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-4 py-2 text-sm">
            {goods.summary.postCount} 条已通过评论
          </div>
        </div>

        {community.posts.items.length > 0 ? (
          <div className="mt-5 space-y-4">
            {community.posts.items.map((post) => (
              <article
                className="border-border/70 bg-background/78 rounded-[1.6rem] border p-4"
                key={post.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                      藏家笔记
                    </p>
                    <p className="text-foreground mt-2 text-sm leading-7">
                      {post.body}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {formatCatalogDate(post.createdAt)}
                  </p>
                </div>

                {post.images.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {post.images.map((image) => (
                      <div
                        className="border-border/70 bg-card/72 overflow-hidden rounded-[1.2rem] border"
                        key={image.id}
                      >
                        <div
                          className="aspect-[1/1] bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${image.imageUrl})`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="border-border/70 bg-background/74 text-muted-foreground mt-5 rounded-[1.6rem] border border-dashed px-4 py-4 text-sm leading-7">
            暂时还没有通过审核的评论。新的社区笔记会先提交审核，人工通过后才会展示在这里。
          </div>
        )}
      </div>
    </section>
  );
}
