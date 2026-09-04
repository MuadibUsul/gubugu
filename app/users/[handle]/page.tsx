import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { TradeListingCard } from '@/components/exchange/trade-listing-card';
import { FollowButton } from '@/components/user/follow-button';
import { Button } from '@/components/ui/button';
import {
  UserCollectionSheet,
  type CollectionStatusFilter,
} from '@/components/user/user-collection-sheet';
import { UserPhotoStrip } from '@/components/user/user-photo-strip';
import { getUserProfilePageData } from '@/server/data';
import { countUnlockedAchievements } from '@/server/data/achievements';
import { getFollowCounts, isFollowing } from '@/server/data/follows';
import { getUserReputation } from '@/server/data/reputation';
import { resolveBrowsableProfile } from '@/server/data/profile-access';
import { listOpenTradeListings } from '@/server/data/trade';
import { getAuthUser } from '@/server/auth/session';
import { formatProfileHandle } from '@/server/data/profiles';
import { startConversationAction } from '@/server/messages/actions';

type UserPageProps = {
  params: Promise<{
    handle: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const userPageSearchSchema = z.object({
  status: z
    .enum(['owned', 'wanted', 'exchange'])
    .default('owned') satisfies z.ZodType<CollectionStatusFilter>,
});

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await resolveBrowsableProfile(handle, null);

  return {
    title: profile ? `${profile.displayName} 的收藏页` : '用户主页',
    description: profile
      ? `${profile.displayName} 的收藏页、交换板与图片归档。`
      : '收藏者主页',
  };
}

export default async function UserPage({
  params,
  searchParams,
}: UserPageProps) {
  const { handle } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const viewer = await getAuthUser();
  const profile = await resolveBrowsableProfile(handle, viewer?.id ?? null);

  if (!profile) {
    notFound();
  }

  const status = userPageSearchSchema.parse({
    status: getSingleValue(resolvedSearchParams.status),
  }).status;

  const [data, following, reputation, followCounts, badgeCount, listings] =
    await Promise.all([
      getUserProfilePageData({ userId: profile.userId }),
      isFollowing(viewer?.id ?? null, profile.userId),
      getUserReputation(profile.userId),
      getFollowCounts(profile.userId),
      countUnlockedAchievements(profile.userId),
      listOpenTradeListings({ ownerId: profile.userId, limit: 6 }),
    ]);

  const { summary } = data;
  const isSelf = viewer?.id === profile.userId;
  const initial = profile.displayName.slice(0, 1);

  const statTiles = [
    { value: summary.litCount, label: '已点亮', tone: 'text-[var(--kin)]' },
    { value: summary.typeBreadth, label: '品类', tone: 'text-white' },
    { value: summary.cabinetCount, label: '谷柜', tone: 'text-white' },
    { value: badgeCount, label: '徽章', tone: 'text-[var(--kin)]' },
    {
      value: reputation.averageScore ? reputation.averageScore.toFixed(1) : '—',
      label: '换谷信誉',
      tone: 'text-white',
    },
  ] as const;

  return (
    <main className="mx-auto w-full px-4 pt-4 pb-24 sm:px-6">
      {/* 紧凑身份头（抖音/B 站式密度）：小头像 + 名字 + 一行数据，不做大封面。 */}
      <section>
        <div className="flex items-center gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--shu-soft)] text-[20px] font-bold text-[var(--shu)]">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[17px] font-bold">
                {profile.displayName}
              </h1>
              {profile.accentTitle ? (
                <span className="flex-none rounded-[3px] border border-[var(--kin)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--kin)]">
                  {profile.accentTitle}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
              {formatProfileHandle(profile.handle)}
              {profile.city ? ` · ${profile.city}` : ''} ·{' '}
              {followCounts.followers} 粉丝 · {reputation.reviewCount} 评价
            </p>
          </div>
          {viewer && !isSelf ? (
            <div className="flex flex-none items-center gap-2">
              <FollowButton
                followingId={profile.userId}
                isFollowing={following}
                nextPath={`/users/${profile.handle}`}
              />
              <form action={startConversationAction}>
                <input name="recipientId" type="hidden" value={profile.userId} />
                <input name="contextType" type="hidden" value="profile" />
                <input
                  name="nextPath"
                  type="hidden"
                  value={`/users/${profile.handle}`}
                />
                <Button size="sm" type="submit" variant="outline">
                  私信
                </Button>
              </form>
            </div>
          ) : null}
        </div>

        {profile.bio ? (
          <p className="text-muted-foreground mt-2 text-[12px] leading-relaxed">
            {profile.bio}
          </p>
        ) : null}

        {/* 数据条 */}
        <div className="mt-3 flex items-center border-y border-[var(--rule)] py-2.5">
          {statTiles.map((tile) => (
            <Link
              className="flex-1 text-center"
              href={
                tile.label === '徽章'
                  ? `/users/${profile.handle}/badges`
                  : `/users/${profile.handle}`
              }
              key={tile.label}
            >
              <span
                className="font-heading block text-[16px] leading-none font-semibold"
                style={
                  tile.label === '已点亮' || tile.label === '徽章'
                    ? { color: 'var(--kin)' }
                    : undefined
                }
              >
                {tile.value}
              </span>
              <span className="text-muted-foreground mt-1 block text-[11px]">
                {tile.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 换谷板：TA 公开的换谷帖，点开任意一件即可按发布者规则发起换谷。 */}
      {listings.length > 0 ? (
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="section-kicker">可换 · 换谷板</p>
              <h2 className="mt-2 text-[clamp(16px,4.6vw,32px)]">TA 的换谷板</h2>
            </div>
            <Link
              className="text-[13px] font-semibold text-[var(--shu)] hover:underline"
              href="/matches"
            >
              去换谷广场 →
            </Link>
          </div>
          <p className="text-muted-foreground mt-2 text-[13px]">
            看到心仪的，点开任意一件即可发起换谷；成交仍需双方各自确认。
          </p>
          <div className="rule-kin mt-4" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {listings.map((listing) => (
              <TradeListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-14">
        <div className="min-w-0">
          <p className="section-kicker">公开收藏</p>
          <h2 className="mt-2 mb-7 text-[clamp(16px,4.6vw,32px)]">收藏清单</h2>
          <UserCollectionSheet
            basePath={`/users/${profile.handle}`}
            data={data}
            showFrames={profile.collectionFramesPublic}
            status={status}
          />
        </div>
      </section>

      <UserPhotoStrip items={data.recentPhotoEntries} />
    </main>
  );
}
