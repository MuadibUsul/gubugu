import type { Metadata } from 'next';
import Link from 'next/link';

import { formatCatalogDate } from '@/lib/formatters';
import { requireAuthUser } from '@/server/auth/session';
import {
  listNotificationsForUser,
  type NotificationListItem,
} from '@/server/data/notifications';
import { markNotificationReadAction } from '@/server/notifications/actions';

export const metadata: Metadata = { title: '通知 · 谷布谷图鉴' };

const notificationLabel: Record<NotificationListItem['type'], string> = {
  exchange_proposed: '向你发起了换谷提案',
  exchange_accepted: '接受了你的换谷提案',
  exchange_shipping: '确认已寄出换谷物品',
  exchange_received: '确认已收到换谷物品',
  exchange_completed: '完成了本次换谷',
  exchange_cancelled: '取消了本次换谷',
  offer_received: '向你提交了一份换谷出价',
  offer_countered: '更新了换谷方案，轮到你确认',
  offer_accepted: '接受了当前换谷方案',
  offer_declined: '结束了当前换谷协商',
  message_received: '给你发来一条私信',
  watch_available: '发布了你蹲守 SKU 的可换意向',
  report_resolved: '处理了你提交的举报',
};

export default async function NotificationsPage() {
  const user = await requireAuthUser('/me/notifications');
  const notifications = await listNotificationsForUser({ userId: user.id });

  return (
    <main className="mx-auto w-full px-4 pt-4 pb-24 sm:px-6">
      <div className="border-b border-[var(--rule-2)] pb-3">
        <h1 className="text-[19px] font-bold">站内通知</h1>
        <p className="text-muted-foreground mt-1 text-[12px]">
          出价、议价、私信、履约与举报结果都会留在这里。
        </p>
      </div>

      <section className="py-5">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <strong>暂无通知</strong>
            有新的换谷进展时会在这里出现。
          </div>
        ) : (
          <div className="panel divide-border divide-y px-5">
            {notifications.map((notification) => (
              <article
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4"
                key={notification.id}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      notification.readAt
                        ? 'text-muted-foreground text-sm'
                        : 'text-sm font-medium'
                    }
                  >
                    {notification.actorLabel ?? '系统'}
                    {notificationLabel[notification.type]}
                  </p>
                  <p className="num mt-1">
                    {formatCatalogDate(notification.createdAt)}
                  </p>
                </div>
                {notification.exchangeId ? (
                  <Link
                    className="text-[13px] text-[var(--shu)]"
                    href="/me/exchanges"
                  >
                    查看换谷单
                  </Link>
                ) : null}
                {notification.conversationId ? (
                  <Link
                    className="text-[13px] text-[var(--shu)]"
                    href={`/me/messages/${notification.conversationId}`}
                  >
                    查看私信
                  </Link>
                ) : null}
                {[
                  'offer_received',
                  'offer_countered',
                  'offer_accepted',
                  'offer_declined',
                ].includes(notification.type) &&
                typeof notification.payload.offerId === 'string' ? (
                  <Link
                    className="text-[13px] text-[var(--shu)]"
                    href={`/matches/offers/${notification.payload.offerId}`}
                  >
                    查看方案
                  </Link>
                ) : null}
                {notification.type === 'watch_available' &&
                typeof notification.payload.goodsSlug === 'string' ? (
                  <Link
                    className="text-[13px] text-[var(--shu)]"
                    href={`/goods/${notification.payload.goodsSlug}`}
                  >
                    查看 SKU
                  </Link>
                ) : null}
                {!notification.readAt ? (
                  <form action={markNotificationReadAction}>
                    <input
                      name="notificationId"
                      type="hidden"
                      value={notification.id}
                    />
                    <button
                      className="text-muted-foreground hover:text-foreground text-[13px]"
                      type="submit"
                    >
                      已读
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
