import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { UserCollectionHeader } from '@/components/user/user-collection-header';
import { FollowButton } from '@/components/user/follow-button';
import { Button } from '@/components/ui/button';
import {
  UserCollectionSheet,
  type CollectionStatusFilter,
} from '@/components/user/user-collection-sheet';
import { UserPhotoStrip } from '@/components/user/user-photo-strip';
import { demoViewers } from '@/lib/config/demo-viewers';
import { canViewProfile } from '@/lib/profile-visibility';
import { getUserProfilePageData } from '@/server/data';
import { getFollowCounts, isFollowing } from '@/server/data/follows';
import { getUserReputation } from '@/server/data/reputation';
import { getAuthUser } from '@/server/auth/session';
import {
  formatProfileHandle,
  getProfileByHandle,
  type ProfileDetail,
} from '@/server/data/profiles';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';
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

// Before profiles existed these pages were addressed by demo viewer key
// (/users/collector). Those URLs still resolve so existing links do not break,
// but the handle is the canonical address.
function resolveDemoViewerFallback(handle: string): ProfileDetail | null {
  const viewer =
    handle in demoViewers
      ? demoViewers[handle as keyof typeof demoViewers]
      : Object.values(demoViewers).find(
          (candidate) => candidate.handle.replace(/^@/, '') === handle,
        );

  if (!viewer) {
    return null;
  }

  return {
    userId: viewer.userId,
    handle: viewer.handle.replace(/^@/, ''),
    displayName: viewer.displayName,
    avatarImageUrl: null,
    bio: viewer.bio,
    city: viewer.city,
    accentTitle: viewer.accentTitle,
    visibility: 'public',
  };
}

/**
 * Returns a profile only when it is publicly browsable, so a non-public row
 * never enters the component scope and cannot leak through the document title
 * or the RSC payload.
 *
 * followers 资料仅对关注者与本人可见；private 只对本人进入页面组件范围。
 */
async function resolveBrowsableProfile(
  handle: string,
  viewerId: string | null,
) {
  let profile: ProfileDetail | null = null;

  try {
    profile = await getProfileByHandle(handle);
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      throw error;
    }
  }

  profile ??= resolveDemoViewerFallback(handle.replace(/^@/, '').toLowerCase());

  if (!profile) return null;
  const isSelf = profile.userId === viewerId;
  const isFollower = isSelf
    ? false
    : await isFollowing(viewerId, profile.userId);

  return canViewProfile(profile.visibility, { isSelf, isFollower })
    ? profile
    : null;
}

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

  const [data, following, reputation, followCounts] = await Promise.all([
    getUserProfilePageData({ userId: profile.userId }),
    isFollowing(viewer?.id ?? null, profile.userId),
    getUserReputation(profile.userId),
    getFollowCounts(profile.userId),
  ]);
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <UserCollectionHeader
        data={data}
        displayName={profile.displayName}
        eyebrow="收藏帖"
        handle={formatProfileHandle(profile.handle)}
        railLabel="收藏者"
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="chip px-3 py-1.5 text-[12px]">
          换谷信誉 {reputation.averageScore?.toFixed(1) ?? '暂无'} ·{' '}
          {reputation.reviewCount} 条评价
        </p>
        <p className="chip px-3 py-1.5 text-[12px]">
          {followCounts.followers} 位关注者 · 关注 {followCounts.following} 人
        </p>
        {viewer && viewer.id !== profile.userId ? (
          <>
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
              <Button type="submit" variant="outline">
                私信
              </Button>
            </form>
          </>
        ) : null}
      </div>

      <section className="py-14">
        <div className="min-w-0">
          <p className="section-kicker">公开收藏</p>
          <h2 className="mt-3 mb-7 text-[clamp(28px,3.4vw,40px)]">收藏清单</h2>
          <UserCollectionSheet
            basePath={`/users/${profile.handle}`}
            data={data}
            status={status}
          />
        </div>
      </section>

      <UserPhotoStrip items={data.recentPhotoEntries} />
    </main>
  );
}
