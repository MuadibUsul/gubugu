import Link from 'next/link';

import type { AdminRole } from '@/lib/admin-access';
import type { AdminDashboardData } from '@/server/data';

export function AdminShell({
  data,
  viewer,
}: {
  data: AdminDashboardData;
  viewer: { displayLabel: string; adminRole: AdminRole };
}) {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 py-14 md:px-10">
      <section className="border-border border-b pb-10">
        <p className="lbl">后台</p>
        <h1 className="mt-3 text-[clamp(28px,3.8vw,44px)]">内容管理</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          {viewer.displayLabel} ·{' '}
          {viewer.adminRole === 'admin' ? '管理员' : '审核员'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {viewer.adminRole === 'admin' ? (
            <>
              <Link
                className="rounded border px-4 py-2 text-sm"
                href="/admin/catalog"
              >
                管理图鉴
              </Link>
              <Link
                className="rounded border px-4 py-2 text-sm"
                href="/admin/crawler"
              >
                爬虫采集
              </Link>
              <Link
                className="rounded border px-4 py-2 text-sm"
                href="/admin/design-preview"
              >
                UI / VI 样板
              </Link>
            </>
          ) : null}
          <Link
            className="rounded border px-4 py-2 text-sm"
            href="/admin/moderation"
          >
            审核与举报
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 py-10 sm:grid-cols-4">
        {data.statistics.map((item) => (
          <article className="panel p-5" key={item.key}>
            <p className="text-muted-foreground text-sm">{item.label}</p>
            <p className="font-heading mt-2 text-3xl">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="border-border border-t pt-10">
        <h2 className="text-2xl">最近更新的 SKU</h2>
        <div className="mt-4 divide-y">
          {data.recentGoods.map((item) => (
            <Link
              className="flex items-center justify-between gap-4 py-4 text-sm"
              href={`/goods/${item.slug}`}
              key={item.id}
            >
              <span>{item.name}</span>
              <span className="text-muted-foreground shrink-0">
                {item.skuCode} · {item.status}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
