import Link from 'next/link';

import { isDatabaseAccessConfigurationError } from '@/server/db/client';
import { getLeaderboard } from '@/server/data/leaderboard';

// 排行 band：点亮总数榜前 N，首页精简预览，读态不需登录。
export async function HomeLeaderboardSection() {
  let entries: Awaited<ReturnType<typeof getLeaderboard>> = [];
  try {
    entries = await getLeaderboard('lit', { limit: 5 });
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) console.error(error);
  }

  if (entries.length === 0) return null;

  return (
    <section className="mt-9 md:mt-12" aria-label="收藏排行">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="section-kicker hidden md:inline-flex">
            点亮最多的收藏家
          </p>
          <h2 className="text-[clamp(16px,4.6vw,34px)] md:mt-3">
            收藏排行 <span className="text-[var(--ink-3)] md:hidden">· 本周</span>
          </h2>
        </div>
        <Link
          className="shrink-0 text-sm font-bold text-[var(--shu)]"
          href="/leaderboard"
        >
          看排行 →
        </Link>
      </div>

      <ol className="mt-5 divide-y divide-[var(--rule)] overflow-hidden rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)]">
        {entries.map((entry) => (
          <li key={entry.userId}>
            <Link
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--sunken)]"
              href={`/users/${entry.handle}`}
            >
              <span className="w-6 shrink-0 text-center text-sm font-bold text-[var(--ink-2)] num">
                {entry.rank}
              </span>
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--shu-soft)] text-sm font-bold text-[var(--shu)]">
                {entry.avatarImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={entry.avatarImageUrl}
                  />
                ) : (
                  (entry.displayName || entry.handle).slice(0, 1)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {entry.displayName || entry.handle}
                </span>
                {entry.accentTitle ? (
                  <span className="text-muted-foreground block truncate text-xs">
                    {entry.accentTitle}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-sm font-bold text-[var(--shu)] num">
                {entry.value}
                <span className="text-muted-foreground ml-0.5 text-xs font-normal">
                  件
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
