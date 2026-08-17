import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { UserExchangeListings } from '@/components/user/user-exchange-listings';
import { UserCollectionHeader } from '@/components/user/user-collection-header';
import {
  UserCollectionSheet,
  type CollectionStatusFilter,
} from '@/components/user/user-collection-sheet';
import { UserPhotoStrip } from '@/components/user/user-photo-strip';
import { demoViewers } from '@/lib/config/demo-viewers';
import { getUserProfilePageData } from '@/server/data';
import {
  formatProfileHandle,
  getProfileByHandle,
  type ProfileDetail,
} from '@/server/data/profiles';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

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
 * `followers` has no follow graph yet, so it is treated as private.
 */
async function resolvePublicProfile(handle: string) {
  let profile: ProfileDetail | null = null;

  try {
    profile = await getProfileByHandle(handle);
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      throw error;
    }
  }

  profile ??= resolveDemoViewerFallback(handle.replace(/^@/, '').toLowerCase());

  return profile?.visibility === 'public' ? profile : null;
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await resolvePublicProfile(handle);

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
  const profile = await resolvePublicProfile(handle);

  if (!profile) {
    notFound();
  }

  const status = userPageSearchSchema.parse({
    status: getSingleValue(resolvedSearchParams.status),
  }).status;

  const data = await getUserProfilePageData({
    userId: profile.userId,
  });
  const exchangeEntryGoods =
    data.goods.exchange.length > 0 ? data.goods.exchange : data.goods.owned;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <UserCollectionHeader
        data={data}
        displayName={profile.displayName}
        eyebrow="收藏帖"
        handle={formatProfileHandle(profile.handle)}
        railLabel="收藏者"
      />

      <section className="spread py-14">
        <div>
          <p className="lbl">一览</p>
          <div className="rail-jp">目录</div>
        </div>
        <div className="min-w-0">
          <UserCollectionSheet
            basePath={`/users/${profile.handle}`}
            data={data}
            status={status}
          />
        </div>
      </section>

      <section className="spread border-border border-t py-14">
        <div>
          <p className="lbl">交换</p>
          <div className="rail-jp">交换</div>
        </div>
        <div className="min-w-0">
          <UserExchangeListings
            entryGoods={exchangeEntryGoods.map((item) => ({
              id: item.id,
              slug: item.slug,
              name: item.name,
            }))}
            items={data.exchangeListings}
          />
        </div>
      </section>

      <UserPhotoStrip items={data.recentPhotoEntries} />
    </main>
  );
}
