import type { ReactNode } from 'react';

import { formatCatalogDate } from '@/lib/formatters';
import type { ModerationStatus } from '@/lib/moderation';
import { reviewModerationItemAction } from '@/server/admin/moderation/actions';
import { resolveReportAction } from '@/server/admin/reports/actions';
import type { ModerationQueueData } from '@/server/data';

function DecisionForm({
  itemId,
  module,
}: {
  itemId: string;
  module: 'catalog-submission' | 'photo-upload' | 'comment';
}) {
  return (
    <form
      action={reviewModerationItemAction}
      className="mt-3 flex flex-wrap gap-2"
    >
      <input name="itemId" type="hidden" value={itemId} />
      <input name="module" type="hidden" value={module} />
      <input name="nextPath" type="hidden" value="/admin/moderation" />
      <input
        className="border-input bg-background rounded border px-2 py-1 text-xs"
        maxLength={500}
        name="reviewNote"
        placeholder="审核备注"
      />
      <button
        className="rounded border px-2 py-1 text-xs"
        name="decision"
        value="approved"
      >
        通过
      </button>
      <button
        className="rounded border px-2 py-1 text-xs"
        name="decision"
        value="rejected"
      >
        拒绝
      </button>
    </form>
  );
}

function Queue({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="collection-panel p-5 sm:p-6">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Meta({
  createdAt,
  status,
}: {
  createdAt: Date;
  status: ModerationStatus;
}) {
  return (
    <p className="text-muted-foreground mt-2 text-xs">
      {status} · {formatCatalogDate(createdAt)}
    </p>
  );
}

export function ModerationShell({ data }: { data: ModerationQueueData }) {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 py-14 md:px-10">
      <section className="border-border border-b pb-10">
        <p className="lbl">安全</p>
        <h1 className="mt-3 text-[clamp(28px,3.8vw,44px)]">审核与举报</h1>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {data.modules.map((module) => (
            <span className="chip px-3 py-1" key={module.key}>
              {module.label} · {module.counts.pending}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-5 py-10 lg:grid-cols-2">
        <Queue title="图鉴投稿">
          {data.catalogSubmissions.length ? (
            data.catalogSubmissions.map((item) => (
              <article className="panel p-4" key={item.id}>
                <p className="text-sm">
                  {item.submissionType} · {item.targetType}
                </p>
                <Meta
                  createdAt={item.createdAt}
                  status={item.moderationStatus}
                />
                {item.moderationStatus === 'pending' ? (
                  <DecisionForm itemId={item.id} module="catalog-submission" />
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">暂无投稿。</p>
          )}
        </Queue>

        <Queue title="图片">
          {data.photoUploads.length ? (
            data.photoUploads.map((item) => (
              <article className="panel p-4" key={item.id}>
                <p className="truncate text-sm">{item.imageUrl}</p>
                <Meta
                  createdAt={item.createdAt}
                  status={item.moderationStatus}
                />
                {item.moderationStatus === 'pending' ? (
                  <DecisionForm itemId={item.id} module="photo-upload" />
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">暂无图片。</p>
          )}
        </Queue>

        <Queue title="评论">
          {data.comments.length ? (
            data.comments.map((item) => (
              <article className="panel p-4" key={item.id}>
                <p className="text-sm leading-6">{item.body}</p>
                <Meta
                  createdAt={item.createdAt}
                  status={item.moderationStatus}
                />
                {item.moderationStatus === 'pending' ? (
                  <DecisionForm itemId={item.id} module="comment" />
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">暂无评论。</p>
          )}
        </Queue>

        <Queue title="举报">
          {data.reports.length ? (
            data.reports.map((item) => (
              <article className="panel p-4" key={item.id}>
                <p className="text-sm">
                  {item.targetType} · {item.reason}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {item.details ?? '无补充说明'}
                </p>
                {item.targetType === 'message' ? (
                  <div className="mt-3 rounded-[12px] bg-[var(--sunken)] p-3 text-xs">
                    <p className="font-semibold">被举报私信原文</p>
                    <p className="mt-2 leading-6 break-words whitespace-pre-wrap">
                      {item.targetExcerpt ?? '消息已不存在或已隐藏'}
                    </p>
                    {item.targetActorId ? (
                      <p className="text-muted-foreground mt-2">
                        发送者 {item.targetActorId} ·{' '}
                        {item.targetCreatedAt
                          ? formatCatalogDate(item.targetCreatedAt)
                          : '时间未知'}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-2 text-xs">{item.status}</p>
                {item.status === 'pending' ? (
                  <form
                    action={resolveReportAction}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input name="reportId" type="hidden" value={item.id} />
                    <input
                      className="border-input bg-background rounded border px-2 py-1 text-xs"
                      maxLength={500}
                      name="note"
                      placeholder="处理备注"
                    />
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      name="decision"
                      value="resolved"
                    >
                      已处理
                    </button>
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      name="decision"
                      value="rejected"
                    >
                      驳回
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">暂无举报。</p>
          )}
        </Queue>
      </div>
    </main>
  );
}
