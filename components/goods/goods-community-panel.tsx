import { ReportForm } from '@/components/safety/report-form';
import { RemoteImage } from '@/components/ui/remote-image';
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
  const hasRatings = community.ratingSummary.ratingCount > 0;

  return (
    <section
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]"
      id="community"
    >
      <aside className="space-y-6">
        <div className="collection-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">评分概览</p>
              <h3 className="mt-3 text-[28px]">社区评分</h3>
            </div>
            <span className="chip px-3 py-1.5 text-[12px]">
              {community.ratingSummary.ratingCount} 条
            </span>
          </div>

          {hasRatings ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[16px] bg-[var(--shu-soft)] p-4">
                  <p className="text-muted-foreground text-[12px]">综合分</p>
                  <p className="mt-2 text-[36px] leading-none font-extrabold text-[var(--shu)]">
                    {community.ratingSummary.averageScore?.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[var(--violet-soft)] p-4">
                  <p className="text-muted-foreground text-[12px]">值得入手</p>
                  <p className="mt-2 text-[36px] leading-none font-extrabold text-[var(--violet)]">
                    {community.ratingSummary.worthBuyingRate}%
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {goodsRatingDimensionMeta.map((dimension) => {
                  const average =
                    community.ratingSummary.dimensionAverages[dimension.key];
                  const width = average
                    ? `${Math.max(Math.min((average / 5) * 100, 100), 0)}%`
                    : '0%';

                  return (
                    <div key={dimension.key}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold">{dimension.label}</span>
                        <span className="num">{average?.toFixed(2)}</span>
                      </div>
                      <div className="bar">
                        <span style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {goodsRatingVerdictValues.map((verdict) => (
                  <span className="chip px-3 py-1 text-[12px]" key={verdict}>
                    {goodsRatingVerdictMeta[verdict].label}{' '}
                    {community.ratingSummary.verdictCounts[verdict]}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state mt-5 py-7">
              <strong>还没有评分</strong>
              成为第一个认真评价这件谷子的收藏者。
            </div>
          )}
        </div>

        <GoodsRatingComposer
          goodsId={goods.id}
          goodsSlug={goods.slug}
          isAuthenticated={Boolean(data.viewer.userId)}
          userLabel={viewerLabel}
          userRating={community.ratingSummary.userRating}
        />

        <GoodsCommunityComposer
          goodsId={goods.id}
          goodsSlug={goods.slug}
          hasPendingSubmission={hasPendingSubmission}
          isAuthenticated={Boolean(data.viewer.userId)}
          userLabel={viewerLabel}
        />
      </aside>

      <div className="collection-panel p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-kicker">收藏笔记</p>
            <h3 className="mt-3 text-[28px]">留言</h3>
          </div>
          <span className="chip px-3 py-1.5 text-[12px]">
            {goods.summary.postCount} 条
          </span>
        </div>

        {community.posts.items.length > 0 ? (
          <div className="mt-5 space-y-3">
            {community.posts.items.map((post) => (
              <article
                className="rounded-[16px] border border-[var(--rule)] bg-[var(--sunken)]/60 p-4"
                key={post.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">收藏者记录</p>
                  <time className="num">
                    {formatCatalogDate(post.createdAt)}
                  </time>
                </div>
                <p className="text-foreground mt-3 text-sm leading-7">
                  {post.body}
                </p>

                {post.images.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {post.images.map((image) => (
                      <div
                        className="relative aspect-square overflow-hidden rounded-[14px] border border-[var(--rule)] bg-[var(--surface)]"
                        key={image.id}
                      >
                        <RemoteImage
                          alt={image.altText ?? '用户上传的商品图片'}
                          className="size-full object-cover object-center"
                          sizes="(max-width: 639px) 50vw, 15vw"
                          src={image.imageUrl}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {data.viewer.userId ? (
                  <ReportForm
                    reason="post_content"
                    targetId={post.id}
                    targetType="post"
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state mt-5 py-8">
            <strong>还没有收藏笔记</strong>
            记录实物体验、包装状态或你喜欢它的理由。
          </div>
        )}
      </div>
    </section>
  );
}
