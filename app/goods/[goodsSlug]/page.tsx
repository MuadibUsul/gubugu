import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { GoodsCommunityPanel } from '@/components/goods/goods-community-panel';
import { GoodsExchangePanel } from '@/components/goods/goods-exchange-panel';
import { GoodsGallery } from '@/components/goods/goods-gallery';
import { GoodsInfoPanels } from '@/components/goods/goods-info-panels';
import { GoodsStatusActions } from '@/components/goods/goods-status-actions';
import { PageViewSwitch } from '@/components/layout/page-view-switch';
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
  view: z.enum(['overview', 'exchange', 'community']).default('overview'),
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

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildGoodsDetailHref({
  goodsSlug,
  view,
  submissionState,
}: {
  goodsSlug: string;
  view: 'overview' | 'exchange' | 'community';
  submissionState: z.infer<typeof goodsDetailPageSearchParamsSchema>;
}) {
  const params = new URLSearchParams();

  if (view !== 'overview') {
    params.set('view', view);
  }

  if (submissionState.communitySubmission) {
    params.set('communitySubmission', submissionState.communitySubmission);
  }

  if (submissionState.exchangeSubmission) {
    params.set('exchangeSubmission', submissionState.exchangeSubmission);
  }

  if (submissionState.recognized) {
    params.set('recognized', submissionState.recognized);
  }

  if (submissionState.recognitionRequestId) {
    params.set('recognitionRequestId', submissionState.recognitionRequestId);
  }

  if (submissionState.recognitionSource) {
    params.set('recognitionSource', submissionState.recognitionSource);
  }

  if (submissionState.recognitionCaptureMode) {
    params.set(
      'recognitionCaptureMode',
      submissionState.recognitionCaptureMode,
    );
  }

  if (submissionState.recognitionCandidateId) {
    params.set(
      'recognitionCandidateId',
      submissionState.recognitionCandidateId,
    );
  }

  const queryString = params.toString();
  const pathname = `/goods/${goodsSlug}`;

  return queryString ? `${pathname}?${queryString}` : pathname;
}

export async function generateMetadata({
  params,
}: GoodsDetailPageProps): Promise<Metadata> {
  const { goodsSlug } = goodsDetailPageParamsSchema.parse(await params);

  return {
    title: goodsSlug,
    description: 'SKU detail page.',
  };
}

export default async function GoodsDetailPage({
  params,
  searchParams,
}: GoodsDetailPageProps) {
  const { goodsSlug } = goodsDetailPageParamsSchema.parse(await params);
  const rawSearchParams = await searchParams;
  const submissionState = goodsDetailPageSearchParamsSchema.parse({
    view: getSingleValue(rawSearchParams.view),
    communitySubmission: getSingleValue(rawSearchParams.communitySubmission),
    exchangeSubmission: getSingleValue(rawSearchParams.exchangeSubmission),
    recognized: getSingleValue(rawSearchParams.recognized),
    recognitionRequestId: getSingleValue(rawSearchParams.recognitionRequestId),
    recognitionSource: getSingleValue(rawSearchParams.recognitionSource),
    recognitionCaptureMode: getSingleValue(
      rawSearchParams.recognitionCaptureMode,
    ),
    recognitionCandidateId: getSingleValue(
      rawSearchParams.recognitionCandidateId,
    ),
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
  const summaryChips = [
    `评分 ${goods.summary.ratingAverage?.toFixed(1) ?? '暂无'}`,
    `${goods.summary.postCount} 条讨论`,
    `${goods.summary.openExchangeCount} 条交换`,
  ];

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_58%)]" />
      <div className="pointer-events-none absolute top-[-6rem] right-[-12rem] size-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_66%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[96rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        {isRecognitionHandoff ? (
          <section className="rounded-[1.8rem] border border-[color:color-mix(in_oklab,var(--accent)_48%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_10%,white),color-mix(in_oklab,var(--background)_94%,var(--card)))] px-5 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.24em] uppercase">
                  Recognition
                </p>
                <h2 className="text-foreground text-lg font-semibold">
                  已定位到这件 SKU
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                  来源: {submissionState.recognitionSource ?? 'unknown'}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_48%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_90%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)]" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]">
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
                  Goods
                </p>
                <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5.1rem]">
                  {goods.name}
                </h1>
                {goods.description ? (
                  <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                    {goods.description}
                  </p>
                ) : null}
              </div>
            </div>

            <aside className="rounded-[1.7rem] border border-[color:color-mix(in_oklab,var(--border)_84%,white_8%)] bg-[color:color-mix(in_oklab,var(--background)_76%,var(--card))] px-5 py-5">
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                快速概览
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {summaryChips.map((label) => (
                  <span className="hud-chip px-3 py-1 text-xs" key={label}>
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {goods.characters.slice(0, 3).map((character) => (
                  <span
                    className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-xs"
                    key={character.id}
                  >
                    {character.name}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <GoodsStatusActions
          activeStatuses={data.viewer.activeStatuses}
          goodsId={goods.id}
          goodsSlug={goods.slug}
          isAuthenticated={Boolean(authUser)}
          userLabel={authUser?.displayLabel ?? null}
        />

        <PageViewSwitch
          items={[
            {
              active: submissionState.view === 'overview',
              href: buildGoodsDetailHref({
                goodsSlug,
                submissionState,
                view: 'overview',
              }),
              label: '信息',
            },
            {
              active: submissionState.view === 'exchange',
              badge: `${data.exchange.listings.length}`,
              href: buildGoodsDetailHref({
                goodsSlug,
                submissionState,
                view: 'exchange',
              }),
              label: '交换',
            },
            {
              active: submissionState.view === 'community',
              badge: `${goods.summary.postCount}`,
              href: buildGoodsDetailHref({
                goodsSlug,
                submissionState,
                view: 'community',
              }),
              label: '讨论',
            },
          ]}
        />

        {submissionState.view === 'overview' ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <GoodsGallery goods={goods} />
            <GoodsInfoPanels goods={goods} />
          </section>
        ) : null}

        {submissionState.view === 'exchange' ? (
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
        ) : null}

        {submissionState.view === 'community' ? (
          <GoodsCommunityPanel
            data={data}
            hasPendingSubmission={
              submissionState.communitySubmission === 'pending'
            }
            viewerLabel={authUser?.displayLabel ?? null}
          />
        ) : null}
      </div>
    </main>
  );
}
