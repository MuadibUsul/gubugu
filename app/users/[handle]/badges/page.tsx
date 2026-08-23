import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { UserAchievementLedger } from '@/components/user/user-achievement-ledger';
import { getUserProfilePageData } from '@/server/data';
import { listAchievementLedger } from '@/server/data/achievements';
import { resolveBrowsableProfile } from '@/server/data/profile-access';
import { getAuthUser } from '@/server/auth/session';

type BadgesPageProps = {
  params: Promise<{
    handle: string;
  }>;
};

export async function generateMetadata({
  params,
}: BadgesPageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await resolveBrowsableProfile(handle, null);

  return {
    title: profile ? `${profile.displayName} 的徽章陈列柜` : '徽章陈列柜',
    description: profile
      ? `${profile.displayName} 的收藏成就与徽章进度。`
      : '收藏徽章陈列柜',
  };
}

export default async function BadgesPage({ params }: BadgesPageProps) {
  const { handle } = await params;
  const viewer = await getAuthUser();
  const profile = await resolveBrowsableProfile(handle, viewer?.id ?? null);

  if (!profile) {
    notFound();
  }

  const [data, ledger] = await Promise.all([
    getUserProfilePageData({ userId: profile.userId }),
    listAchievementLedger(profile.userId),
  ]);

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8">
      <Link
        className="text-muted-foreground inline-flex items-center gap-1 text-[13px] hover:text-[var(--shu)]"
        href={`/users/${profile.handle}`}
      >
        ← 返回 {profile.displayName} 的主页
      </Link>

      <UserAchievementLedger
        entries={ledger}
        ownedTotal={data.summary.litCount}
        typeBreadthTotal={data.summary.typeBreadth}
      />
    </main>
  );
}
