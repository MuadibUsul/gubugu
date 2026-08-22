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
    <main className="mx-auto w-full max-w-[980px] px-5 pt-14 pb-24 md:px-10">
      <section className="border-border border-b pb-12">
        <p className="lbl">关注</p>
        <h1 className="mt-3 text-[clamp(28px,3.8vw,44px)]">收藏动态</h1>
      </section>
      <section className="py-8">
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
