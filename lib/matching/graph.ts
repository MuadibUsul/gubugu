/**
 * 换谷匹配的图算法，纯函数、可单测。数据库、领域模型与服务架构必须允许未来加入
 * 多边图匹配（提示词 §10），因此边的构造与循环检测和取数解耦：服务层只负责把
 * user_goods 装配成 TradeGraph，算法在这里。
 *
 *   OFFER(u, g)  用户 u 愿意换出谷子 g
 *   WANT(u, g)   用户 u 想要谷子 g
 *   边 U ⇐ V     U 能从 V 换到（WANT(U) ∩ OFFER(V) 非空）
 */

export type TradeGraph = {
  /** userId → 愿换出的 goodsId 集合。 */
  offers: Map<string, Set<string>>;
  /** userId → 想要的 goodsId 集合。 */
  wants: Map<string, Set<string>>;
};

export type ReciprocalMatch = {
  otherUserId: string;
  /** A 能从 B 换到（A 想要 ∩ B 愿换）。 */
  viewerReceives: string[];
  /** B 能从 A 换到（B 想要 ∩ A 愿换）。 */
  otherReceives: string[];
};

export type CycleLeg = {
  /** from 能从 to 换到这些谷子。 */
  from: string;
  to: string;
  goodsIds: string[];
};

export type ThreePartyCycle = {
  /** [A, B, C]，交换方向 A ⇐ B ⇐ C ⇐ A。 */
  users: [string, string, string];
  legs: [CycleLeg, CycleLeg, CycleLeg];
};

const EMPTY: ReadonlySet<string> = new Set();

function intersect(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  const out: string[] = [];
  for (const value of small) {
    if (large.has(value)) out.push(value);
  }
  return out;
}

function allUserIds(graph: TradeGraph): string[] {
  return Array.from(new Set([...graph.offers.keys(), ...graph.wants.keys()]));
}

/**
 * 找出与 viewer 构成互惠（双向）换谷的所有对手：viewer 想要的里有对方愿换的，
 * 且对方想要的里有 viewer 愿换的。
 */
export function findReciprocalMatches(
  graph: TradeGraph,
  viewerId: string,
): ReciprocalMatch[] {
  const viewerWants = graph.wants.get(viewerId) ?? EMPTY;
  const viewerOffers = graph.offers.get(viewerId) ?? EMPTY;

  if (viewerWants.size === 0 || viewerOffers.size === 0) {
    return [];
  }

  const matches: ReciprocalMatch[] = [];

  for (const otherUserId of allUserIds(graph)) {
    if (otherUserId === viewerId) continue;

    const viewerReceives = intersect(
      viewerWants,
      graph.offers.get(otherUserId) ?? EMPTY,
    );
    if (viewerReceives.length === 0) continue;

    const otherReceives = intersect(
      graph.wants.get(otherUserId) ?? EMPTY,
      viewerOffers,
    );
    if (otherReceives.length === 0) continue;

    matches.push({ otherUserId, viewerReceives, otherReceives });
  }

  return matches;
}

// U 能从 V 换到的谷子（WANT(U) ∩ OFFER(V)）。
function receivable(
  graph: TradeGraph,
  fromUser: string,
  toUser: string,
): string[] {
  return intersect(
    graph.wants.get(fromUser) ?? EMPTY,
    graph.offers.get(toUser) ?? EMPTY,
  );
}

/**
 * 找出经过 viewer 的三方循环换谷：A ⇐ B ⇐ C ⇐ A。
 * 三人各不相同；方向有意义（A⇐B 与 A⇐C 是不同的方案）。
 */
export function findThreePartyCycles(
  graph: TradeGraph,
  viewerId: string,
  limit = 20,
): ThreePartyCycle[] {
  const cycles: ThreePartyCycle[] = [];
  const users = allUserIds(graph);

  for (const b of users) {
    if (b === viewerId) continue;
    const aFromB = receivable(graph, viewerId, b); // A ⇐ B
    if (aFromB.length === 0) continue;

    for (const c of users) {
      if (c === viewerId || c === b) continue;
      const bFromC = receivable(graph, b, c); // B ⇐ C
      if (bFromC.length === 0) continue;

      const cFromA = receivable(graph, c, viewerId); // C ⇐ A
      if (cFromA.length === 0) continue;

      cycles.push({
        users: [viewerId, b, c],
        legs: [
          { from: viewerId, to: b, goodsIds: aFromB },
          { from: b, to: c, goodsIds: bFromC },
          { from: c, to: viewerId, goodsIds: cFromA },
        ],
      });

      if (cycles.length >= limit) return cycles;
    }
  }

  return cycles;
}
