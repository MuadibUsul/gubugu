// 收藏排行榜的维度与纯排名逻辑。取数在 server/data/leaderboard.ts，这里只放
// 可单测的定义与名次计算，不碰数据库。

export const leaderboardDimensions = [
  'lit',
  'breadth',
  'works',
  'momentum',
  'badges',
] as const;

export type LeaderboardDimension = (typeof leaderboardDimensions)[number];

export type LeaderboardBoard = {
  dimension: LeaderboardDimension;
  /** 榜单名。 */
  label: string;
  /** 一句话说明这个榜比的是什么。 */
  kicker: string;
  /** 数值单位。 */
  unit: string;
};

export const leaderboardBoards: readonly LeaderboardBoard[] = [
  { dimension: 'lit', label: '点亮总数', kicker: '点亮最多的收藏家', unit: '件' },
  { dimension: 'breadth', label: '品类广度', kicker: '收藏跨越的谷子类型', unit: '类' },
  { dimension: 'works', label: '作品广度', kicker: '涉猎过的作品数', unit: '部' },
  {
    dimension: 'momentum',
    label: '近月势头',
    kicker: '近 30 天点亮件数',
    unit: '件',
  },
  { dimension: 'badges', label: '徽章收集', kicker: '解锁的成就数量', unit: '枚' },
];

export const defaultLeaderboardDimension: LeaderboardDimension = 'lit';

/** 把任意输入收敛成合法维度，非法值回落到默认榜。 */
export function asLeaderboardDimension(
  value: string | null | undefined,
): LeaderboardDimension {
  return leaderboardDimensions.includes(value as LeaderboardDimension)
    ? (value as LeaderboardDimension)
    : defaultLeaderboardDimension;
}

export function boardFor(dimension: LeaderboardDimension): LeaderboardBoard {
  return (
    leaderboardBoards.find((board) => board.dimension === dimension) ??
    leaderboardBoards[0]
  );
}

export type Rankable = { value: number };
export type Ranked<T> = T & { rank: number };

/**
 * 竞技名次（1,2,2,4）。并列同名次，下一名次跳过对应位数。
 *
 * - value ≤ 0 的条目直接剔除：空收藏不该出现在榜上。
 * - 输入不必已排序：内部按 value 降序稳定排序后再定名次。
 */
export function rankLeaderboard<T extends Rankable>(
  entries: readonly T[],
): Ranked<T>[] {
  const sorted = entries
    .filter((entry) => entry.value > 0)
    .map((entry, index) => ({ entry, index }))
    // 稳定降序：value 相同保持原有顺序（原顺序由取数端的次级排序决定）。
    .sort((a, b) => b.entry.value - a.entry.value || a.index - b.index)
    .map(({ entry }) => entry);

  const ranked: Ranked<T>[] = [];
  let lastValue: number | null = null;
  let lastRank = 0;

  sorted.forEach((entry, index) => {
    const rank =
      lastValue !== null && entry.value === lastValue ? lastRank : index + 1;

    ranked.push({ ...entry, rank });
    lastValue = entry.value;
    lastRank = rank;
  });

  return ranked;
}
