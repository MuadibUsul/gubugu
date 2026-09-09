import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';

import { HoloCollectible } from '@/components/collection/holo-collectible';
import { RemoteImage } from '@/components/ui/remote-image';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { requireAuthUser } from '@/server/auth/session';
import {
  getUserProfilePageData,
  type UserProfileGoodsCard,
} from '@/server/data';
import { countUnlockedAchievements } from '@/server/data/achievements';
import { listExchangesForUser } from '@/server/data/exchanges';
import { getFollowCounts } from '@/server/data/follows';
import { countUnreadMessages } from '@/server/data/messages';
import { listNotificationsForUser } from '@/server/data/notifications';
import { listUserScans } from '@/server/data/user-scans';
import { updateUserScanNoteAction } from '@/server/user-scans/actions';

export const metadata: Metadata = {
  title: '我的谷柜',
  description: '当前登录用户的谷柜、完成度与未鉴定收藏。',
};

export const dynamic = 'force-dynamic';

type StatusFilter = 'owned' | 'wanted' | 'exchange';

const statusSchema = z
  .enum(['owned', 'wanted', 'exchange'])
  .default('owned') satisfies z.ZodType<StatusFilter>;

type MyCollectionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// 大数用 1.2k 记法，和设计稿一致。
function fmt(n: number) {
  return n >= 1000
    ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
    : String(n);
}

// 谷柜墙的一格：只放图。**自己的谷柜一律全彩**（点亮/未点亮都不转灰——灰/彩的区
// 别只在别人看你的公开主页时才出现）；点亮的额外加金边 + 静态全息。
function WallCell({
  item,
  status,
}: {
  item: UserProfileGoodsCard;
  status: StatusFilter;
}) {
  const lit = Boolean(item.litAt);
  const artwork = (
    <div className="goods-card__art aspect-[3/4] rounded-[2px]">
      {item.primaryImageUrl ? (
        <RemoteImage
          alt={item.name}
          className="goods-card__art-image"
          sizes="(max-width: 639px) 33vw, (max-width: 1023px) 25vw, (max-width: 1279px) 20vw, 16vw"
          src={item.primaryImageUrl}
        />
      ) : null}
    </div>
  );
  return (
    <Link
      aria-label={`${item.name}，${lit ? '已点亮' : status === 'owned' ? '未点亮' : ''}`}
      className="relative block min-w-0 rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--shu)]"
      href={`/goods/${item.slug}`}
      style={
        status === 'owned' && lit
          ? { boxShadow: '0 0 0 1px var(--kin)' }
          : undefined
      }
    >
      {status === 'owned' && lit ? (
        <HoloCollectible rarityAverage={item.rarityAverage}>
          {artwork}
        </HoloCollectible>
      ) : (
        artwork
      )}
    </Link>
  );
}

export default async function MyCollectionPage({
  searchParams,
}: MyCollectionPageProps) {
  const user = await requireAuthUser('/me/collection');
  const resolved = (await searchParams) ?? {};
  const status = statusSchema.parse(
    getSingleSearchParamValue(resolved.status) ?? undefined,
  );

  const [
    data,
    badgeCount,
    scans,
    follow,
    exchanges,
    unreadMessages,
    notifications,
  ] = await Promise.all([
    getUserProfilePageData({ userId: user.id, viewerMode: 'self' }),
    countUnlockedAchievements(user.id),
    listUserScans(user.id),
    getFollowCounts(user.id),
    listExchangesForUser({ userId: user.id, limit: 24 }),
    countUnreadMessages(user.id),
    listNotificationsForUser({ userId: user.id, limit: 48 }),
  ]);

  const { summary } = data;
  const activeExchangeCount = exchanges.filter(
    (item) => !['completed', 'cancelled'].includes(item.status),
  ).length;
  const unreadNotifCount = notifications.filter((item) => !item.readAt).length;
  const wallItems = data.goods[status];

  const stats = [
    { value: fmt(summary.cabinetCount), label: '谷柜', gold: false },
    { value: fmt(follow.following), label: '关注', gold: false },
    { value: fmt(follow.followers), label: '粉丝', gold: false },
    { value: fmt(badgeCount), label: '徽章', gold: true },
  ];

  const actions = [
    { label: '换谷', count: activeExchangeCount, href: '/matches' },
    { label: '私信', count: unreadMessages, href: '/me/messages' },
    { label: '通知', count: unreadNotifCount, href: '/me/notifications' },
  ];

  const chips: {
    label: string;
    count: number;
    status?: StatusFilter;
    href: string;
  }[] = [
    {
      label: '已点亮',
      count: summary.litCount,
      status: 'owned',
      href: '/me/collection',
    },
    {
      label: '想要',
      count: summary.wantedCount,
      status: 'wanted',
      href: '/me/collection?status=wanted',
    },
    {
      label: '可换',
      count: summary.exchangeCount,
      status: 'exchange',
      href: '/me/collection?status=exchange',
    },
    { label: '未鉴定', count: scans.length, href: '#unverified' },
  ];

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-4 pb-24 sm:px-6 lg:px-0 lg:pt-8">
      {/* 头部：头像 + 名字 + 看公开主页 */}
      <div className="flex items-center gap-3">
        <div className="grid size-[52px] flex-none place-items-center rounded-full bg-[var(--shu-soft)] text-[18px] font-bold text-[var(--shu)]">
          {user.displayLabel.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">{user.displayLabel}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
            {user.handle ? `@${user.handle}` : (user.email ?? '')}
          </p>
        </div>
        {user.handle ? (
          <Link
            className="flex-none rounded-[3px] border border-[var(--rule)] px-3 py-2 text-[12px] text-[var(--ink-2)]"
            href={`/users/${user.handle}`}
          >
            看公开主页
          </Link>
        ) : null}
      </div>

      {/* 统计：谷柜 / 关注 / 粉丝 / 徽章 */}
      <div className="mt-3.5 flex">
        {stats.map((s) => (
          <div className="flex-1 text-center" key={s.label}>
            <p
              className="font-heading text-[16px] leading-none font-semibold"
              style={s.gold ? { color: 'var(--kin)' } : undefined}
            >
              {s.value}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 操作：换谷 / 私信 / 通知 */}
      <div className="mt-4 flex gap-2">
        {actions.map((a) => (
          <Link
            className="flex-1 rounded-[3px] border border-[var(--rule)] py-2.5 text-center text-[12px] text-[var(--ink-2)]"
            href={a.href}
            key={a.label}
          >
            {a.label}
            {a.count ? ` ${a.count}` : ''}
          </Link>
        ))}
      </div>

      {/* 状态胶囊：已点亮 / 想要 / 可换 / 未鉴定 */}
      <div className="mt-[18px] flex gap-1.5 overflow-x-auto border-b border-[var(--rule)] pb-2.5 [scrollbar-width:none]">
        {chips.map((c) => {
          const active = c.status ? c.status === status : false;
          return (
            <Link
              className={`chip flex-none px-[11px] py-[5px] text-[11.5px] ${active ? 'chip--on' : ''}`}
              href={c.href}
              key={c.label}
            >
              {c.label} {c.count}
            </Link>
          );
        })}
      </div>

      {/* 完成度行 */}
      <div className="mt-3 flex items-center gap-2">
        <p className="text-muted-foreground text-[11px]">
          完成度 {summary.litProgressPercentage}% · {summary.trackedGoodsCount}{' '}
          追踪
        </p>
        <span className="h-px flex-1 bg-[var(--rule)]" />
        <Link className="text-[11px] text-[var(--shu)]" href="/me/profile">
          加收藏边框
        </Link>
      </div>

      {/* 谷柜墙：三列，仅图，点亮原色 / 未点亮转灰 */}
      {wallItems.length ? (
        <div className="mt-3 grid grid-cols-3 gap-[5px] sm:grid-cols-4 lg:grid-cols-5 lg:gap-3 xl:grid-cols-6">
          {wallItems.map((item) => (
            <WallCell item={item} key={item.id} status={status} />
          ))}
        </div>
      ) : (
        <div className="empty-state mt-3">
          <strong>这一栏还没有收藏</strong>
          去图鉴里标一下状态，它就会出现在这里。
        </div>
      )}

      {/* 未鉴定收藏 · 仅自己可见 */}
      {scans.length > 0 ? (
        <section
          className="mt-5 border-t border-[var(--rule)] pt-4"
          id="unverified"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-medium">未鉴定收藏 · 仅自己可见</p>
            <span className="text-muted-foreground text-[11px]">
              {scans.length}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {scans.map((scan) => (
              <details
                className="group overflow-hidden rounded-[8px] border border-dashed border-[var(--rule)] bg-[var(--surface)]"
                key={scan.id}
              >
                <summary className="cursor-pointer list-none">
                  <div className="goods-card__art relative aspect-[3/4] rounded-none">
                    <RemoteImage
                      alt="未鉴定收藏"
                      className="goods-card__art-image"
                      privateSource
                      sizes="(max-width: 639px) 50vw, 25vw"
                      src={scan.imageUrl}
                    />
                    <span className="absolute top-1.5 left-1.5 rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      未鉴定
                    </span>
                  </div>
                  <p className="px-3 py-2 text-[12px] font-medium">
                    {scan.note || '未鉴定收藏'}
                    <span className="text-muted-foreground ml-1 group-open:hidden">
                      · 管理
                    </span>
                  </p>
                </summary>
                <form
                  action={updateUserScanNoteAction}
                  className="space-y-2 border-t border-[var(--rule)] p-3"
                >
                  <label className="text-muted-foreground block text-[11px]">
                    私人备注
                    <textarea
                      className="ui-field mt-1 min-h-16 w-full resize-y p-2 text-[12px]"
                      defaultValue={scan.note ?? ''}
                      maxLength={500}
                      name="note"
                      placeholder="记录来源、角色或待核对信息"
                    />
                  </label>
                  <input name="scanId" type="hidden" value={scan.id} />
                  <div className="flex items-center gap-2">
                    <button
                      className="flex-1 rounded-[8px] bg-[var(--shu)] px-3 py-2 text-[12px] font-semibold text-white"
                      type="submit"
                    >
                      保存备注
                    </button>
                    <Link
                      className="rounded-[8px] border border-[var(--rule)] px-3 py-2 text-[12px]"
                      href="/recognition"
                    >
                      重新扫描
                    </Link>
                  </div>
                </form>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
