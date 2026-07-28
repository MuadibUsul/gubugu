import Link from 'next/link';
import type { ReactNode } from 'react';

import { AdminModerationDecisionForm } from '@/components/admin/admin-moderation-decision-form';
import { formatCatalogDate } from '@/lib/formatters';
import { moderationStatusMeta, moderationStatusValues } from '@/lib/moderation';
import { cn } from '@/lib/utils';
import type { ModerationQueueData } from '@/server/data';

type ModerationShellProps = {
  data: ModerationQueueData;
};

function StatusPill({
  status,
  className,
}: {
  status: (typeof moderationStatusValues)[number];
  className?: string;
}) {
  return (
    <span
      className={cn(
        'rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.2em] uppercase',
        moderationStatusMeta[status].toneClassName,
        className,
      )}
    >
      {moderationStatusMeta[status].label}
    </span>
  );
}

function getModuleNote(key: ModerationQueueData['modules'][number]['key']) {
  switch (key) {
    case 'catalog-submissions':
      return '用于整理新增条目、信息修订与图鉴勘误提案。';
    case 'photo-uploads':
      return '用于单独审核晒单图片，不影响正文内容。';
    case 'comments':
      return '用于控制评论在公开页面中的可见状态。';
    case 'exchange-intents':
      return '用于审核交换意向是否进入公开展示。';
    default:
      return '';
  }
}

function QueueSection({
  eyebrow,
  title,
  description,
  note,
  emptyLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  emptyLabel: string;
  children: ReactNode[];
}) {
  return (
    <article className="collection-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
            {eyebrow}
          </p>
          <h2 className="font-heading text-foreground text-4xl leading-none">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm leading-7">
            {description}
          </p>
        </div>

        {children.length > 0 ? (
          <div className="space-y-3">{children}</div>
        ) : (
          <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[1.45rem] border border-dashed px-4 py-4 text-sm leading-7">
            {emptyLabel}
          </div>
        )}

        <p className="text-muted-foreground text-sm leading-7">{note}</p>
      </div>
    </article>
  );
}

export function ModerationShell({ data }: ModerationShellProps) {
  const isLive = data.mode === 'live';

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_54%)]" />
      <div className="pointer-events-none absolute top-[-5rem] right-[-10rem] size-[24rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_66%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_48%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_90%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)]" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm tracking-[0.18em] uppercase">
                  审核中心
                </span>
                <span className="border-border/70 bg-background/78 text-muted-foreground rounded-full border px-3 py-1 text-sm">
                  {formatCatalogDate(data.generatedAt)}
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
                  审核流程
                </p>
                <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5rem]">
                  让藏家内容在进入公开页面前先完成人工审核
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                  评论、图片和交换意向都已经会写入数据库。这里负责人工决策，把它们从待审核推进到通过或拒绝状态。
                </p>
              </div>

              <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[1.6rem] border px-5 py-4 text-sm leading-7">
                {data.mode === 'live'
                  ? '审核结果会同步影响公开页面中的评论、图片、交换意向和图鉴提案展示。'
                  : '当前审核数据暂时不可用，页面已切换为简版队列概览。'}
              </div>
            </div>

            <aside className="grid gap-3">
              {moderationStatusValues.map((status) => (
                <div
                  className="border-border/70 bg-background/78 rounded-[1.55rem] border px-5 py-5"
                  key={status}
                >
                  <StatusPill status={status} />
                  <p className="text-foreground mt-4 text-lg font-semibold">
                    {moderationStatusMeta[status].description}
                  </p>
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {data.modules.map((module) => (
            <article className="collection-panel p-5 sm:p-6" key={module.key}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                    队列模块
                  </p>
                  <h2 className="font-heading text-foreground text-3xl leading-none">
                    {module.label}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-7">
                    {module.description}
                  </p>
                </div>

                <div className="grid gap-2">
                  {moderationStatusValues.map((status) => (
                    <div
                      className="border-border/70 bg-background/76 flex items-center justify-between rounded-[1.15rem] border px-4 py-3"
                      key={status}
                    >
                      <StatusPill className="text-[0.6rem]" status={status} />
                      <span className="font-heading text-foreground text-3xl leading-none">
                        {module.counts[status]}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-muted-foreground text-sm leading-7">
                  {getModuleNote(module.key)}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <QueueSection
            description="结构化图鉴投稿可以在这里通过或拒绝。通过只会改变审核状态，不会自动把内容合并进 IP、角色、系列或商品记录。"
            emptyLabel="当前没有等待处理的图鉴投稿。"
            eyebrow="用户投稿"
            note="图鉴提案会在审核后进入后续整理流程。"
            title="图鉴提案"
          >
            {data.catalogSubmissions.items.map((item) => (
              <article
                className="border-border/70 bg-background/78 rounded-[1.45rem] border p-4"
                key={item.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    className="text-[0.58rem]"
                    status={item.moderationStatus}
                  />
                  <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {item.submissionType}
                  </span>
                  <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {item.targetEntityType}
                  </span>
                  <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {item.submitterLabel}
                  </span>
                </div>

                <h3 className="text-foreground mt-4 text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="text-foreground mt-2 text-sm leading-7">
                  {item.body}
                </p>
                <p className="text-muted-foreground mt-3 text-sm">
                  {formatCatalogDate(item.createdAt)}
                </p>

                {item.reviewNote ? (
                  <div className="border-border/70 bg-card/74 mt-4 rounded-[1.1rem] border px-4 py-3 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_78%,var(--background))]">
                    {item.reviewNote}
                  </div>
                ) : null}

                {isLive ? (
                  <div className="border-border/60 mt-4 border-t pt-4">
                    <AdminModerationDecisionForm
                      reviewNote={item.reviewNote}
                      subjectId={item.id}
                      subjectType="catalogSubmission"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </QueueSection>

          <QueueSection
            description="图片会和所属帖子分开审核，这样图库可以保留正文，同时只拒绝存在问题的单张图片。"
            emptyLabel="当前没有等待处理的图片上传。"
            eyebrow="图片投稿"
            note="图片可以单独审核，不会影响对应正文内容。"
            title="晒单图片审核"
          >
            {data.photoUploads.items.map((item) => (
              <article
                className="border-border/70 bg-background/78 overflow-hidden rounded-[1.45rem] border"
                key={item.id}
              >
                <div className="grid gap-4 p-4 md:grid-cols-[120px_minmax(0,1fr)]">
                  <div
                    className="border-border/70 rounded-[1.1rem] border bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${item.imageUrl})`,
                      minHeight: '120px',
                    }}
                  />

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        className="text-[0.58rem]"
                        status={item.moderationStatus}
                      />
                      <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                        {item.submitterLabel}
                      </span>
                      <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                        {formatCatalogDate(item.createdAt)}
                      </span>
                    </div>

                    <Link
                      className="text-foreground hover:text-primary inline-flex text-lg font-semibold transition"
                      href={`/goods/${item.goodsSlug}`}
                    >
                      {item.goodsName}
                    </Link>
                    <p className="text-foreground text-sm leading-7">
                      {item.noteExcerpt}
                    </p>

                    {item.reviewNote ? (
                      <div className="border-border/70 bg-card/74 rounded-[1.1rem] border px-4 py-3 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_78%,var(--background))]">
                        {item.reviewNote}
                      </div>
                    ) : null}

                    {isLive ? (
                      <div className="border-border/60 border-t pt-4">
                        <AdminModerationDecisionForm
                          reviewNote={item.reviewNote}
                          subjectId={item.id}
                          subjectType="photoUpload"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </QueueSection>

          <QueueSection
            description="评论通过后，会在重新校验后出现在商品详情页和公开收藏页中。"
            emptyLabel="当前没有等待处理的评论。"
            eyebrow="评论"
            note="评论审核通过后，会显示在对应商品页和公开收藏页中。"
            title="SKU 留言审核"
          >
            {data.comments.items.map((item) => (
              <article
                className="border-border/70 bg-background/78 rounded-[1.45rem] border p-4"
                key={item.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    className="text-[0.58rem]"
                    status={item.moderationStatus}
                  />
                  <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {item.submitterLabel}
                  </span>
                  <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {formatCatalogDate(item.createdAt)}
                  </span>
                </div>

                <Link
                  className="text-foreground hover:text-primary mt-4 inline-flex text-lg font-semibold transition"
                  href={`/goods/${item.goodsSlug}`}
                >
                  {item.goodsName}
                </Link>
                <p className="text-foreground mt-2 text-sm leading-7">
                  {item.body}
                </p>

                {item.reviewNote ? (
                  <div className="border-border/70 bg-card/74 mt-4 rounded-[1.1rem] border px-4 py-3 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_78%,var(--background))]">
                    {item.reviewNote}
                  </div>
                ) : null}

                {isLive ? (
                  <div className="border-border/60 mt-4 border-t pt-4">
                    <AdminModerationDecisionForm
                      reviewNote={item.reviewNote}
                      subjectId={item.id}
                      subjectType="comment"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </QueueSection>

          <QueueSection
            description="交换记录依然只停留在意向层。通过与否只会影响它是否出现在商品详情页和收藏页的交换板中。"
            emptyLabel="当前没有等待处理的交换意向。"
            eyebrow="交换意向"
            note="交换记录只保留意向信息，不包含付款、托管或仲裁。"
            title="Have / Want 审核"
          >
            {data.exchangeIntents.items.map((item) => (
              <article
                className="border-border/70 bg-background/78 rounded-[1.45rem] border p-4"
                key={item.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    className="text-[0.58rem]"
                    status={item.moderationStatus}
                  />
                  <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {item.submitterLabel}
                  </span>
                  <span className="border-border/70 bg-card/76 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                    {formatCatalogDate(item.createdAt)}
                  </span>
                </div>

                <Link
                  className="text-foreground hover:text-primary mt-4 inline-flex text-lg font-semibold transition"
                  href={`/goods/${item.goodsSlug}`}
                >
                  {item.goodsName}
                </Link>
                <p className="text-muted-foreground mt-2 text-sm">
                  想换：{item.wantedGoodsName ?? '未关联目标 SKU'}
                </p>
                <p className="text-foreground mt-2 text-sm leading-7">
                  {item.description}
                </p>

                {item.reviewNote ? (
                  <div className="border-border/70 bg-card/74 mt-4 rounded-[1.1rem] border px-4 py-3 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_78%,var(--background))]">
                    {item.reviewNote}
                  </div>
                ) : null}

                {isLive ? (
                  <div className="border-border/60 mt-4 border-t pt-4">
                    <AdminModerationDecisionForm
                      reviewNote={item.reviewNote}
                      subjectId={item.id}
                      subjectType="exchangeIntent"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </QueueSection>
        </section>
      </div>
    </main>
  );
}
