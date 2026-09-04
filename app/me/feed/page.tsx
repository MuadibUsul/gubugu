import type { Metadata } from 'next';
import Link from 'next/link';

import { formatCatalogDate } from '@/lib/formatters';
import { requireAuthUser } from '@/server/auth/session';
import { listFollowingFeed } from '@/server/data/feed';

export const metadata: Metadata = { title: '关注动态 · 谷布谷图鉴' };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuthUser('/me/feed');
  const rawPage = (await searchParams).page;
  const page = Math.max(
    1,
    Number(Array.isArray(rawPage) ? rawPage[0] : rawPage) || 1,
  );
  const items = await listFollowingFeed({ userId: user.id, page });
  return (
    <main className="mx-auto w-full px-4 pt-4 pb-24 sm:px-6">
      <div className="border-b border-[var(--rule-2)] pb-3">
        <h1 className="text-[19px] font-bold">谷友动态</h1>
        <p className="text-muted-foreground mt-1 text-[12px]">
          你关注的谷友最近的点亮与换谷。
        </p>
      </div>
      <section className="py-5">
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article className="panel p-5" key={item.id}>
                <p className="text-sm">
                  <Link
                    className="font-medium hover:text-[var(--shu)]"
                    href={`/users/${item.handle}`}
                  >
                    {item.author}
                  </Link>{' '}
                  分享了「
                  <Link
                    className="hover:text-[var(--shu)]"
                    href={`/goods/${item.goodsSlug}`}
                  >
                    {item.goodsName}
                  </Link>
                  」
                </p>
                <p className="mt-3 text-sm leading-7">{item.body}</p>
                <p className="num mt-3">{formatCatalogDate(item.createdAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>关注动态还是空的</strong>
            关注收藏者后，他们审核通过的收藏笔记会出现在这里。
          </div>
        )}
        <div className="mt-6 flex gap-4 text-sm">
          {page > 1 ? (
            <Link href={`/me/feed?page=${page - 1}`}>← 上一页</Link>
          ) : null}
          {items.length === 24 ? (
            <Link href={`/me/feed?page=${page + 1}`}>下一页 →</Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
