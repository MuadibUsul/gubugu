import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  buildAdminGoodsManagementHref,
  getAdminGoodsPublicationStatusLabel,
  getAdminGoodsStatusBadgeClass,
} from '@/lib/admin-goods';
import type { AdminGoodsRecord } from '@/server/data';

type AdminGoodsTableProps = {
  items: AdminGoodsRecord[];
  totalGoods: number;
  publishedGoods: number;
  draftGoods: number;
  archivedGoods: number;
};

function formatDateLabel(value: Date) {
  return value.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusBadgeClassName =
  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize';

export function AdminGoodsTable({
  items,
  totalGoods,
  publishedGoods,
  draftGoods,
  archivedGoods,
}: AdminGoodsTableProps) {
  const summaryItems = [
    {
      label: '商品总数',
      value: totalGoods,
    },
    {
      label: '已发布',
      value: publishedGoods,
    },
    {
      label: '草稿',
      value: draftGoods,
    },
    {
      label: '已归档',
      value: archivedGoods,
    },
  ];

  return (
    <section className="collection-panel overflow-hidden p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.32em] uppercase">
              商品数据管理
            </p>
            <h2 className="font-heading text-foreground text-4xl leading-none">
              SKU 条目看板
            </h2>
            <p className="text-muted-foreground max-w-3xl text-sm leading-7">
              这是当前 SKU 手动录入的工作台。表格已针对快速扫读优化，并直接串联创建、编辑、标签与图片管理流程。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={buildAdminGoodsManagementHref({}, { mode: 'create' })}>
                新建商品条目
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={buildAdminGoodsManagementHref({})}>打开条目页</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              className="border-border/70 bg-background/78 rounded-[1.3rem] border px-4 py-4"
              key={item.label}
            >
              <p className="text-muted-foreground text-[0.65rem] tracking-[0.24em] uppercase">
                {item.label}
              </p>
              <p className="text-foreground mt-2 text-2xl font-semibold">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="border-border/70 overflow-hidden rounded-[1.8rem] border">
          <div className="grid grid-cols-[140px_minmax(260px,1.4fr)_minmax(220px,1fr)_120px_112px] gap-4 border-b border-[color:color-mix(in_oklab,var(--border)_82%,white)] bg-[color:color-mix(in_oklab,var(--card)_84%,white)] px-4 py-3 text-[0.68rem] font-semibold tracking-[0.2em] text-[color:color-mix(in_oklab,var(--foreground)_62%,var(--background))] uppercase">
            <span>SKU</span>
            <span>商品</span>
            <span>上下文</span>
            <span>状态</span>
            <span>更新</span>
          </div>

          {items.length === 0 ? (
            <div className="bg-background/78 px-4 py-10 text-sm leading-7 text-[color:color-mix(in_oklab,var(--foreground)_70%,var(--background))]">
              暂无商品记录。请先在专用条目录入页创建第一条 SKU 数据。
            </div>
          ) : (
            <div className="divide-y divide-[color:color-mix(in_oklab,var(--border)_68%,white)]">
              {items.map((item) => (
                <article
                  className="bg-background/74 grid grid-cols-1 gap-4 px-4 py-4 transition-colors hover:bg-[color:color-mix(in_oklab,var(--accent)_5%,white)] lg:grid-cols-[140px_minmax(260px,1.4fr)_minmax(220px,1fr)_120px_112px]"
                  key={item.id}
                >
                  <div className="space-y-1">
                    <p className="text-foreground text-sm font-semibold">
                      {item.skuCode}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.goodsType}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-foreground text-sm leading-6 font-semibold">
                        {item.name}
                      </p>
                      <p className="text-muted-foreground text-sm leading-6">
                        {item.characterNames.length > 0
                          ? item.characterNames.join(' / ')
                          : '暂未关联角色'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/goods/${item.slug}`}>打开商品页</Link>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <Link
                          href={buildAdminGoodsManagementHref(
                            {},
                            {
                              goodsId: item.id,
                            },
                          )}
                        >
                          编辑记录
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-foreground text-sm font-semibold">
                      {item.seriesName}
                    </p>
                    <p className="text-muted-foreground text-sm">{item.ipName}</p>
                  </div>

                  <div>
                    <span
                      className={`${getAdminGoodsStatusBadgeClass(item.status)} ${statusBadgeClassName}`}
                    >
                      {getAdminGoodsPublicationStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="text-sm text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))]">
                    {formatDateLabel(item.updatedAt)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
