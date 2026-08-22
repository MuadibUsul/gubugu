import Link from 'next/link';

import { ReportForm } from '@/components/safety/report-form';
import { MessageScrollAnchor } from '@/components/messages/message-scroll-anchor';
import { Button } from '@/components/ui/button';
import { formatCatalogDate } from '@/lib/formatters';
import type { getConversationThread } from '@/server/data/messages';
import {
  sendMessageAction,
  toggleUserBlockAction,
} from '@/server/messages/actions';

type Thread = NonNullable<Awaited<ReturnType<typeof getConversationThread>>>;

export function MessageThread({
  thread,
  viewerId,
  feedback,
  context,
}: {
  thread: Thread;
  viewerId: string;
  feedback?: string;
  context?: {
    type: 'listing' | 'offer' | 'exchange';
    id: string;
    href: string;
    label: string;
  };
}) {
  const blocked = thread.blockedByViewer || thread.blockedByPartner;
  const feedbackText: Record<string, string> = {
    blocked: '你已屏蔽对方，双方都不能继续发送私信或议价。',
    unblocked: '已解除屏蔽。',
    rate_limited: '发送得太快了，请稍后再试。',
    invalid: '消息不能为空，且最多 1000 字。',
  };

  return (
    <div className="grid h-[calc(100dvh-9rem)] max-h-[760px] min-h-[520px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[24px] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <header className="border-b border-[var(--rule)] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="section-kicker">私信</p>
            <h1 className="mt-1 truncate text-[22px]">{thread.partnerLabel}</h1>
            {thread.partnerHandle ? (
              <Link
                className="num mt-1 inline-block hover:text-[var(--shu)]"
                href={`/users/${thread.partnerHandle}`}
              >
                @{thread.partnerHandle}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {context ? (
              <Link
                className="chip px-3 py-2 text-[12px] font-semibold text-[var(--violet)]"
                href={context.href}
              >
                {context.label}
              </Link>
            ) : thread.activeOfferId ? (
              <Link
                className="chip px-3 py-2 text-[12px] font-semibold text-[var(--violet)]"
                href={`/matches/offers/${thread.activeOfferId}`}
              >
                查看当前正式方案
              </Link>
            ) : thread.recentExchangeId ? (
              <Link
                className="chip px-3 py-2 text-[12px] font-semibold text-[var(--exchange)]"
                href="/me/exchanges"
              >
                查看换谷单
              </Link>
            ) : null}
            <form action={toggleUserBlockAction}>
              <input
                name="targetUserId"
                type="hidden"
                value={thread.partnerId}
              />
              <input name="conversationId" type="hidden" value={thread.id} />
              <button
                className="text-muted-foreground min-h-10 rounded-full px-3 text-[12px] hover:bg-[var(--sunken)] hover:text-[var(--destructive)]"
                name="decision"
                type="submit"
                value={thread.blockedByViewer ? 'unblock' : 'block'}
              >
                {thread.blockedByViewer ? '解除屏蔽' : '屏蔽此人'}
              </button>
            </form>
          </div>
        </div>
        <p className="mt-3 rounded-[14px] bg-[var(--sky-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--sky)]">
          私信用于沟通细节；SKU、数量、品相和履约方式的变更，必须通过正式议价提交。
        </p>
        {feedback && feedbackText[feedback] ? (
          <p className="callout mt-3 text-sm" role="status">
            {feedbackText[feedback]}
          </p>
        ) : null}
      </header>

      <section
        aria-label="消息记录"
        className="space-y-4 overflow-y-auto bg-[var(--sunken)]/45 px-4 py-6 sm:px-6"
      >
        {thread.messages.length ? (
          thread.messages.map((message) => {
            const own = message.senderId === viewerId;
            return (
              <article
                className={`flex ${own ? 'justify-end' : 'justify-start'}`}
                key={message.id}
              >
                <div
                  className={`max-w-[84%] sm:max-w-[72%] ${own ? 'text-right' : ''}`}
                >
                  <div
                    className={
                      own
                        ? 'rounded-[18px_18px_5px_18px] bg-[var(--shu)] px-4 py-3 text-left text-sm leading-relaxed break-words whitespace-pre-wrap text-white'
                        : 'rounded-[18px_18px_18px_5px] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3 text-left text-sm leading-relaxed break-words whitespace-pre-wrap'
                    }
                  >
                    {message.body}
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-2 ${own ? 'justify-end' : 'justify-start'}`}
                  >
                    <span className="num">
                      {formatCatalogDate(message.createdAt)}
                    </span>
                    {!own ? (
                      <ReportForm
                        reason="message_harassment"
                        targetId={message.id}
                        targetType="message"
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state mx-auto max-w-md">
            <strong>还没有消息</strong>
            先打个招呼，或直接说明想确认的品相、包装和履约细节。
          </div>
        )}
        <MessageScrollAnchor />
      </section>

      <footer className="border-t border-[var(--rule)] p-4 sm:p-5">
        {blocked ? (
          <p className="rounded-[14px] bg-[var(--sunken)] px-4 py-3 text-center text-sm text-[var(--destructive)]">
            {thread.blockedByViewer
              ? '你已屏蔽对方；解除后才能继续沟通。'
              : '当前会话不能继续发送消息。'}
          </p>
        ) : (
          <form action={sendMessageAction} className="flex items-end gap-3">
            <input name="conversationId" type="hidden" value={thread.id} />
            {context ? (
              <>
                <input name="contextType" type="hidden" value={context.type} />
                <input name="contextId" type="hidden" value={context.id} />
              </>
            ) : null}
            <label className="min-w-0 flex-1">
              <span className="sr-only">私信内容</span>
              <textarea
                className="ui-input min-h-12 w-full resize-y py-3"
                maxLength={1000}
                name="body"
                placeholder="输入私信，最多 1000 字"
                required
                rows={2}
              />
            </label>
            <Button className="min-h-12 shrink-0" type="submit">
              发送
            </Button>
          </form>
        )}
      </footer>
    </div>
  );
}
