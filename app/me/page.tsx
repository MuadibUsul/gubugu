import type { Metadata } from 'next';
import Link from 'next/link';

import { getAdminRoleForUser } from '@/lib/admin-access';
import { signOutAction } from '@/server/auth/actions';
import { requireAuthUser } from '@/server/auth/session';
import { listExchangesForUser } from '@/server/data/exchanges';
import { getFollowNetwork } from '@/server/data/follows';
import { countUnreadMessages } from '@/server/data/messages';
import { listNotificationsForUser } from '@/server/data/notifications';

export const metadata: Metadata = { title: '我的 · 谷布谷图鉴' };

function readPage(value: string | string[] | undefined) {
  return Math.max(1, Number(Array.isArray(value) ? value[0] : value) || 1);
}

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuthUser('/me');
  const query = await searchParams;
  const followingPage = readPage(query.followingPage);
  const followersPage = readPage(query.followersPage);
  const [network, role, exchanges, notifications, unreadMessages] =
    await Promise.all([
      getFollowNetwork(user.id, { followingPage, followersPage }),
      Promise.resolve(getAdminRoleForUser(user)),
      listExchangesForUser({ userId: user.id, limit: 24 }),
      listNotificationsForUser({ userId: user.id, limit: 48 }),
      countUnreadMessages(user.id),
    ]);
  const activeExchangeCount = exchanges.filter(
    (item) => !['completed', 'cancelled'].includes(item.status),
  ).length;
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const primaryEntries = [
    {
      href: '/me/collection',
      label: '我的谷柜',
      note: '管理拥有、想要与可换数量',
      metric: '→',
      mark: '♡',
      tone: 'bg-[var(--shu-soft)] text-[var(--shu)]',
    },
    {
      href: '/me/exchanges',
      label: '待处理换谷',
      note: activeExchangeCount ? '继续确认提案与履约' : '目前没有待处理事项',
      metric: String(activeExchangeCount),
      mark: '⇄',
      tone: 'bg-[var(--violet-soft)] text-[var(--violet)]',
    },
    {
      href: '/me/messages',
      label: '私信',
      note: unreadMessages ? '有新的沟通待查看' : '沟通品相与履约细节',
      metric: String(unreadMessages),
      mark: '✉',
      tone: 'bg-[var(--sky-soft)] text-[var(--sky)]',
    },
    {
      href: '/me/notifications',
      label: '未读通知',
      note: unreadCount ? '查看匹配与处理结果' : '已全部读完',
      metric: String(unreadCount),
      mark: '✦',
      tone: 'bg-[var(--kin-soft)] text-[var(--ink)]',
    },
  ] as const;

  const renderPeople = ({
    title,
    items,
    page,
    total,
    pageKey,
    otherPageKey,
    otherPage,
  }: {
    title: string;
    items: typeof network.following;
    page: number;
    total: number;
    pageKey: 'followingPage' | 'followersPage';
    otherPageKey: 'followingPage' | 'followersPage';
    otherPage: number;
  }) => (
    <section className="min-w-0">
      <h2 className="text-[20px]">
        {title} · {total}
      </h2>
      <div className="mt-4 space-y-2.5">
        {items.length ? (
          items.map((item) => (
            <Link
              className="panel-float flex items-center gap-3 rounded-[16px] border border-[var(--rule)] bg-[var(--surface)] p-3.5 text-sm"
              href={`/users/${item.handle}`}
              key={item.userId}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-[var(--violet-soft)] font-bold text-[var(--violet)]">
                {item.displayName.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {item.displayName}
                </span>
                <span className="num mt-0.5 block">@{item.handle}</span>
              </span>
              <span className="ml-auto text-[var(--shu)]">→</span>
            </Link>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">暂无</p>
        )}
      </div>
      {total > network.pageSize ? (
        <nav aria-label={`${title}分页`} className="mt-4 flex gap-4 text-sm">
          {page > 1 ? (
            <Link
              href={`/me?${new URLSearchParams({
                [pageKey]: String(page - 1),
                [otherPageKey]: String(otherPage),
              })}`}
            >
              ← 上一页
            </Link>
          ) : null}
          {page * network.pageSize < total ? (
            <Link
              href={`/me?${new URLSearchParams({
                [pageKey]: String(page + 1),
                [otherPageKey]: String(otherPage),
              })}`}
            >
              下一页 →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );

  return (
    <main className="mx-auto w-full px-4 pt-4 pb-24 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--shu-soft)] text-[18px] font-bold text-[var(--shu)]">
          {user.displayLabel.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-bold">
            {user.displayLabel}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            今天也来整理喜欢的东西。
          </p>
        </div>
        <form action={signOutAction}>
          <button
            className="text-muted-foreground rounded-[3px] border border-[var(--rule)] px-3 py-1.5 text-[12px] hover:text-[var(--shu)]"
            type="submit"
          >
            退出
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-3 py-5 lg:grid-cols-4">
        {primaryEntries.map((entry) => (
          <Link
            className="panel-float group rounded-[20px] border border-[var(--rule)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
            href={entry.href}
            key={entry.href}
          >
            <div className="flex items-start gap-4">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-[14px] text-xl font-bold ${entry.tone}`}
              >
                {entry.mark}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block">{entry.label}</strong>
                <span className="text-muted-foreground mt-2 block text-sm">
                  {entry.note}
                </span>
              </span>
              <span className="font-heading text-2xl text-[var(--shu)]">
                {entry.metric}
              </span>
            </div>
          </Link>
        ))}
      </section>

      <nav
        aria-label="账户设置"
        className="flex flex-wrap gap-2 rounded-[18px] border border-[var(--rule)] bg-[var(--surface)] p-3 text-sm shadow-[var(--shadow-card)]"
      >
        <Link
          className="rounded-full px-4 py-2 hover:bg-[var(--shu-soft)]"
          href="/me/profile"
        >
          编辑资料
        </Link>
        <Link
          className="rounded-full px-4 py-2 hover:bg-[var(--shu-soft)]"
          href="/me/feed"
        >
          关注动态
        </Link>
        {role ? (
          <Link
            className="rounded-full px-4 py-2 hover:bg-[var(--shu-soft)]"
            href="/admin"
          >
            {role === 'admin' ? '内容后台' : '审核队列'}
          </Link>
        ) : null}
      </nav>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        {renderPeople({
          title: '我关注的',
          items: network.following,
          page: network.followingPage,
          total: network.followingTotal,
          pageKey: 'followingPage',
          otherPageKey: 'followersPage',
          otherPage: network.followersPage,
        })}
        {renderPeople({
          title: '关注我的',
          items: network.followers,
          page: network.followersPage,
          total: network.followersTotal,
          pageKey: 'followersPage',
          otherPageKey: 'followingPage',
          otherPage: network.followingPage,
        })}
      </section>
    </main>
  );
}
