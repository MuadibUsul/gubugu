import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { CollapsibleSection } from '@/components/layout/collapsible-section';
import { GoodsCommunityPanel } from '@/components/goods/goods-community-panel';
import { GoodsGallery } from '@/components/goods/goods-gallery';
import { GoodsShareCard } from '@/components/goods/goods-share-card';
import { GoodsSpecTable } from '@/components/goods/goods-spec-table';
import { RarityBadge } from '@/components/goods/rarity-badge';
import { GoodsStatusActions } from '@/components/goods/goods-status-actions';
import { toAbsoluteImageUrl } from '@/lib/goods-image';
import { getAuthUser } from '@/server/auth/session';
import { getGoodsDetailPageData, getGoodsDetailViewData } from '@/server/data';
import { isMobileRequest } from '@/server/device';

const goodsDetailPageParamsSchema = z.object({
  goodsSlug: z.string().trim().min(1),
});

const goodsDetailPageSearchParamsSchema = z.object({
  communitySubmission: z.enum(['pending']).optional(),
  lighting: z.enum(['success', 'already']).optional(),
  collectionUpdate: z.enum(['saved', 'reserved', 'unlit', 'active']).optional(),
});

type GoodsDetailPageProps = {
  params: Promise<{
    goodsSlug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: GoodsDetailPageProps): Promise<Metadata> {
  const { goodsSlug } = goodsDetailPageParamsSchema.parse(await params);
  const goods = await getGoodsDetailPageData({ goodsSlug });

  if (!goods) {
    return {
      title: 'SKU 未找到',
    };
  }

  const description =
    goods.description ??
    `${goods.ip.name} · ${goods.series.name} 的标准 SKU 收藏图鉴。`;
  const canonicalUrl = toAbsoluteImageUrl(`/goods/${goods.slug}`);
  const shareImageUrl = toAbsoluteImageUrl(`/goods/${goods.slug}/share`);

  return {
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    title: goods.name,
    description,
    openGraph: {
      description,
      images: shareImageUrl
        ? [
            {
              alt: `${goods.name} 的谷子分享卡`,
              height: 1440,
              url: shareImageUrl,
              width: 1080,
            },
          ]
        : [],
      title: goods.name,
      type: 'website',
      url: canonicalUrl ?? undefined,
    },
  };
}

export default async function GoodsDetailPage({
  params,
  searchParams,
}: GoodsDetailPageProps) {
  const { goodsSlug } = goodsDetailPageParamsSchema.parse(await params);
  const rawSearchParams = await searchParams;
  const submissionState = goodsDetailPageSearchParamsSchema.parse({
    communitySubmission: getSingleValue(rawSearchParams.communitySubmission),
    lighting: getSingleValue(rawSearchParams.lighting),
    collectionUpdate: getSingleValue(rawSearchParams.collectionUpdate),
  });
  const [authUser, canScan] = await Promise.all([
    getAuthUser(),
    isMobileRequest(),
  ]);
  const data = await getGoodsDetailViewData({
    goodsSlug,
    userId: authUser?.id,
  });

  if (!data) {
    notFound();
  }

  const { goods } = data;
  const showLightingSuccess = Boolean(
    submissionState.lighting && data.viewer.isLit,
  );

  return (
    <main
      className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8"
      data-can-scan={canScan ? 'true' : 'false'}
    >
      {showLightingSuccess ? (
        <div className="callout callout--kin mb-6" role="status">
          <p>
            {submissionState.lighting === 'already'
              ? '这件谷子已经点亮过，仍保留最初的点亮记录。'
              : '识别确认成功：这件谷子已点亮，并计入你的收藏完成度。'}
          </p>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[var(--rule)] bg-[linear-gradient(145deg,var(--surface),color-mix(in_oklab,var(--violet-soft)_38%,var(--surface)))] p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
        <div className="min-w-0">
          <p className="accession flex flex-wrap items-center gap-2">
            <Link
              className="hover:text-[var(--shu)]"
              href={`/ips/${goods.ip.slug}`}
            >
              {goods.ip.name}
            </Link>
            <i>· {goods.series.name}</i>
          </p>

          <h1 className="mt-3 max-w-[880px] text-[clamp(30px,4vw,48px)] leading-[1.13] text-balance">
            {goods.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="chip px-3 py-1.5 font-mono text-[11px]">
              {goods.skuCode}
            </p>
            <span className="chip px-3 py-1.5 text-[11px]">SKU 条目</span>
            <RarityBadge
              rarityAverage={
                data.community.ratingSummary.dimensionAverages.rarityScore
              }
            />
            <GoodsShareCard goodsName={goods.name} goodsSlug={goods.slug} />
          </div>

          {goods.description ? (
            <p className="text-muted-foreground mt-4 max-w-[62ch]">
              {goods.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:items-start lg:gap-10">
            <GoodsGallery goods={goods} />

            <div className="flex flex-col">
              <div className="order-2">
                <GoodsSpecTable goods={goods} />
              </div>

              <div className="order-1 mb-8">
                <GoodsStatusActions
                  activeStatuses={data.viewer.activeStatuses}
                  statusDetails={data.viewer.state.statuses}
                  goodsId={goods.id}
                  goodsSlug={goods.slug}
                  isAuthenticated={Boolean(authUser)}
                  isWatching={data.viewer.isWatching}
                  updateFeedback={submissionState.collectionUpdate}
                  userLabel={authUser?.displayLabel ?? null}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border border-t py-10">
        <CollapsibleSection
          hint="真实体验都和当前 SKU 绑定，不混入系列或相似款。"
          kicker="收藏者社区"
          title="评分与收藏笔记"
        >
          <div className="min-w-0">
            <GoodsCommunityPanel
              data={data}
              hasPendingSubmission={
                submissionState.communitySubmission === 'pending'
              }
              viewerLabel={authUser?.displayLabel ?? null}
            />
          </div>
        </CollapsibleSection>
      </section>
    </main>
  );
}
