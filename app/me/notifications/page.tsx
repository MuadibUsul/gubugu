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
    <main className="mx-auto w-full max-w-[980px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <section className="relative overflow-hidden rounded-[26px] border border-[var(--rule)] bg-[linear-gradient(135deg,var(--kin-soft),color-mix(in_oklab,var(--shu-soft)_70%,var(--surface)))] px-5 py-7 sm:px-8 sm:py-9">
        <p className="section-kicker">与你有关的进展</p>
        <h1 className="mt-3 text-[clamp(30px,4vw,44px)] leading-[1.14]">
          站内通知
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          出价、议价、私信、履约与举报结果都会留在这里。
        </p>
      </section>

      <section className="py-8">
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
