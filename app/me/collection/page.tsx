import type { Metadata } from 'next';
import { z } from 'zod';

import { UserCollectionHeader } from '@/components/user/user-collection-header';
import {
  UserCollectionSheet,
  type CollectionStatusFilter,
} from '@/components/user/user-collection-sheet';
import { UserPhotoStrip } from '@/components/user/user-photo-strip';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { requireAuthUser } from '@/server/auth/session';
import { getUserProfilePageData } from '@/server/data';
import { countUnlockedAchievements } from '@/server/data/achievements';

export const metadata: Metadata = {
  title: '我的收藏',
  description: '当前登录用户的收藏帖。',
};

export const dynamic = 'force-dynamic';

const statusSchema = z
  .enum(['owned', 'wanted', 'exchange'])
  .default('owned') satisfies z.ZodType<CollectionStatusFilter>;

type MyCollectionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MyCollectionPage({
  searchParams,
}: MyCollectionPageProps) {
  const user = await requireAuthUser('/me/collection');
  const resolved = (await searchParams) ?? {};
  const status = statusSchema.parse(
    getSingleSearchParamValue(resolved.status) ?? undefined,
  );

  const [data, badgeCount] = await Promise.all([
    getUserProfilePageData({ userId: user.id, viewerMode: 'self' }),
    countUnlockedAchievements(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <UserCollectionHeader
        badgeCount={badgeCount}
        badgesHref={user.handle ? `/users/${user.handle}/badges` : undefined}
        data={data}
        displayName={user.displayLabel}
        eyebrow="收集册"
        handle={user.handle ?? user.email ?? null}
        railLabel="我的收藏"
      />

      <section className="py-14">
        <div className="min-w-0">
          <p className="section-kicker">收藏一览</p>
          <h2 className="mt-3 mb-7 text-[clamp(28px,3.4vw,40px)]">
            我的收藏清单
          </h2>
          <UserCollectionSheet
            basePath="/me/collection"
            data={data}
            status={status}
          />
        </div>
      </section>

      <UserPhotoStrip items={data.recentPhotoEntries} />
    </main>
  );
}
