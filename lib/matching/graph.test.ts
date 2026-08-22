import { describe, expect, it } from 'vitest';

import {
  findReciprocalMatches,
  findThreePartyCycles,
  type TradeGraph,
} from './graph';

function graphOf(
  spec: Record<string, { offers?: string[]; wants?: string[] }>,
): TradeGraph {
  const offers = new Map<string, Set<string>>();
  const wants = new Map<string, Set<string>>();
  for (const [user, { offers: o = [], wants: w = [] }] of Object.entries(
    spec,
  )) {
    offers.set(user, new Set(o));
    wants.set(user, new Set(w));
  }
  return { offers, wants };
}

describe('findReciprocalMatches', () => {
  it('A 愿换 X 想要 Y，B 愿换 Y 想要 X → 直接互惠匹配', () => {
    const graph = graphOf({
      A: { offers: ['X'], wants: ['Y'] },
      B: { offers: ['Y'], wants: ['X'] },
    });

    const matches = findReciprocalMatches(graph, 'A');
    expect(matches).toHaveLength(1);
    expect(matches[0].otherUserId).toBe('B');
    expect(matches[0].viewerReceives).toEqual(['Y']);
    expect(matches[0].otherReceives).toEqual(['X']);
  });

  it('只有单边需求时不算互惠匹配', () => {
    const graph = graphOf({
      A: { offers: ['X'], wants: ['Y'] },
      B: { offers: ['Y'], wants: ['Z'] }, // B 不想要 A 愿换的 X
    });

    expect(findReciprocalMatches(graph, 'A')).toHaveLength(0);
  });

  it('viewer 没有可换出的谷子时无匹配', () => {
    const graph = graphOf({
      A: { wants: ['Y'] },
      B: { offers: ['Y'], wants: ['X'] },
    });

    expect(findReciprocalMatches(graph, 'A')).toHaveLength(0);
  });
});

describe('findThreePartyCycles', () => {
  it('A 想要 B 愿换的、B 想要 C 愿换的、C 想要 A 愿换的 → 三方循环', () => {
    const graph = graphOf({
      A: { offers: ['X'], wants: ['Y'] }, // A ⇐ B (Y)
      B: { offers: ['Y'], wants: ['Z'] }, // B ⇐ C (Z)
      C: { offers: ['Z'], wants: ['X'] }, // C ⇐ A (X)
    });

    const cycles = findThreePartyCycles(graph, 'A');
    expect(cycles).toHaveLength(1);
    expect(cycles[0].users).toEqual(['A', 'B', 'C']);
    expect(cycles[0].legs.map((leg) => leg.goodsIds)).toEqual([
      ['Y'],
      ['Z'],
      ['X'],
    ]);
  });

  it('缺任意一条边则不成环', () => {
    const graph = graphOf({
      A: { offers: ['X'], wants: ['Y'] },
      B: { offers: ['Y'], wants: ['Z'] },
      C: { offers: ['Z'], wants: ['W'] }, // C 不想要 A 愿换的 X
    });

    expect(findThreePartyCycles(graph, 'A')).toHaveLength(0);
  });

  it('三人必须各不相同（互惠二循环不算三方）', () => {
    const graph = graphOf({
      A: { offers: ['X'], wants: ['Y'] },
      B: { offers: ['Y'], wants: ['X'] },
    });

    expect(findThreePartyCycles(graph, 'A')).toHaveLength(0);
  });
});
