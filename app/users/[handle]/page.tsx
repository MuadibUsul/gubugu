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

function StatTile({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-[14px] border border-white/20 bg-white/[0.08] px-3 py-3.5 text-center">
      <span className={`num block text-[26px] leading-none font-extrabold ${tone}`}>
        {value}
      </span>
      <span className="mt-1.5 block text-[11px] font-semibold text-white/80">
        {label}
      </span>
    </div>
  );
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
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      {/* 二次元橱窗式主页头图：饱和渐变 + 光晕，展陈这位收藏者的身份与战绩。 */}
      <section className="relative isolate overflow-hidden rounded-[22px] p-6 text-[var(--paper)] shadow-[var(--shadow-card)] sm:p-9 lg:p-11">
        {/* 青黛档案封面：深靛底、亚光，不用发光与强渐变。 */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(155deg,var(--violet),color-mix(in_oklab,var(--violet)_60%,var(--ink)))]" />
        <div className="absolute inset-0 -z-10 border border-white/10" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="font-heading grid size-24 shrink-0 place-items-center rounded-[20px] bg-white/12 text-[44px] font-black ring-1 ring-white/30 sm:size-28">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            {profile.accentTitle ? (
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-bold tracking-wide">
                ✦ {profile.accentTitle}
              </span>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-heading text-[clamp(30px,4.4vw,50px)] leading-[1.06] font-black">
                {profile.displayName}
              </h1>
              <Link
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-white/20"
                href={`/users/${profile.handle}/badges`}
              >
                🏅 徽章 {badgeCount} →
              </Link>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/85">
              <span className="num">{formatProfileHandle(profile.handle)}</span>
              {profile.city ? <span>· {profile.city}</span> : null}
              <span>
                · {followCounts.followers} 关注者 · {reputation.reviewCount} 条评价
              </span>
            </p>
            {profile.bio ? (
              <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-white/90">
                {profile.bio}
              </p>
            ) : null}

            {viewer && !isSelf ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <FollowButton
                  followingId={profile.userId}
                  isFollowing={following}
                  nextPath={`/users/${profile.handle}`}
                />
                <form action={startConversationAction}>
                  <input
                    name="recipientId"
                    type="hidden"
                    value={profile.userId}
                  />
                  <input name="contextType" type="hidden" value="profile" />
                  <input
                    name="nextPath"
                    type="hidden"
                    value={`/users/${profile.handle}`}
                  />
                  <Button type="submit" variant="outline">
                    私信
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-5">
          {statTiles.map((tile) => (
            <StatTile
              key={tile.label}
              label={tile.label}
              tone={tile.tone}
              value={tile.value}
            />
          ))}
        </div>
      </section>

      {/* 换谷板：TA 公开的换谷帖，点开任意一件即可按发布者规则发起换谷。 */}
      {listings.length > 0 ? (
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="section-kicker">可换 · 换谷板</p>
              <h2 className="mt-2 text-[clamp(22px,3vw,32px)]">TA 的换谷板</h2>
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
          <h2 className="mt-2 mb-7 text-[clamp(22px,3vw,32px)]">收藏清单</h2>
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
