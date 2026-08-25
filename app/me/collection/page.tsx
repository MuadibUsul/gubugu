import type { Metadata } from 'next';
import { z } from 'zod';

import { UserCollectionHeader } from '@/components/user/user-collection-header';
import {
  UserCollectionSheet,
  type CollectionStatusFilter,
} from '@/components/user/user-collection-sheet';
import { UserPhotoStrip } from '@/components/user/user-photo-strip';
import { RemoteImage } from '@/components/ui/remote-image';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { requireAuthUser } from '@/server/auth/session';
import { getUserProfilePageData } from '@/server/data';
import { countUnlockedAchievements } from '@/server/data/achievements';
import { listUserScans } from '@/server/data/user-scans';

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

  const [data, badgeCount, scans] = await Promise.all([
    getUserProfilePageData({ userId: user.id, viewerMode: 'self' }),
    countUnlockedAchievements(user.id),
    listUserScans(user.id),
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

      {scans.length > 0 ? (
        <section className="pb-14">
          <p className="section-kicker">未鉴定收藏 · 仅自己可见</p>
          <h2 className="mt-3 mb-5 text-[clamp(20px,3vw,28px)]">
            扫到但未匹配官方的谷子
          </h2>
          <p className="text-muted-foreground mb-5 max-w-[46ch] text-sm">
            这些已收进你的谷柜，但因为没匹配到官方谷子（可能是盗版、二创或未收录），不会在公开主页展示。
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {scans.map((scan) => (
              <div
                className="relative aspect-square overflow-hidden rounded-[12px] border border-[var(--rule)] bg-[var(--sunken)]"
                key={scan.id}
              >
                <RemoteImage
                  alt="未鉴定收藏"
                  className="size-full object-cover"
                  sizes="120px"
                  src={scan.imageUrl}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <UserPhotoStrip items={data.recentPhotoEntries} />
    </main>
  );
}
