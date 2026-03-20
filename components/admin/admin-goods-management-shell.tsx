import Link from 'next/link';

import { AdminGoodsEditorForm } from '@/components/admin/admin-goods-editor-form';
import { Button } from '@/components/ui/button';
import {
  buildAdminGoodsManagementHref,
  getAdminGoodsPublicationStatusLabel,
  getAdminGoodsStatusBadgeClass,
} from '@/lib/admin-goods';
import { formatCatalogDate } from '@/lib/formatters';
import type { AdminGoodsManagementPageData } from '@/server/data/admin-goods';

type AdminGoodsManagementShellProps = {
  data: AdminGoodsManagementPageData;
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

const statusBadgeClassName =
  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize';
const filterControlClassName =
  'border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 h-11 rounded-[1rem] border px-4 text-sm transition outline-none focus-visible:ring-2';
const selectedListCardClassName =
  'rounded-[1.5rem] border border-[color:color-mix(in_oklab,var(--accent)_58%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_16%,var(--surface-strong)),color-mix(in_oklab,var(--background)_92%,var(--card)))] px-4 py-4 shadow-[0_24px_54px_-36px_color-mix(in_oklab,var(--accent)_42%,transparent),inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)]';

export function AdminGoodsManagementShell({
  data,
}: AdminGoodsManagementShellProps) {
  const selectedGoodsId = data.selectedGoods?.id ?? null;
  const createHref = buildAdminGoodsManagementHref(data.filters, {
    mode: 'create',
  });
  const statItems = [
    {
      label: '商品总数',
      value: data.stats.totalGoods,
    },
    {
      label: '已发布',
      value: data.stats.publishedGoods,
    },
    {
      label: '草稿',
      value: data.stats.draftGoods,
    },
    {
      label: '已归档',
      value: data.stats.archivedGoods,
    },
    {
      label: '无标签',
      value: data.stats.goodsWithoutTags,
    },
    {
      label: '无图片',
      value: data.stats.goodsWithoutImages,
    },
  ];

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_11%,transparent),transparent_64%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--border)_72%,white),transparent)] md:inset-x-10 xl:inset-x-16" />

      <div className="mx-auto flex min-h-screen w-full max-w-[104rem] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.24fr)_320px]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs tracking-[0.22em] uppercase">
                  SKU
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs tracking-[0.22em] uppercase">
                  商品管理
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs tracking-[0.22em] uppercase">
                  内容维护
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
                  商品库
                </p>
                <h1 className="font-heading text-foreground text-5xl leading-[0.94] text-balance sm:text-6xl">
                  维护 SKU 图鉴
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_74%,var(--background))]">
                  在同一工作区内维护商品名称、规格、标签与图片，让公开图鉴、搜索结果和详情页保持一致。
                </p>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="border-border/70 bg-background/78 rounded-[1.7rem] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                  常用入口
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <Link
                    className="text-foreground hover:text-primary"
                    href="/admin"
                  >
                    返回管理总览
                  </Link>
                  <Link
                    className="text-foreground hover:text-primary"
                    href={createHref}
                  >
                    新建商品条目
                  </Link>
                  <Link
                    className="text-foreground hover:text-primary"
                    href="/search"
                  >
                    打开公开搜索
                  </Link>
                </div>
              </div>

              <div className="border-border/70 bg-background/78 rounded-[1.7rem] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                  当前状态
                </p>
                <p className="text-foreground mt-3 text-sm leading-7">
                  {data.mode === 'live'
                    ? '保存后会同步更新商品图鉴、标签与图片内容。'
                    : '当前商品数据暂时不可用，请稍后再试。'}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {statItems.map((item) => (
            <article
              className="border-border/70 bg-background/78 rounded-[1.4rem] border px-5 py-4"
              key={item.label}
            >
              <p className="text-muted-foreground text-[0.68rem] tracking-[0.24em] uppercase">
                {item.label}
              </p>
              <p className="text-foreground mt-2 text-3xl font-semibold">
                {item.value}
              </p>
            </article>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
          <section className="collection-panel p-5 sm:p-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.28em] uppercase">
                    条目列表
                  </p>
                  <h2 className="font-heading text-foreground text-4xl leading-none">
                    商品记录
                  </h2>
                  <p className="text-muted-foreground max-w-2xl text-sm leading-7">
                    先按关键词、状态或系列筛选，再从列表里直接切换到编辑模式。
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={createHref}>新建商品条目</Link>
                  </Button>
                </div>
              </div>

              <form
                action="/admin/goods"
                className="border-border/70 bg-background/76 grid gap-3 rounded-[1.35rem] border px-4 py-4 xl:grid-cols-[minmax(0,1fr)_160px_1fr_auto]"
              >
                <input
                  className={filterControlClassName}
                  defaultValue={data.filters.query ?? ''}
                  name="query"
                  placeholder="搜索 SKU 编号、商品名、slug、IP 或系列"
                  type="search"
                />
                <select
                  className={filterControlClassName}
                  defaultValue={data.filters.status ?? ''}
                  name="status"
                >
                  <option value="">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="archived">已归档</option>
                </select>
                <select
                  className={filterControlClassName}
                  defaultValue={data.filters.seriesId ?? ''}
                  name="seriesId"
                >
                  <option value="">全部系列</option>
                  {data.seriesOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.ip.name} / {option.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" type="submit">
                    筛选
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/goods">重置</Link>
                  </Button>
                </div>
              </form>

              {data.goodsList.length === 0 ? (
                <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[1.4rem] border border-dashed px-4 py-8 text-sm leading-7">
                  当前筛选条件下没有匹配的商品记录。你可以直接在这个页面里新建商品条目。
                </div>
              ) : (
                <div className="space-y-3">
                  {data.goodsList.map((item) => {
                    const isSelected =
                      data.editorMode === 'edit' && selectedGoodsId === item.id;
                    const editHref = buildAdminGoodsManagementHref(
                      data.filters,
                      {
                        goodsId: item.id,
                      },
                    );

                    return (
                      <article
                        className={
                          isSelected
                            ? selectedListCardClassName
                            : 'border-border/70 bg-background/76 rounded-[1.5rem] border px-4 py-4'
                        }
                        key={item.id}
                      >
                        <div className="grid gap-4 2xl:grid-cols-[108px_minmax(0,1fr)_auto]">
                          <div
                            className="border-border/70 bg-card/78 h-28 rounded-[1.15rem] border bg-cover bg-center"
                            style={
                              item.primaryImageUrl
                                ? {
                                    backgroundImage: `url(${item.primaryImageUrl})`,
                                  }
                                : undefined
                            }
                          >
                            {!item.primaryImageUrl ? (
                              <div className="text-muted-foreground flex h-full items-center justify-center text-xs tracking-[0.18em] uppercase">
                                暂无图片
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-foreground text-sm font-semibold">
                                  {item.skuCode}
                                </p>
                                <h3 className="text-foreground text-lg leading-7 font-semibold">
                                  {item.name}
                                </h3>
                                <p className="text-muted-foreground text-sm leading-6">
                                  {item.ip.name} / {item.series.name} /{' '}
                                  {item.goodsType}
                                </p>
                              </div>
                              <span
                                className={`${getAdminGoodsStatusBadgeClass(item.status)} ${statusBadgeClassName}`}
                              >
                                {getAdminGoodsPublicationStatusLabel(item.status)}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {item.tagNames.length > 0 ? (
                                item.tagNames.map((tagName) => (
                                  <span
                                    className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs"
                                    key={`${item.id}-${tagName}`}
                                  >
                                    {tagName}
                                  </span>
                                ))
                              ) : (
                                <span className="border-border/70 text-muted-foreground rounded-full border border-dashed px-3 py-1 text-xs">
                                  暂无标签
                                </span>
                              )}
                            </div>

                            <div className="grid gap-2 text-sm text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:grid-cols-2">
                              <p>
                                发售：{formatCatalogDate(item.releaseDate)}
                              </p>
                              <p>更新：{formatTimestamp(item.updatedAt)}</p>
                              <p>图片：{item.imageCount}</p>
                              <p>标签：{item.tagCount}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-start gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant={isSelected ? 'default' : 'outline'}
                            >
                              <Link href={editHref}>
                                {isSelected ? '编辑中' : '编辑'}
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/goods/${item.slug}`}>
                                打开页面
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <div className="space-y-4">
            {data.selectedGoods ? (
              <section className="border-border/70 bg-background/78 rounded-[1.4rem] border px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.24em] uppercase">
                      当前选中项
                    </p>
                    <p className="text-foreground text-lg leading-7 font-semibold">
                      {data.selectedGoods.ip.name} /{' '}
                      {data.selectedGoods.series.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {data.selectedGoods.skuCode} / {data.selectedGoods.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`${getAdminGoodsStatusBadgeClass(data.selectedGoods.status)} ${statusBadgeClassName}`}
                    >
                      {getAdminGoodsPublicationStatusLabel(
                        data.selectedGoods.status,
                      )}
                    </span>
                    <span className="border-border/70 bg-card/78 text-foreground inline-flex rounded-full border px-3 py-1 text-xs">
                      {data.selectedGoods.tags.length} 个标签
                    </span>
                    <span className="border-border/70 bg-card/78 text-foreground inline-flex rounded-full border px-3 py-1 text-xs">
                      {data.selectedGoods.images.length} 张图片
                    </span>
                  </div>
                </div>
              </section>
            ) : null}

            <AdminGoodsEditorForm
              editorMode={data.editorMode}
              filters={data.filters}
              initialGoods={
                data.editorMode === 'edit' ? data.selectedGoods : null
              }
              key={
                data.editorMode === 'edit'
                  ? (selectedGoodsId ?? 'edit')
                  : 'create'
              }
              seriesOptions={data.seriesOptions}
              tagLibrary={data.tagLibrary}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
