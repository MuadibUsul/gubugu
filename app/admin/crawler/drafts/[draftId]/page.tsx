import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminGoodsEditorForm } from '@/components/admin/admin-goods-editor-form';
import { Button } from '@/components/ui/button';
import { rejectCrawlerDraftAction } from '@/server/admin/crawler/actions';
import { requireAdminAccess } from '@/server/auth/admin';
import { getCrawlerDraftReviewData } from '@/server/data/admin-crawler';

export const metadata: Metadata = {
  title: '审核采集草稿',
  description: '核对爬虫提取内容，修改后发布到商品图鉴。',
};

export const dynamic = 'force-dynamic';

type CrawlerDraftPageProps = {
  params: Promise<{ draftId: string }>;
};

function formatTimestamp(value: Date) {
  return value.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displaySourceUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}`;
  } catch {
    return value;
  }
}

export default async function CrawlerDraftPage({
  params,
}: CrawlerDraftPageProps) {
  const { draftId } = await params;
  await requireAdminAccess(`/admin/crawler/drafts/${draftId}`);
  const data = await getCrawlerDraftReviewData(draftId);

  if (!data) {
    notFound();
  }

  const primaryImage =
    data.initialGoods.images.find((image) => image.isPrimary) ??
    data.initialGoods.images[0] ??
    null;

  return (
    <main className="relative isolate overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  采集审核
                </span>
                <span className="border-primary/25 bg-primary/8 text-primary rounded-full border px-3 py-1 text-xs font-semibold">
                  待人工确认
                </span>
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  {data.draft.sourceName}
                </p>
                <h1 className="font-heading text-foreground text-4xl leading-[0.98] text-balance sm:text-5xl">
                  {data.draft.title}
                </h1>
                <p className="text-muted-foreground max-w-3xl text-sm leading-7">
                  爬虫只负责生成草稿。请核对系列、SKU、规格与图片，再决定发布或拒绝。
                </p>
              </div>
            </div>

            <aside className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                来源快照
              </p>
              <a
                className="text-foreground hover:text-primary mt-3 block truncate text-sm font-semibold"
                href={data.draft.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                {displaySourceUrl(data.draft.sourceUrl)}
              </a>
              <p className="text-muted-foreground mt-2 text-xs">
                入队于 {formatTimestamp(data.draft.createdAt)}
              </p>
              <Button
                asChild
                className="mt-4 w-full"
                size="sm"
                variant="outline"
              >
                <Link href="/admin/crawler?view=drafts">返回草稿队列</Link>
              </Button>
            </aside>
          </div>
        </section>

        <section className="collection-panel p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:items-center">
            <div
              aria-label={primaryImage?.altText ?? data.draft.title}
              className="border-border/70 bg-card/80 aspect-[4/5] rounded-[var(--radius)] border bg-contain bg-center bg-no-repeat"
              role="img"
              style={
                primaryImage
                  ? { backgroundImage: `url(${primaryImage.imageUrl})` }
                  : undefined
              }
            >
              {!primaryImage ? (
                <span className="text-muted-foreground flex h-full items-center justify-center text-xs">
                  暂无图片
                </span>
              ) : null}
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  自动提取结果
                </p>
                <p className="text-foreground mt-2 text-lg font-semibold">
                  {data.initialGoods.name}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {data.initialGoods.skuCode} · {data.initialGoods.goodsType}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-card/78 rounded-full border px-3 py-1 text-xs">
                  图片 {data.initialGoods.images.length}
                </span>
                <span className="border-border/70 bg-card/78 rounded-full border px-3 py-1 text-xs">
                  标签 {data.initialGoods.tags.length}
                </span>
                <span className="border-border/70 bg-card/78 rounded-full border px-3 py-1 text-xs">
                  {data.initialGoods.currencyCode ?? '未识别币种'}
                </span>
              </div>
            </div>

            <details className="group lg:w-64">
              <summary className="border-border/70 bg-background/78 text-muted-foreground hover:border-destructive/45 hover:text-foreground flex h-10 cursor-pointer list-none items-center justify-center rounded-[var(--radius)] border px-4 text-sm font-semibold transition-[border-color,color,transform] duration-150 active:scale-[.97]">
                拒绝这条草稿
              </summary>
              <form
                action={rejectCrawlerDraftAction}
                className="mt-3 space-y-3"
              >
                <input name="draftId" type="hidden" value={data.draft.id} />
                <textarea
                  className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-24 w-full rounded-[var(--radius)] border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  maxLength={500}
                  name="reviewNote"
                  placeholder="拒绝原因（可选）"
                />
                <Button
                  className="w-full"
                  size="sm"
                  type="submit"
                  variant="outline"
                >
                  确认拒绝
                </Button>
              </form>
            </details>
          </div>
        </section>

        <AdminGoodsEditorForm
          crawlerDraftId={data.draft.id}
          editorMode="create"
          filters={{}}
          initialGoods={data.initialGoods}
          seriesOptions={data.seriesOptions}
          tagLibrary={data.tagLibrary}
        />
      </div>
    </main>
  );
}
