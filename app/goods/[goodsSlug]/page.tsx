import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { GoodsCommunityPanel } from '@/components/goods/goods-community-panel';
import { GoodsExchangePanel } from '@/components/goods/goods-exchange-panel';
import { GoodsGallery } from '@/components/goods/goods-gallery';
import { GoodsSpecTable } from '@/components/goods/goods-spec-table';
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

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      {isRecognitionHandoff ? (
        <div className="callout callout--kin mb-10">
          <p>
            这是从拍照识别确认过来的条目。来源:{' '}
            {submissionState.recognitionSource ?? '未知'}。
          </p>
        </div>
      ) : null}

      {/* 図版 —— 图占主位，规格在右，操作紧随规格。三者本来就是一件事，
          旧版把它们拆成「信息 / 交换 / 讨论」三个互斥视图。 */}
      <section className="spread border-border border-b pb-14">
        <div>
          <p className="lbl">条目</p>
          <div className="rail-jp">図版</div>
        </div>

        <div className="min-w-0">
          <p className="accession">
            <Link
              className="hover:text-[var(--shu)]"
              href={`/ips/${goods.ip.slug}`}
            >
              {goods.ip.name}
            </Link>
            <i> · {goods.series.name}</i>
          </p>

          <h1 className="mt-2 text-[clamp(28px,3.8vw,44px)] leading-[1.14] text-balance">
            {goods.name}
          </h1>
          <p className="sku-code mt-3">{goods.skuCode}</p>
          <div className="rule-kin mt-4" />

          {goods.description ? (
            <p className="text-muted-foreground mt-4 max-w-[62ch]">
              {goods.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
            <GoodsGallery goods={goods} />

            <div>
              <GoodsSpecTable goods={goods} />

              <div className="mt-8">
                <GoodsStatusActions
                  activeStatuses={data.viewer.activeStatuses}
                  goodsId={goods.id}
                  goodsSlug={goods.slug}
                  isAuthenticated={Boolean(authUser)}
                  userLabel={authUser?.displayLabel ?? null}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="spread border-border border-b py-14">
        <div>
          <p className="lbl">交换</p>
          <div className="rail-jp">交換</div>
        </div>
        <div className="min-w-0">
          <GoodsExchangePanel
            exchange={data.exchange}
            goodsId={goods.id}
            goodsName={goods.name}
            goodsSlug={goods.slug}
            hasPendingSubmission={
              submissionState.exchangeSubmission === 'pending'
            }
            isAuthenticated={Boolean(authUser)}
            userLabel={authUser?.displayLabel ?? null}
          />
        </div>
      </section>

      <section className="spread py-14">
        <div>
          <p className="lbl">讨论</p>
          <div className="rail-jp">記録</div>
        </div>
        <div className="min-w-0">
          <GoodsCommunityPanel
            data={data}
            hasPendingSubmission={
              submissionState.communitySubmission === 'pending'
            }
            viewerLabel={authUser?.displayLabel ?? null}
          />
        </div>
      </section>
    </main>
  );
}
