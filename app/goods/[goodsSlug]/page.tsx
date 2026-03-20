import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { GoodsCommunityPanel } from '@/components/goods/goods-community-panel';
import { GoodsExchangePanel } from '@/components/goods/goods-exchange-panel';
import { GoodsGallery } from '@/components/goods/goods-gallery';
import { GoodsInfoPanels } from '@/components/goods/goods-info-panels';
import { GoodsStatusActions } from '@/components/goods/goods-status-actions';
import {
  recognitionCaptureModeSchema,
  recognitionSourceSchema,
} from '@/lib/recognition';
import { getAuthUser } from '@/server/auth/session';
import { getGoodsDetailViewData } from '@/server/data';

const goodsDetailPageParamsSchema = z.object({
  goodsSlug: z.string().trim().min(1),
});

const goodsDetailPageSearchParamsSchema = z.object({
  communitySubmission: z.enum(['pending']).optional(),
  exchangeSubmission: z.enum(['pending']).optional(),
  recognized: z.enum(['1']).optional(),
  recognitionRequestId: z.string().uuid().optional(),
  recognitionSource: recognitionSourceSchema.optional(),
  recognitionCaptureMode: recognitionCaptureModeSchema.optional(),
  recognitionCandidateId: z.string().trim().min(1).optional(),
});

type GoodsDetailPageProps = {
  params: Promise<{
    goodsSlug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: GoodsDetailPageProps): Promise<Metadata> {
  const { goodsSlug } = goodsDetailPageParamsSchema.parse(await params);

  return {
    title: goodsSlug,
    description: '用于图鉴浏览、收藏状态操作与社区互动的 SKU 详情页。',
  };
}

export default async function GoodsDetailPage({
  params,
  searchParams,
}: GoodsDetailPageProps) {
  const { goodsSlug } = goodsDetailPageParamsSchema.parse(await params);
  const rawSearchParams = await searchParams;
  const submissionState = goodsDetailPageSearchParamsSchema.parse({
    communitySubmission: Array.isArray(rawSearchParams.communitySubmission)
      ? rawSearchParams.communitySubmission[0]
      : rawSearchParams.communitySubmission,
    exchangeSubmission: Array.isArray(rawSearchParams.exchangeSubmission)
      ? rawSearchParams.exchangeSubmission[0]
      : rawSearchParams.exchangeSubmission,
  });
  const authUser = await getAuthUser();
  const data = await getGoodsDetailViewData({
    goodsSlug,
    userId: authUser?.id,
  });

  if (!data) {
    notFound();
  }

  const { goods } = data;
  const isRecognitionHandoff = submissionState.recognized === '1';

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_58%)]" />
      <div className="pointer-events-none absolute top-[-6rem] right-[-12rem] size-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_66%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        {isRecognitionHandoff ? (
          <section className="border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_10%,white),color-mix(in_oklab,var(--background)_94%,var(--card)))] rounded-[1.7rem] border px-5 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
                  识别跳转
                </p>
                <h2 className="text-foreground text-lg font-semibold">
                  候选已确认，并已跳转到这个 SKU
                </h2>
                <p className="text-muted-foreground text-sm leading-7">
                  相机识别流程已经推荐了这条商品记录，并且在进入详情页前完成了最终确认。现在你可以继续进行收藏状态、评论、评分或交换意向等操作。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                  来源：{submissionState.recognitionSource ?? '未知'}
                </span>
                {submissionState.recognitionCaptureMode ? (
                  <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    方式：{submissionState.recognitionCaptureMode}
                  </span>
                ) : null}
                {submissionState.recognitionRequestId ? (
                  <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    请求 {submissionState.recognitionRequestId.slice(0, 8)}
                  </span>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_48%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_90%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Link
                  className="border-border/70 bg-background/78 text-muted-foreground hover:bg-muted rounded-full border px-3 py-1 text-sm"
                  href={`/ips/${goods.ip.slug}`}
                >
                  {goods.ip.name}
                </Link>
                <Link
                  className="border-border/70 bg-background/78 text-muted-foreground hover:bg-muted rounded-full border px-3 py-1 text-sm"
                  href={`/ips/${goods.ip.slug}/series/${goods.series.slug}`}
                >
                  {goods.series.name}
                </Link>
                <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm tracking-[0.18em] uppercase">
                  SKU {goods.skuCode}
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
                  商品详情
                </p>
                <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5.1rem]">
                  {goods.name}
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                  {goods.description ??
                    '这个 SKU 详情页优先展示官方图片、结构化属性、收藏动作和轻量社区内容，而不是做成交易下单流程。'}
                </p>
              </div>
            </div>

            <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="border-border/70 bg-background/78 rounded-[1.7rem] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                  评分
                </p>
                <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                  {goods.summary.ratingAverage?.toFixed(1) ?? 'N/A'}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {goods.summary.ratingCount} 条评分
                </p>
              </div>
              <div className="border-border/70 bg-background/78 rounded-[1.7rem] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                  交换
                </p>
                <p className="font-heading text-foreground mt-3 text-5xl leading-none">
                  {goods.summary.openExchangeCount}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  条轻量公开意向
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <GoodsGallery goods={goods} />
          <div className="space-y-6">
            <GoodsStatusActions
              activeStatuses={data.viewer.activeStatuses}
              goodsId={goods.id}
              goodsSlug={goods.slug}
              isAuthenticated={Boolean(authUser)}
              userLabel={authUser?.displayLabel ?? null}
            />
            <GoodsExchangePanel
              exchange={data.exchange}
              hasPendingSubmission={
                submissionState.exchangeSubmission === 'pending'
              }
              goodsId={goods.id}
              goodsName={goods.name}
              goodsSlug={goods.slug}
              isAuthenticated={Boolean(authUser)}
              userLabel={authUser?.displayLabel ?? null}
            />
            <GoodsInfoPanels goods={goods} />
          </div>
        </section>

        <GoodsCommunityPanel
          data={data}
          hasPendingSubmission={
            submissionState.communitySubmission === 'pending'
          }
          viewerLabel={authUser?.displayLabel ?? null}
        />
      </div>
    </main>
  );
}
