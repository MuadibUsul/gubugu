import Link from 'next/link';

import { AdminCatalogEditorForm } from '@/components/admin/admin-catalog-editor-form';
import { Button } from '@/components/ui/button';
import {
  buildAdminCatalogManagementHref,
  getAdminCatalogEntityLabel,
} from '@/lib/admin-catalog';
import {
  getAdminGoodsPublicationStatusLabel,
  getAdminGoodsStatusBadgeClass,
} from '@/lib/admin-goods';
import { formatCatalogDate } from '@/lib/formatters';
import type { AdminCatalogPageData } from '@/server/data/admin-catalog';

type AdminCatalogManagementShellProps = {
  data: AdminCatalogPageData;
};

const statusBadgeClassName =
  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize';
const filterControlClassName =
  'border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 h-11 rounded-[var(--radius)] border px-4 text-sm transition outline-none focus-visible:ring-2';
const selectedListCardClassName =
  'rounded-[var(--radius)] border border-[color:color-mix(in_oklab,var(--accent)_58%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_16%,var(--surface-strong)),color-mix(in_oklab,var(--background)_92%,var(--card)))] px-4 py-4';

function formatTimestamp(value: Date) {
  return value.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderIpList(data: AdminCatalogPageData) {
  return data.lists.ips.map((item) => {
    const isSelected =
      data.editorMode === 'edit' && data.selected.ip?.id === item.id;
    const editHref = buildAdminCatalogManagementHref(data.filters, {
      recordId: item.id,
    });

    return (
      <article
        className={
          isSelected
            ? selectedListCardClassName
            : 'border-border/70 bg-background/76 rounded-[var(--radius)] border px-4 py-4'
        }
        key={item.id}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-foreground text-lg font-semibold">
                {item.name}
              </p>
              <p className="text-muted-foreground text-sm">{item.slug}</p>
              {item.nameLocalized ? (
                <p className="text-muted-foreground text-sm">
                  {item.nameLocalized}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                {item.characterCount} 个角色
              </span>
              <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                {item.seriesCount} 条系列
              </span>
              <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                {item.goodsCount} 件商品
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              更新：{formatTimestamp(item.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <span
              className={`${getAdminGoodsStatusBadgeClass(item.status)} ${statusBadgeClassName}`}
            >
              {getAdminGoodsPublicationStatusLabel(item.status)}
            </span>
            <Button
              asChild
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
            >
              <Link href={editHref}>{isSelected ? '编辑中' : '编辑'}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/ips/${item.slug}`}>打开页面</Link>
            </Button>
          </div>
        </div>
      </article>
    );
  });
}

function renderCharacterList(data: AdminCatalogPageData) {
  return data.lists.characters.map((item) => {
    const isSelected =
      data.editorMode === 'edit' && data.selected.character?.id === item.id;
    const editHref = buildAdminCatalogManagementHref(data.filters, {
      recordId: item.id,
    });

    return (
      <article
        className={
          isSelected
            ? selectedListCardClassName
            : 'border-border/70 bg-background/76 rounded-[var(--radius)] border px-4 py-4'
        }
        key={item.id}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-foreground text-lg font-semibold">
                {item.name}
              </p>
              <p className="text-muted-foreground text-sm">
                {item.ip.name} / {item.slug}
              </p>
              {item.nameLocalized ? (
                <p className="text-muted-foreground text-sm">
                  {item.nameLocalized}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                {item.goodsCount} 件关联商品
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              更新：{formatTimestamp(item.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <span
              className={`${getAdminGoodsStatusBadgeClass(item.status)} ${statusBadgeClassName}`}
            >
              {getAdminGoodsPublicationStatusLabel(item.status)}
            </span>
            <Button
              asChild
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
            >
              <Link href={editHref}>{isSelected ? '编辑中' : '编辑'}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/ips/${item.ip.slug}/characters/${item.slug}`}>
                打开页面
              </Link>
            </Button>
          </div>
        </div>
      </article>
    );
  });
}

function renderSeriesList(data: AdminCatalogPageData) {
  return data.lists.series.map((item) => {
    const isSelected =
      data.editorMode === 'edit' && data.selected.series?.id === item.id;
    const editHref = buildAdminCatalogManagementHref(data.filters, {
      recordId: item.id,
    });

    return (
      <article
        className={
          isSelected
            ? selectedListCardClassName
            : 'border-border/70 bg-background/76 rounded-[var(--radius)] border px-4 py-4'
        }
        key={item.id}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-foreground text-lg font-semibold">
                {item.name}
              </p>
              <p className="text-muted-foreground text-sm">
                {item.ip.name} / {item.slug}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                {item.seriesType}
              </span>
              <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                {item.goodsCount} 件关联商品
              </span>
              <span className="border-border/70 bg-card/78 text-foreground rounded-full border px-3 py-1 text-xs">
                发售：{formatCatalogDate(item.releaseDate)}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              更新：{formatTimestamp(item.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <span
              className={`${getAdminGoodsStatusBadgeClass(item.status)} ${statusBadgeClassName}`}
            >
              {getAdminGoodsPublicationStatusLabel(item.status)}
            </span>
            <Button
              asChild
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
            >
              <Link href={editHref}>{isSelected ? '编辑中' : '编辑'}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/ips/${item.ip.slug}/series/${item.slug}`}>
                打开页面
              </Link>
            </Button>
          </div>
        </div>
      </article>
    );
  });
}

export function AdminCatalogManagementShell({
  data,
}: AdminCatalogManagementShellProps) {
  const createHref = buildAdminCatalogManagementHref(data.filters, {
    mode: 'create',
  });
  const activeItems =
    data.entity === 'ip'
      ? data.lists.ips
      : data.entity === 'character'
        ? data.lists.characters
        : data.lists.series;
  const activeSelected =
    data.entity === 'ip'
      ? data.selected.ip
      : data.entity === 'character'
        ? data.selected.character
        : data.selected.series;

  return (
    <main className="relative isolate overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col gap-6 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
        <section className="collection-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.24fr)_320px]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  图鉴
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  核心内容
                </span>
                <span className="border-border/70 bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs uppercase">
                  作品关系
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
                  核心图鉴
                </p>
                <h1 className="font-heading text-foreground text-5xl leading-[0.94] text-balance sm:text-6xl">
                  维护 IP、角色与系列
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_74%,var(--background))]">
                  把作品、角色和系列放在同一工作区内维护，能够保证公开图鉴的结构与命名始终保持一致。
                </p>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
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
                    href="/admin/goods"
                  >
                    打开商品库
                  </Link>
                  <Link
                    className="text-foreground hover:text-primary"
                    href={createHref}
                  >
                    新建{getAdminCatalogEntityLabel(data.entity)}
                  </Link>
                </div>
              </div>

              <div className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <p className="text-muted-foreground text-[0.68rem] uppercase">
                  当前状态
                </p>
                <p className="text-foreground mt-3 text-sm leading-7">
                  {data.mode === 'live'
                    ? '保存后会同步更新 IP、角色与系列图鉴内容。'
                    : '当前图鉴数据暂时不可用，请稍后再试。'}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              label: 'IP',
              total: data.stats.totalIps,
              published: data.stats.publishedIps,
            },
            {
              label: '角色',
              total: data.stats.totalCharacters,
              published: data.stats.publishedCharacters,
            },
            {
              label: '系列',
              total: data.stats.totalSeries,
              published: data.stats.publishedSeries,
            },
          ].map((item) => (
            <article
              className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-4"
              key={item.label}
            >
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                {item.label}
              </p>
              <p className="text-foreground mt-2 text-3xl font-semibold">
                {item.total}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                已发布 {item.published}
              </p>
            </article>
          ))}
        </section>

        <section className="collection-panel p-5 sm:p-6">
          <div className="flex flex-wrap gap-3">
            {(['ip', 'character', 'series'] as const).map((entity) => (
              <Button
                asChild
                key={entity}
                variant={data.entity === entity ? 'default' : 'outline'}
              >
                <Link
                  href={buildAdminCatalogManagementHref(data.filters, {
                    entity,
                  })}
                >
                  {getAdminCatalogEntityLabel(entity)}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
          <section className="collection-panel p-5 sm:p-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
                    条目列表
                  </p>
                  <h2 className="font-heading text-foreground text-4xl leading-none">
                    {getAdminCatalogEntityLabel(data.entity)}记录
                  </h2>
                  <p className="text-muted-foreground max-w-2xl text-sm leading-7">
                    先筛选当前实体，再从同一个页面里直接切换到新建或编辑模式。
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={createHref}>
                      新建{getAdminCatalogEntityLabel(data.entity)}
                    </Link>
                  </Button>
                </div>
              </div>

              <form
                action="/admin/catalog"
                className="border-border/70 bg-background/76 grid gap-3 rounded-[var(--radius)] border px-4 py-4 xl:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_auto]"
              >
                <input name="entity" type="hidden" value={data.entity} />
                <input
                  className={filterControlClassName}
                  defaultValue={data.filters.query ?? ''}
                  name="query"
                  placeholder={`搜索${getAdminCatalogEntityLabel(data.entity)}记录`}
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
                {data.entity === 'ip' ? (
                  <div className="border-border/70 bg-background/70 text-muted-foreground flex h-11 items-center rounded-[var(--radius)] border px-4 text-sm">
                    IP 记录本身不使用 IP 筛选
                  </div>
                ) : (
                  <select
                    className={filterControlClassName}
                    defaultValue={data.filters.ipId ?? ''}
                    name="ipId"
                  >
                    <option value="">全部 IP</option>
                    {data.ipOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <Button size="sm" type="submit">
                    筛选
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={buildAdminCatalogManagementHref({
                        entity: data.entity,
                      })}
                    >
                      重置
                    </Link>
                  </Button>
                </div>
              </form>

              {activeItems.length === 0 ? (
                <div className="border-border/70 bg-background/74 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-8 text-sm leading-7">
                  当前筛选条件下没有匹配记录。你可以新建条目，开始补齐这一层图鉴内容。
                </div>
              ) : (
                <div className="space-y-3">
                  {data.entity === 'ip'
                    ? renderIpList(data)
                    : data.entity === 'character'
                      ? renderCharacterList(data)
                      : renderSeriesList(data)}
                </div>
              )}
            </div>
          </section>

          <div className="space-y-4">
            {activeSelected ? (
              <section className="border-border/70 bg-background/78 rounded-[var(--radius)] border px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-[0.7rem] font-semibold uppercase">
                      当前选中项
                    </p>
                    <p className="text-foreground text-lg leading-7 font-semibold">
                      {activeSelected.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {activeSelected.slug}
                    </p>
                  </div>
                  <span
                    className={`${getAdminGoodsStatusBadgeClass(activeSelected.status)} ${statusBadgeClassName}`}
                  >
                    {getAdminGoodsPublicationStatusLabel(activeSelected.status)}
                  </span>
                </div>
              </section>
            ) : null}

            <AdminCatalogEditorForm
              editorMode={data.editorMode}
              entity={data.entity}
              filters={data.filters}
              initialCharacter={data.selected.character}
              initialIp={data.selected.ip}
              initialSeries={data.selected.series}
              ipOptions={data.ipOptions}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
