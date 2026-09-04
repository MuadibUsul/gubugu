import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  ingestManualUrlAction,
  rejectCrawlerDraftAction,
  saveCrawlerSourceAction,
  scanAllCrawlerSourcesAction,
  scanCrawlerSourceAction,
  toggleCrawlerSourceAction,
} from '@/server/admin/crawler/actions';
import type { AdminCrawlerPageData } from '@/server/data/admin-crawler';

type AdminCrawlerShellProps = {
  data: AdminCrawlerPageData;
  feedback?: {
    tone: 'success' | 'error';
    text: string;
  };
};

const inputClassName =
  'border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 h-11 w-full rounded-[var(--radius)] border px-4 text-sm outline-none transition-[border-color,box-shadow] focus-visible:ring-2';
const textareaClassName =
  'border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-24 w-full rounded-[var(--radius)] border px-4 py-3 text-sm outline-none transition-[border-color,box-shadow] focus-visible:ring-2';
const labelClassName =
  'text-muted-foreground block text-[0.68rem] font-semibold uppercase';

const viewOptions = [
  { key: 'sources', label: '白名单来源' },
  { key: 'drafts', label: '审核草稿' },
  { key: 'runs', label: '运行记录' },
] as const;

function formatTimestamp(value: Date | null) {
  if (!value) {
    return '尚未运行';
  }

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

function StatusPill({
  status,
}: {
  status:
    | 'pending'
    | 'published'
    | 'rejected'
    | 'running'
    | 'succeeded'
    | 'failed';
}) {
  const label = {
    pending: '待审核',
    published: '已发布',
    rejected: '已拒绝',
    running: '运行中',
    succeeded: '成功',
    failed: '失败',
  }[status];
  const tone =
    status === 'failed' || status === 'rejected'
      ? 'border-destructive/30 bg-destructive/8 text-destructive'
      : status === 'succeeded' || status === 'published'
        ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
        : 'border-primary/25 bg-primary/8 text-primary';

  return (
    <span
      className={`${tone} rounded-full border px-3 py-1 text-xs font-semibold`}
    >
      {label}
    </span>
  );
}

function ManualIngestForm() {
  return (
    <form action={ingestManualUrlAction} className="space-y-3">
      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="manual-url">
          商品链接
        </label>
        <input
          className={inputClassName}
          id="manual-url"
          name="url"
          placeholder="https://…/商品详情页"
          required
          type="url"
        />
      </div>
      <Button className="w-full" size="sm" type="submit">
        解析并加入审核
      </Button>
    </form>
  );
}

function SourceForm({
  source,
}: {
  source?: AdminCrawlerPageData['sources'][number];
}) {
  return (
    <form action={saveCrawlerSourceAction} className="space-y-4">
      <input name="sourceId" type="hidden" value={source?.id ?? ''} />

      <div className="space-y-2">
        <label
          className={labelClassName}
          htmlFor={`crawler-name-${source?.id ?? 'new'}`}
        >
          来源名称
        </label>
        <input
          className={inputClassName}
          defaultValue={source?.name ?? ''}
          id={`crawler-name-${source?.id ?? 'new'}`}
          maxLength={120}
          name="name"
          placeholder="例：官方商店新品"
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label
          className={labelClassName}
          htmlFor={`crawler-url-${source?.id ?? 'new'}`}
        >
          白名单入口 URL
        </label>
        <input
          className={inputClassName}
          defaultValue={source?.entryUrl ?? ''}
          id={`crawler-url-${source?.id ?? 'new'}`}
          name="entryUrl"
          placeholder="https://shop.example.com/new"
          required
          type="url"
        />
      </div>

      <div className="space-y-2">
        <label
          className={labelClassName}
          htmlFor={`crawler-path-${source?.id ?? 'new'}`}
        >
          详情路径特征
        </label>
        <input
          className={inputClassName}
          defaultValue={source?.detailPathPattern ?? ''}
          id={`crawler-path-${source?.id ?? 'new'}`}
          maxLength={255}
          name="detailPathPattern"
          placeholder="可选，如 /products/"
          type="text"
        />
        <p className="text-muted-foreground text-xs leading-5">
          仅跟随同域且路径包含该文本的链接；留空时只解析入口页。
        </p>
      </div>

      <div className="space-y-2">
        <label
          className={labelClassName}
          htmlFor={`crawler-hosts-${source?.id ?? 'new'}`}
        >
          额外图片域名
        </label>
        <textarea
          className={textareaClassName}
          defaultValue={source?.allowedImageHosts.join('\n') ?? ''}
          id={`crawler-hosts-${source?.id ?? 'new'}`}
          name="allowedImageHosts"
          placeholder={'img.example.com\ncdn.example.com'}
        />
        <p className="text-muted-foreground text-xs leading-5">
          一行一个域名。入口站点自身的图片域名无需重复填写。
        </p>
      </div>

      <Button className="w-full" type="submit">
        {source ? '保存来源设置' : '加入白名单'}
      </Button>
    </form>
  );
}

function SourcesView({ data }: AdminCrawlerShellProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <section className="collection-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              Whitelist
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              已授权来源
            </h2>
            <p className="text-muted-foreground max-w-2xl text-sm leading-7">
              系统每天北京时间 10:00 与 22:00
              扫描启用来源。停用不会删除历史草稿和运行记录。
            </p>
          </div>
          <form action={scanAllCrawlerSourcesAction}>
            <Button size="sm" type="submit" variant="outline">
              扫描全部来源
            </Button>
          </form>
        </div>

        {data.sources.length === 0 ? (
          <div className="border-border/70 bg-background/74 text-muted-foreground mt-5 rounded-[var(--radius)] border border-dashed px-5 py-10 text-center text-sm leading-7">
            尚未添加白名单来源。先填写右侧表单，再手动扫描一次验证解析结果。
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {data.sources.map((source) => (
              <article
                className="border-border/70 bg-background/76 rounded-[var(--radius)] border px-4 py-4 sm:px-5"
                key={source.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-foreground text-base font-semibold">
                        {source.name}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          source.enabled
                            ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
                            : 'border-border/70 bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        {source.enabled ? '启用' : '停用'}
                      </span>
                    </div>
                    <a
                      className="text-muted-foreground hover:text-primary block max-w-2xl truncate text-sm"
                      href={source.entryUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {displaySourceUrl(source.entryUrl)}
                    </a>
                    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>
                        上次扫描：{formatTimestamp(source.lastScannedAt)}
                      </span>
                      <span>待审核：{source.pendingDraftCount}</span>
                      <span>
                        详情规则：{source.detailPathPattern || '仅入口页'}
                      </span>
                    </div>
                    {source.lastError ? (
                      <p className="text-destructive max-w-3xl text-xs leading-5">
                        {source.lastError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={scanCrawlerSourceAction}>
                      <input name="sourceId" type="hidden" value={source.id} />
                      <Button
                        disabled={!source.enabled}
                        size="sm"
                        type="submit"
                      >
                        立即扫描
                      </Button>
                    </form>
                    <form action={toggleCrawlerSourceAction}>
                      <input name="sourceId" type="hidden" value={source.id} />
                      <Button size="sm" type="submit" variant="outline">
                        {source.enabled ? '停用' : '启用'}
                      </Button>
                    </form>
                  </div>
                </div>

                <details className="group mt-4 border-t border-[color:color-mix(in_oklab,var(--border)_72%,transparent)] pt-3">
                  <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer list-none text-xs font-semibold">
                    编辑来源设置
                  </summary>
                  <div className="mt-4 max-w-2xl">
                    <SourceForm source={source} />
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="collection-panel h-fit space-y-8 p-5 sm:p-6 xl:sticky xl:top-6">
        <div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              手动录入
            </p>
            <h2 className="font-heading text-foreground text-3xl leading-none">
              粘贴链接
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              贴一个商品详情页链接：抓取这一页 → 适配器解析 + LLM 中文化 →
              生成一条待审草稿。逐条人工策展，不发现其它链接。
            </p>
          </div>
          <div className="mt-5">
            <ManualIngestForm />
          </div>
        </div>

        <div className="border-border/60 border-t pt-6">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
              新来源
            </p>
            <h2 className="font-heading text-foreground text-3xl leading-none">
              加入白名单
            </h2>
            <p className="text-muted-foreground text-sm leading-7">
              只添加你有权采集且结构稳定的公开页面。新增内容始终先进入人工审核。
            </p>
          </div>
          <div className="mt-5">
            <SourceForm />
          </div>
        </div>
      </aside>
    </div>
  );
}

function DraftsView({ data }: AdminCrawlerShellProps) {
  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
          Review queue
        </p>
        <h2 className="font-heading text-foreground text-4xl leading-none">
          采集草稿
        </h2>
        <p className="text-muted-foreground max-w-3xl text-sm leading-7">
          自动提取内容不会直接进入谷库。打开草稿补全系列与 SKU
          字段，确认无误后再发布。
        </p>
      </div>

      {data.drafts.length === 0 ? (
        <div className="border-border/70 bg-background/74 text-muted-foreground mt-5 rounded-[var(--radius)] border border-dashed px-5 py-10 text-center text-sm">
          当前没有采集草稿。
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {data.drafts.map((draft) => (
            <article
              className="border-border/70 bg-background/76 grid gap-4 rounded-[var(--radius)] border p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center"
              key={draft.id}
            >
              <div
                aria-label={draft.title}
                className="border-border/70 bg-card/80 aspect-[4/5] w-24 rounded-[calc(var(--radius)*.8)] border bg-contain bg-center bg-no-repeat"
                role="img"
                style={
                  draft.primaryImageUrl
                    ? { backgroundImage: `url(${draft.primaryImageUrl})` }
                    : undefined
                }
              >
                {!draft.primaryImageUrl ? (
                  <span className="text-muted-foreground flex h-full items-center justify-center text-[0.65rem]">
                    无图
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={draft.status} />
                  <span className="text-muted-foreground text-xs">
                    {draft.sourceName}
                  </span>
                </div>
                <h3
                  className="text-foreground truncate text-base font-semibold"
                  title={draft.title}
                >
                  {draft.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {draft.skuCode || 'SKU 待补充'} ·{' '}
                  {formatTimestamp(draft.createdAt)}
                </p>
                <a
                  className="text-muted-foreground hover:text-primary block truncate text-xs"
                  href={draft.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {displaySourceUrl(draft.sourceUrl)}
                </a>
              </div>

              <div className="flex flex-wrap gap-2 sm:flex-col">
                {draft.status === 'pending' ? (
                  <Button asChild size="sm">
                    <Link href={`/admin/crawler/drafts/${draft.id}`}>
                      打开审核
                    </Link>
                  </Button>
                ) : null}
                {draft.status === 'pending' ? (
                  <details className="group">
                    <summary className="border-border/70 bg-card text-foreground hover:border-primary flex h-9 cursor-pointer list-none items-center justify-center rounded-[var(--radius)] border px-4 text-sm font-semibold transition-[border-color,color,transform] duration-150 active:scale-[.97]">
                      快速拒绝
                    </summary>
                    <form
                      action={rejectCrawlerDraftAction}
                      className="mt-2 w-64 space-y-2 sm:ml-auto"
                    >
                      <input name="draftId" type="hidden" value={draft.id} />
                      <textarea
                        className={textareaClassName}
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
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RunsView({ data }: AdminCrawlerShellProps) {
  return (
    <section className="collection-panel p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
          Run history
        </p>
        <h2 className="font-heading text-foreground text-4xl leading-none">
          扫描记录
        </h2>
        <p className="text-muted-foreground max-w-3xl text-sm leading-7">
          每次手动或定时扫描都会留下统计与错误信息，方便确认新增内容是否成功进入审核队列。
        </p>
      </div>

      {data.runs.length === 0 ? (
        <div className="border-border/70 bg-background/74 text-muted-foreground mt-5 rounded-[var(--radius)] border border-dashed px-5 py-10 text-center text-sm">
          暂无扫描记录。
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article
              className="border-border/70 bg-background/76 rounded-[var(--radius)] border p-4 sm:p-5"
              key={run.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={run.status} />
                    <span className="text-muted-foreground rounded-full border border-[color:color-mix(in_oklab,var(--border)_72%,transparent)] px-2.5 py-0.5 text-xs">
                      {run.trigger === 'scheduled' ? '定时' : '手动'}
                    </span>
                  </div>
                  <h3 className="text-foreground font-semibold">
                    {run.sourceName}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {formatTimestamp(run.startedAt)}
                    {run.finishedAt
                      ? ` → ${formatTimestamp(run.finishedAt)}`
                      : ''}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
                  {[
                    ['发现', run.discoveredCount],
                    ['入队', run.createdCount],
                    ['更新', run.updatedCount],
                    ['跳过', run.skippedCount],
                    ['失败', run.failedCount],
                  ].map(([label, value]) => (
                    <div
                      className="border-border/70 bg-card/78 min-w-16 rounded-[calc(var(--radius)*.75)] border px-3 py-2"
                      key={label}
                    >
                      <p className="text-muted-foreground text-[0.62rem] uppercase">
                        {label}
                      </p>
                      <p className="text-foreground mt-1 text-sm font-semibold">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {run.error ? (
                <p className="border-destructive/25 bg-destructive/7 text-destructive mt-4 rounded-[calc(var(--radius)*.75)] border px-3 py-2 text-xs leading-5">
                  {run.error}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminCrawlerShell({ data, feedback }: AdminCrawlerShellProps) {
  const stats = [
    { label: '启用来源', value: data.stats.enabledSources },
    { label: '待审核', value: data.stats.pendingDrafts },
    { label: '已发布', value: data.stats.publishedDrafts },
    { label: '失败运行', value: data.stats.failedRuns },
  ];

  return (
    <main className="relative isolate overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_300px]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  Catalog crawler
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  人工发布
                </span>
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  谷库采集
                </p>
                <h1 className="font-heading text-foreground text-5xl leading-[0.94] text-balance sm:text-6xl">
                  让新品先进入审核台
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_74%,var(--background))]">
                  只扫描明确授权的公开页面，自动整理新 SKU
                  与官图；任何内容都必须经管理员修改确认后才会进入谷库。
                </p>
              </div>
            </div>

            <aside className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                固定计划
              </p>
              <p className="text-foreground mt-3 text-2xl font-semibold">
                10:00 · 22:00
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Asia/Shanghai，每天两次。也可以从来源列表手动补扫。
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link
                  className="text-foreground hover:text-primary"
                  href="/admin"
                >
                  管理总览
                </Link>
                <Link
                  className="text-foreground hover:text-primary"
                  href="/admin/goods"
                >
                  商品库
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((item) => (
            <article
              className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-4"
              key={item.label}
            >
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                {item.label}
              </p>
              <p className="text-foreground mt-2 text-3xl font-semibold">
                {item.value}
              </p>
            </article>
          ))}
        </section>

        <nav
          aria-label="采集工作台视图"
          className="border-border/70 bg-background/78 flex gap-1 overflow-x-auto rounded-[var(--radius)] border p-1.5"
        >
          {viewOptions.map((option) => {
            const isActive = data.view === option.key;

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-fit flex-1 rounded-[calc(var(--radius)*.72)] px-4 py-2.5 text-center text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.98] ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                href={`/admin/crawler?view=${option.key}`}
                key={option.key}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>

        {feedback ? (
          <div
            className={`rounded-[var(--radius)] border px-4 py-3 text-sm ${
              feedback.tone === 'success'
                ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200'
                : 'border-destructive/30 bg-destructive/8 text-destructive'
            }`}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </div>
        ) : null}

        {data.view === 'sources' ? <SourcesView data={data} /> : null}
        {data.view === 'drafts' ? <DraftsView data={data} /> : null}
        {data.view === 'runs' ? <RunsView data={data} /> : null}
      </div>
    </main>
  );
}
