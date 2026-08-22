/**
 * 可解释的换谷匹配分（0–100）。纯函数，不碰数据库，便于单测与迭代。
 *
 * 规则集中在这里，绝不散落到 Controller / UI（提示词 §11）。前端只展示后端算好的
 * 分数与拆解，自己不算分。地域、信用等信号目前数据未就绪，作为预留 facet，不虚构
 * 分数——只用已就绪信号计分，满分由已实现的 facet 组成。
 */

export type MatchFacet = {
  key: string;
  label: string;
  score: number;
  max: number;
};

export type MatchScore = {
  total: number;
  facets: MatchFacet[];
};

export type MatchScoreInput = {
  /** A 能从 B 换到的谷子件数（A 想要 ∩ B 愿换）。 */
  viewerReceives: number;
  /** B 能从 A 换到的谷子件数（B 想要 ∩ A 愿换）。 */
  otherReceives: number;
  /** A 的愿望单总件数，用于计算愿望被满足的比例。 */
  viewerWantsTotal: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function computeMatchScore(input: MatchScoreInput): MatchScore {
  const viewerReceives = Math.max(0, Math.trunc(input.viewerReceives));
  const otherReceives = Math.max(0, Math.trunc(input.otherReceives));
  const wantsTotal = Math.max(0, Math.trunc(input.viewerWantsTotal));

  // 愿望匹配：B 能满足 A 愿望单的比例。
  const coverage = clamp01(viewerReceives / Math.max(1, wantsTotal));
  const wishMatch = Math.round(45 * coverage);

  // 交换平衡：双方能换到的件数越对称越高，单边倾斜则扣分。
  const pairTotal = viewerReceives + otherReceives;
  const balanceRatio =
    pairTotal > 0
      ? (2 * Math.min(viewerReceives, otherReceives)) / pairTotal
      : 0;
  const balance = Math.round(30 * balanceRatio);

  // 互惠深度：桌面上可换的谷子越多，达成越可能。
  const depth = Math.min(25, pairTotal * 6);

  const facets: MatchFacet[] = [
    { key: 'wish', label: '愿望匹配', score: wishMatch, max: 45 },
    { key: 'balance', label: '交换平衡', score: balance, max: 30 },
    { key: 'depth', label: '互惠深度', score: depth, max: 25 },
  ];

  const total = Math.min(
    100,
    facets.reduce((sum, facet) => sum + facet.score, 0),
  );

  return { total, facets };
}
