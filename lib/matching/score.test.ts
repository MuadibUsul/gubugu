import { describe, expect, it } from 'vitest';

import { computeMatchScore } from './score';

describe('computeMatchScore', () => {
  it('完全对称、愿望全被满足 → 高分', () => {
    const { total, facets } = computeMatchScore({
      viewerReceives: 2,
      otherReceives: 2,
      viewerWantsTotal: 2,
    });

    // 愿望匹配 45（2/2）+ 平衡 30（对称）+ 深度 24（4×6）= 99
    expect(facets.find((f) => f.key === 'wish')?.score).toBe(45);
    expect(facets.find((f) => f.key === 'balance')?.score).toBe(30);
    expect(total).toBeGreaterThanOrEqual(95);
  });

  it('单边倾斜时交换平衡扣分', () => {
    const balanced = computeMatchScore({
      viewerReceives: 3,
      otherReceives: 3,
      viewerWantsTotal: 3,
    });
    const lopsided = computeMatchScore({
      viewerReceives: 3,
      otherReceives: 1,
      viewerWantsTotal: 3,
    });

    const balanceOf = (s: ReturnType<typeof computeMatchScore>) =>
      s.facets.find((f) => f.key === 'balance')!.score;

    expect(balanceOf(lopsided)).toBeLessThan(balanceOf(balanced));
  });

  it('愿望只被部分满足时按比例给分', () => {
    const { facets } = computeMatchScore({
      viewerReceives: 1,
      otherReceives: 1,
      viewerWantsTotal: 4,
    });

    // 1/4 → 45 * 0.25 ≈ 11
    expect(facets.find((f) => f.key === 'wish')?.score).toBe(11);
  });

  it('总分不超过 100', () => {
    const { total } = computeMatchScore({
      viewerReceives: 50,
      otherReceives: 50,
      viewerWantsTotal: 50,
    });
    expect(total).toBeLessThanOrEqual(100);
  });
});
