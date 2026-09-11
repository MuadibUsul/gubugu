import type { Metadata } from 'next';
import Link from 'next/link';

import { getSingleSearchParamValue } from '@/lib/search-params';
import {
  asLeaderboardDimension,
  boardFor,
  leaderboardBoards,
} from '@/lib/leaderboard';
import {
  getLeaderboard,
  type LeaderboardEntry,
} from '@/server/data/leaderboard';
import { canUseDevelopmentDatabaseFallback } from '@/server/db/client';

export const metadata: Metadata = {
  title: '收藏排行榜',
  description:
    '从点亮总数、品类广度、作品广度、近月势头与徽章等维度为公开收藏排名。',
};

type LeaderboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// 名次牌沿用金銀朱：冠军落金，亚军落银，季军落朱。
const medalClass = (rank: number) => {
  if (rank === 1) {
    return 'bg-[var(--kin)] text-[var(--ink)]';
  }
  if (rank === 2) {
    return 'bg-[color-mix(in_oklab,var(--ink-3)_45%,var(--surface))] text-[var(--ink)]';
  }
  if (rank === 3) {
    return 'bg-[var(--shu)] text-[var(--shu-ink)]';
  }
  return 'text-muted-foreground';
};

function LeaderboardRow({
  entry,
  unit,
  dimension,
}: {
  entry: LeaderboardEntry;
  unit: string;
  dimension: string;
}) {
  const secondary = (
    [
      ['lit', '点亮', entry.metrics.lit],
      ['breadth', '品类', entry.metrics.breadth],
      ['works', '作品', entry.metrics.works],
      ['momentum', '近月', entry.metrics.momentum],
      ['badges', '徽章', entry.metrics.badges],
    ] as const
  ).filter(([key]) => key !== dimension);

  return (
    <li className="flex items-center gap-4 border-b border-[var(--rule)] py-3.5 last:border-b-0">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full text-[15px] font-bold ${medalClass(entry.rank)}`}
      >
        {entry.rank}
      </span>

      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--sunken)] text-[16px] font-bold text-[var(--violet)]">
        {entry.displayName.slice(0, 1)}
      </span>

      <div className="min-w-0 flex-1">
        <Link
          className="block truncate text-[15px] font-bold hover:text-[var(--shu)]"
          // 徽章榜上点名字直接进徽章陈列柜，其余榜进主页。
          href={
            dimension === 'badges'
              ? `/users/${entry.handle}/badges`
              : `/users/${entry.handle}`
          }
        >
          {entry.displayName}
        </Link>
        <p className="text-muted-foreground truncate text-[12px]">
          @{entry.handle}
          {entry.accentTitle ? ` · ${entry.accentTitle}` : ''}
          {entry.city ? ` · ${entry.city}` : ''}
        </p>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        {secondary.map(([key, label, value]) => (
          <span
            className="text-muted-foreground rounded-full bg-[var(--sunken)] px-2.5 py-1 text-[11px]"
            key={key}
          >
            {label} <b className="num text-foreground">{value}</b>
          </span>
        ))}
      </div>

      <div className="shrink-0 text-right">
        <span className="num text-[22px] font-bold text-[var(--shu)]">
          {entry.value}
        </span>
        <span className="text-muted-foreground ml-1 text-[12px]">{unit}</span>
      </div>
    </li>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: LeaderboardPageProps) {
  const resolved = (await searchParams) ?? {};
  const dimension = asLeaderboardDimension(
    getSingleSearchParamValue(resolved.board),
  );
  const board = boardFor(dimension);

  let entries: LeaderboardEntry[] = [];
  let state: 'ready' | 'error' = 'ready';

  try {
    entries = await getLeaderboard(dimension, { limit: 50 });
  } catch (error) {
    if (!canUseDevelopmentDatabaseFallback(error)) throw error;

    state = 'error';
  }

  return (
    <main className="mx-auto w-full px-4 pt-4 pb-24 sm:px-6">
      <div className="pb-1">
        <h1 className="text-[19px] font-bold">收藏排行榜</h1>
        <p className="text-muted-foreground mt-1 text-[12px]">
          只统计实物扫描点亮的收藏 · 仅公开资料参与
        </p>
      </div>

      <nav
        aria-label="榜单维度"
        className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        {leaderboardBoards.map((item) => {
          const active = item.dimension === dimension;

          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded-full bg-[var(--shu)] px-4 py-2 text-[13px] font-semibold text-[var(--shu-ink)]'
                  : 'text-muted-foreground hover:text-foreground rounded-full border border-[var(--rule)] px-4 py-2 text-[13px] font-medium hover:border-[var(--shu)]'
              }
              href={`/leaderboard?board=${item.dimension}`}
              key={item.dimension}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-[20px]">{board.label}</h2>
          <span className="text-muted-foreground text-[13px]">
            {board.kicker}
          </span>
        </div>
        <div className="rule-kin" />

        {state === 'error' ? (
          <p className="empty-state mt-6">榜单暂时取不到，请稍后再看。</p>
        ) : entries.length === 0 ? (
          <p className="empty-state mt-6">
            还没有公开的点亮收藏进入这个榜单。扫描点亮你的第一件谷子吧。
          </p>
        ) : (
          <ol className="mt-2">
            {entries.map((entry) => (
              <LeaderboardRow
                dimension={dimension}
                entry={entry}
                key={entry.userId}
                unit={board.unit}
              />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
