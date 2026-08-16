import Link from 'next/link';

import { AdminGoodsTable } from '@/components/admin/admin-goods-table';
import { AdminReviewPanel } from '@/components/admin/admin-review-panel';
import { AdminStatCard } from '@/components/admin/admin-stat-card';
import { Button } from '@/components/ui/button';
import type { AdminRole } from '@/lib/admin-access';
import type { AdminDashboardData } from '@/server/data';

type AdminShellProps = {
  data: AdminDashboardData;
  viewer: {
    displayLabel: string;
    adminRole: AdminRole;
  };
};

function formatTimestamp(value: Date) {
  return value.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getListStatusClass(value: string) {
  switch (value) {
    case 'visible':
    case 'open':
      return 'border-[color:color-mix(in_oklab,var(--accent)_42%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_8%,white)] text-foreground';
    case 'hidden':
    case 'paused':
      return 'border-[color:color-mix(in_oklab,var(--primary)_26%,var(--border))] bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] text-foreground';
    case 'closed':
      return 'border-border/70 bg-card/80 text-muted-foreground';
    default:
      return 'border-border/70 bg-card/80 text-muted-foreground';
  }
}

function getAdminRoleLabel(role: AdminRole) {
  return role === 'admin' ? '内容管理' : '审核权限';
}

function getListStatusLabel(value: string) {
  switch (value) {
    case 'visible':
      return '公开中';
    case 'hidden':
      return '已隐藏';
    case 'open':
      return '进行中';
    case 'paused':
      return '已暂停';
    case 'closed':
      return '已关闭';
    default:
      return value;
  }
}

export function AdminShell({ data, viewer }: AdminShellProps) {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_11%,transparent),transparent_64%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--border)_72%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[96rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  内容中台
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  管理总览
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  {getAdminRoleLabel(viewer.adminRole)}
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs">
                  {viewer.displayLabel}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  内容管理中心
                </p>
                <h1 className="font-heading text-foreground max-w-5xl text-5xl leading-[0.94] text-balance sm:text-6xl">
                  管理图鉴、商品与审核流程
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_74%,var(--background))]">
                  这里集中处理商品条目、图鉴关系与审核结果，让公开站点展示与后台维护保持同一套内容来源。
                </p>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  模块地图
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <a
                    className="text-foreground hover:text-primary"
                    href="#goods-management"
                  >
                    01. 商品数据管理
                  </a>
                  <Link
                    className="text-foreground hover:text-primary"
                    href="/admin/goods"
                  >
                    01A. 打开商品库
                  </Link>
                  <Link
                    className="text-foreground hover:text-primary"
                    href="/admin/catalog"
                  >
                    01B. 打开图鉴库
                  </Link>
                  <a
                    className="text-foreground hover:text-primary"
                    href="#user-submissions"
                  >
                    02. 用户投稿审核
                  </a>
                  <a
                    className="text-foreground hover:text-primary"
                    href="#comment-moderation"
                  >
                    03. 评论审核
                  </a>
                  <Link
                    className="text-foreground hover:text-primary"
                    href="/admin/moderation"
                  >
                    03A. 打开审核队列
                  </Link>
                  <a
                    className="text-foreground hover:text-primary"
                    href="#exchange-moderation"
                  >
                    04. 交换审核
                  </a>
                </div>
              </div>

              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  当前状态
                </p>
                <p className="text-foreground mt-3 text-sm leading-7">
                  {data.mode === 'live'
                    ? '这里汇总商品、内容与交换线索的最新概况。'
                    : '当前管理总览暂时不可用，页面已切换为简版概览。'}
                </p>
                <p className="text-muted-foreground mt-3 text-sm">
                  快照生成时间：{formatTimestamp(data.generatedAt)}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {data.statistics.map((stat) => (
            <AdminStatCard key={stat.key} stat={stat} />
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_320px]">
          <div id="goods-management">
            <AdminGoodsTable
              archivedGoods={data.goodsManagement.archivedGoods}
              draftGoods={data.goodsManagement.draftGoods}
              items={data.goodsManagement.items}
              publishedGoods={data.goodsManagement.publishedGoods}
              totalGoods={data.goodsManagement.totalGoods}
            />
          </div>

          <aside className="collection-panel p-5 sm:p-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  维护范围
                </p>
                <h2 className="font-heading text-foreground text-3xl leading-none">
                  当前管理范围
                </h2>
                <p className="text-muted-foreground text-sm leading-7">
                  从这里可以快速进入商品维护、图鉴维护、审核队列和公开搜索。
                </p>
              </div>

              <div className="grid gap-3">
                <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4">
                  <p className="text-muted-foreground text-[0.65rem] uppercase">
                    商品操作
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-7">
                    维护 SKU 名称、标签、状态与图片资源。
                  </p>
                </div>
                <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4">
                  <p className="text-muted-foreground text-[0.65rem] uppercase">
                    图鉴操作
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-7">
                    维护作品、角色和系列之间的图鉴关系。
                  </p>
                </div>
                <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4">
                  <p className="text-muted-foreground text-[0.65rem] uppercase">
                    审核
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-7">
                    审核评论、图片、交换意向与图鉴提案。
                  </p>
                </div>
                <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4">
                  <p className="text-muted-foreground text-[0.65rem] uppercase">
                    权限模型
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-7">
                    不同角色会自动进入对应的管理与审核入口。
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="sm">
                  <Link href="/admin/goods">打开商品库</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/catalog">打开图鉴库</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/moderation">打开审核队列</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/search">打开公开搜索</Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>

        <section className="grid gap-6 xl:grid-cols-3">
          <div id="user-submissions">
            <AdminReviewPanel
              description="这里会预览带图片的用户投稿，这些内容现在可以直接送进独立审核队列。"
              emptyLabel="当前快照里没有带图片的用户投稿。"
              eyebrow="用户投稿审核"
              hasItems={data.userSubmissions.items.length > 0}
              metrics={[
                {
                  label: '待审核',
                  value: data.userSubmissions.pendingCount,
                },
                {
                  label: '公开可见图片',
                  value: data.userSubmissions.liveVisiblePhotoCount,
                },
              ]}
              note="带图内容会在审核通过后进入公开展示。"
              title="投稿队列"
            >
              {data.userSubmissions.items.map((item) => (
                <article
                  className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        className="text-foreground hover:text-primary text-sm font-semibold"
                        href={`/goods/${item.goodsSlug}`}
                      >
                        {item.goodsName}
                      </Link>
                      <p className="text-muted-foreground text-sm leading-6">
                        {item.excerpt}
                      </p>
                    </div>
                    <span
                      className={`${getListStatusClass(item.status)} rounded-full border px-3 py-1 text-xs font-semibold capitalize`}
                    >
                      {getListStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[color:color-mix(in_oklab,var(--foreground)_66%,var(--background))]">
                    <span>{item.imageCount} 张图片</span>
                    <span>{formatTimestamp(item.createdAt)}</span>
                  </div>
                </article>
              ))}
            </AdminReviewPanel>
          </div>

          <div id="comment-moderation">
            <AdminReviewPanel
              description="评论审核会在总览页保持可见，更深入的处理动作则放在专门的审核队列中。"
              emptyLabel="当前快照里没有可处理的评论。"
              eyebrow="评论审核"
              hasItems={data.commentModeration.items.length > 0}
              metrics={[
                {
                  label: '待审核',
                  value: data.commentModeration.pendingCount,
                },
                {
                  label: '显示 / 隐藏',
                  value: `${data.commentModeration.visibleCount} / ${data.commentModeration.hiddenCount}`,
                },
              ]}
              note="评论审核通过后，会显示在对应商品页中。"
              title="评论队列"
            >
              {data.commentModeration.items.map((item) => (
                <article
                  className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        className="text-foreground hover:text-primary text-sm font-semibold"
                        href={`/goods/${item.goodsSlug}`}
                      >
                        {item.goodsName}
                      </Link>
                      <p className="text-muted-foreground text-sm leading-6">
                        {item.excerpt}
                      </p>
                    </div>
                    <span
                      className={`${getListStatusClass(item.status)} rounded-full border px-3 py-1 text-xs font-semibold capitalize`}
                    >
                      {getListStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-right text-xs text-[color:color-mix(in_oklab,var(--foreground)_66%,var(--background))]">
                    {formatTimestamp(item.createdAt)}
                  </div>
                </article>
              ))}
            </AdminReviewPanel>
          </div>

          <div id="exchange-moderation">
            <AdminReviewPanel
              description="这里仅审核交换意向层的数据。任何交易行为都仍然明确排除在当前范围之外。"
              emptyLabel="当前快照里没有可处理的交换意向。"
              eyebrow="交换审核"
              hasItems={data.exchangeModeration.items.length > 0}
              metrics={[
                {
                  label: '待审核',
                  value: data.exchangeModeration.pendingCount,
                },
                {
                  label: '进行中 / 已暂停',
                  value: `${data.exchangeModeration.openCount} / ${data.exchangeModeration.pausedCount}`,
                },
              ]}
              note="交换记录只保留意向信息，不包含付款或托管。"
              title="交换意向队列"
            >
              {data.exchangeModeration.items.map((item) => (
                <article
                  className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-4 py-4"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        className="text-foreground hover:text-primary text-sm font-semibold"
                        href={`/goods/${item.goodsSlug}`}
                      >
                        {item.goodsName}
                      </Link>
                      <p className="text-muted-foreground text-sm leading-6">
                        目标：{item.wantedGoodsName ?? '开放目标'} ·{' '}
                        {item.fulfillmentMethod}
                      </p>
                      <p className="text-sm leading-6 text-[color:color-mix(in_oklab,var(--foreground)_70%,var(--background))]">
                        {item.description}
                      </p>
                    </div>
                    <span
                      className={`${getListStatusClass(item.status)} rounded-full border px-3 py-1 text-xs font-semibold capitalize`}
                    >
                      {getListStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-right text-xs text-[color:color-mix(in_oklab,var(--foreground)_66%,var(--background))]">
                    {formatTimestamp(item.createdAt)}
                  </div>
                </article>
              ))}
            </AdminReviewPanel>
          </div>
        </section>
      </div>
    </main>
  );
}
