import type { Metadata } from 'next';
import Link from 'next/link';

import { formatCatalogDate } from '@/lib/formatters';
import { requireAuthUser } from '@/server/auth/session';
import { listConversationsForUser } from '@/server/data/messages';

export const metadata: Metadata = { title: '私信 · 谷布谷图鉴' };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuthUser('/me/messages');
  const [conversations, query] = await Promise.all([
    listConversationsForUser({ userId: user.id }),
    searchParams,
  ]);
  const feedback = one(query.message);
  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + (conversation.unreadCount || 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pt-4 pb-24 sm:px-6 md:px-8 md:pt-8">
      <div className="mb-2 flex items-center gap-3 border-b border-[var(--rule-2)] pb-3">
        <Link aria-label="返回" className="flex-none text-[var(--ink-2)]" href="/me">
          <svg width="21" height="21" viewBox="0 0 256 256" fill="currentColor">
            <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
          </svg>
        </Link>
        <h1 className="flex-1 text-[17px] font-bold">私信</h1>
        {totalUnread ? (
          <span className="text-muted-foreground text-[12px]">
            {totalUnread} 条未读
          </span>
        ) : null}
      </div>

      <section className="hidden">
        <p className="section-kicker">一对一沟通</p>
        <h1 className="mt-3 text-[clamp(30px,4vw,44px)]">私信</h1>
        <p className="text-muted-foreground mt-3 max-w-[62ch] text-sm">
          讨论品相、包装和履约细节。正式方案的改变仍要回到换谷协商中提交。
        </p>
      </section>

      {feedback ? (
        <p className="callout mt-5 text-sm" role="status">
          {feedback === 'blocked'
            ? '任一方已屏蔽对方，不能建立或继续私信。'
            : feedback === 'unavailable'
              ? '当前资料或交易关系不允许发起这条私信。'
              : '私信请求无效，请重新进入。'}
        </p>
      ) : null}

      <section className="py-8">
        {conversations.length ? (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <Link
                className="panel-float grid min-w-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--rule)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
                href={`/me/messages/${conversation.id}`}
                key={conversation.id}
              >
                <span className="grid size-12 place-items-center rounded-[15px] bg-[linear-gradient(145deg,var(--sky),var(--violet))] font-bold text-white">
                  {conversation.partnerLabel.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <strong className="truncate">
                      {conversation.partnerLabel}
                    </strong>
                    {conversation.unreadCount ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-[var(--shu)] px-1.5 text-[10px] font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground mt-1 block truncate text-[12px]">
                    {conversation.latestMessage
                      ? `${conversation.latestMessageIsOwn ? '你：' : ''}${conversation.latestMessage}`
                      : '会话已建立，尚未发送消息'}
                  </span>
                </span>
                <span className="num shrink-0 text-right">
                  {conversation.latestMessageAt
                    ? formatCatalogDate(conversation.latestMessageAt)
                    : '新会话'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>还没有私信</strong>
            可以从收藏者主页、换谷帖、协商详情或换谷单联系对方。
          </div>
        )}
      </section>
    </main>
  );
}
