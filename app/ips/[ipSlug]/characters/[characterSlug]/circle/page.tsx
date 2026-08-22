import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FollowButton } from '@/components/user/follow-button';
import { getAuthUser } from '@/server/auth/session';
import { getCharacterEncyclopediaPageData } from '@/server/data';
import { listCharacterCollectors } from '@/server/data/character-circle';
import { getFollowingIdsAmong } from '@/server/data/follows';

export default async function CharacterCirclePage({
  params,
  searchParams,
}: {
  params: Promise<{ ipSlug: string; characterSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ipSlug, characterSlug } = await params;
  const rawPage = (await searchParams).page;
  const page = Math.max(
    1,
    Number(Array.isArray(rawPage) ? rawPage[0] : rawPage) || 1,
  );
  const character = await getCharacterEncyclopediaPageData({
    ipSlug,
    characterSlug,
  });
  if (!character) notFound();
  const viewer = await getAuthUser();
  const collectorPage = await listCharacterCollectors({ characterSlug, page });
  const followingIds = viewer
    ? await getFollowingIdsAmong(
        viewer.id,
        collectorPage.items.map((profile) => profile.userId),
      )
    : new Set<string>();
  const basePath = `/ips/${ipSlug}/characters/${characterSlug}/circle`;
  return (
    <main className="mx-auto w-full max-w-[980px] px-5 pt-14 pb-24 md:px-10">
      <section className="border-border border-b pb-12">
        <p className="lbl">收藏圈</p>
        <h1 className="mt-3 text-[clamp(28px,3.8vw,44px)]">
          {character.character.name} 的收藏者
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          共 {collectorPage.total} 位公开收藏者
        </p>
      </section>
      <section className="py-8">
        {collectorPage.items.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {collectorPage.items.map((collector) => (
              <article
                className="panel p-5 hover:border-[var(--shu)]"
                key={collector.userId}
              >
                <Link href={`/users/${collector.handle}`}>
                  <p className="font-medium">{collector.displayName}</p>
                  <p className="num mt-1">@{collector.handle}</p>
                </Link>
                {viewer && viewer.id !== collector.userId ? (
                  <FollowButton
                    followingId={collector.userId}
                    isFollowing={followingIds.has(collector.userId)}
                    nextPath={`${basePath}?page=${page}`}
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>暂时还没有公开收藏者</strong>
            率先收录相关谷子，成为这个角色收藏圈的第一位成员。
          </div>
        )}
        <div className="mt-6 flex gap-4 text-sm">
          {page > 1 ? (
            <Link href={`${basePath}?page=${page - 1}`}>← 上一页</Link>
          ) : null}
          {page * collectorPage.pageSize < collectorPage.total ? (
            <Link href={`${basePath}?page=${page + 1}`}>下一页 →</Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
