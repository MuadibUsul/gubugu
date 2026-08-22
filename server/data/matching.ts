import 'server-only';

import {
  and,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  ne,
  or,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import { goods, userGoods } from '@/drizzle/schema';
import {
  findReciprocalMatches,
  findThreePartyCycles,
  type TradeGraph,
} from '@/lib/matching/graph';
import { computeMatchScore, type MatchFacet } from '@/lib/matching/score';
import {
  getProfileSummariesByUserIds,
  resolveCollectorLabel,
  type ProfileSummary,
} from '@/server/data/profiles';
import {
  getPublishedGoodsCardsByIds,
  type GoodsCardData,
} from '@/server/data/_shared';
import { getDb } from '@/server/db/client';

const uuidSchema = z.string().uuid();

type TradeRow = {
  userId: string;
  goodsId: string;
  status: 'owned' | 'wanted' | 'exchange';
};

const NEIGHBOR_USER_LIMIT = 1000;
const NEIGHBOR_ROW_LIMIT = 8000;
const litOwnedGoods = alias(userGoods, 'matching_lit_owned_goods');

function eligibleExchangeCondition(db: ReturnType<typeof getDb>) {
  return and(
    eq(userGoods.status, 'exchange'),
    gt(userGoods.tradableQuantity, 0),
    exists(
      db
        .select({ id: litOwnedGoods.id })
        .from(litOwnedGoods)
        .where(
          and(
            eq(litOwnedGoods.userId, userGoods.userId),
            eq(litOwnedGoods.goodsId, userGoods.goodsId),
            eq(litOwnedGoods.status, 'owned'),
            isNotNull(litOwnedGoods.litAt),
          ),
        ),
    ),
  )!;
}

function addRowsToGraph(graph: TradeGraph, rows: TradeRow[]) {
  for (const row of rows) {
    const target =
      row.status === 'exchange'
        ? graph.offers
        : row.status === 'wanted'
          ? graph.wants
          : null;
    if (!target) continue;
    const set = target.get(row.userId) ?? new Set<string>();
    set.add(row.goodsId);
    target.set(row.userId, set);
  }
}

async function loadRowsForUsers(userIds: string[]) {
  if (!userIds.length) return [];

  const db = getDb();
  return db
    .select({
      userId: userGoods.userId,
      goodsId: userGoods.goodsId,
      status: userGoods.status,
    })
    .from(userGoods)
    .innerJoin(
      goods,
      and(eq(userGoods.goodsId, goods.id), eq(goods.status, 'published')),
    )
    .where(
      and(
        inArray(userGoods.userId, userIds),
        or(eq(userGoods.status, 'wanted'), eligibleExchangeCondition(db)),
      ),
    )
    .limit(NEIGHBOR_ROW_LIMIT);
}

async function findNeighborUserIds(input: {
  excludeUserId: string;
  offeredGoodsIds: string[];
  wantedGoodsIds: string[];
}) {
  const db = getDb();
  const matchClauses: SQL[] = [];

  if (input.wantedGoodsIds.length) {
    matchClauses.push(
      and(
        eligibleExchangeCondition(db),
        inArray(userGoods.goodsId, input.wantedGoodsIds),
      )!,
    );
  }
  if (input.offeredGoodsIds.length) {
    matchClauses.push(
      and(
        eq(userGoods.status, 'wanted'),
        inArray(userGoods.goodsId, input.offeredGoodsIds),
      )!,
    );
  }
  if (!matchClauses.length) return [];

  const rows = await db
    .selectDistinct({ userId: userGoods.userId })
    .from(userGoods)
    .innerJoin(
      goods,
      and(eq(userGoods.goodsId, goods.id), eq(goods.status, 'published')),
    )
    .where(and(ne(userGoods.userId, input.excludeUserId), or(...matchClauses)))
    .limit(NEIGHBOR_USER_LIMIT);

  return rows.map((row) => row.userId);
}

/** 只装配当前用户的两跳换谷邻域，足够覆盖双向匹配与 A→B→C→A。 */
async function loadTradeGraph(userId: string): Promise<TradeGraph> {
  const db = getDb();
  const viewerRows = await db
    .select({
      userId: userGoods.userId,
      goodsId: userGoods.goodsId,
      status: userGoods.status,
    })
    .from(userGoods)
    .innerJoin(
      goods,
      and(eq(userGoods.goodsId, goods.id), eq(goods.status, 'published')),
    )
    .where(
      and(
        eq(userGoods.userId, userId),
        or(eq(userGoods.status, 'wanted'), eligibleExchangeCondition(db)),
      ),
    );

  const graph: TradeGraph = { offers: new Map(), wants: new Map() };
  addRowsToGraph(graph, viewerRows);

  const firstUserIds = await findNeighborUserIds({
    excludeUserId: userId,
    offeredGoodsIds: [...(graph.offers.get(userId) ?? [])],
    wantedGoodsIds: [...(graph.wants.get(userId) ?? [])],
  });
  const firstRows = await loadRowsForUsers(firstUserIds);
  addRowsToGraph(graph, firstRows);

  const firstOffers = new Set<string>();
  const firstWants = new Set<string>();
  for (const id of firstUserIds) {
    graph.offers.get(id)?.forEach((goodsId) => firstOffers.add(goodsId));
    graph.wants.get(id)?.forEach((goodsId) => firstWants.add(goodsId));
  }

  const secondUserIds = await findNeighborUserIds({
    excludeUserId: userId,
    offeredGoodsIds: [...firstOffers],
    wantedGoodsIds: [...firstWants],
  });
  const unseenSecondUserIds = secondUserIds.filter(
    (id) => !firstUserIds.includes(id),
  );
  addRowsToGraph(graph, await loadRowsForUsers(unseenSecondUserIds));

  return graph;
}

export type DirectMatchView = {
  otherUserId: string;
  otherLabel: string;
  otherHandle: string | null;
  score: number;
  facets: MatchFacet[];
  /** viewer 能换到的谷子。 */
  viewerReceives: GoodsCardData[];
  /** 对方能换到的谷子。 */
  otherReceives: GoodsCardData[];
};

export type ThreePartyLegView = {
  fromUserId: string;
  toUserId: string;
  fromLabel: string;
  toLabel: string;
  goods: GoodsCardData[];
};

export type ThreePartyCycleView = {
  legs: ThreePartyLegView[];
};

export type UserMatches = {
  direct: DirectMatchView[];
  threeParty: ThreePartyCycleView[];
};

function labelFor(
  userId: string,
  summaries: Map<string, ProfileSummary>,
): string {
  return resolveCollectorLabel(userId, summaries);
}

function pickGoods(
  goodsIds: string[],
  byId: Map<string, GoodsCardData>,
): GoodsCardData[] {
  return goodsIds
    .map((id) => byId.get(id))
    .filter((card): card is GoodsCardData => Boolean(card));
}

/**
 * 计算并装配某用户的换谷匹配：双向互惠 + 三方循环。所有算分与图运算都在服务端
 * 完成（提示词 §9/§24），前端只渲染结果。
 */
export async function getMatchesForUser(
  rawUserId: string,
  options: { directLimit?: number; cycleLimit?: number } = {},
): Promise<UserMatches> {
  const userId = uuidSchema.parse(rawUserId);
  const directLimit = options.directLimit ?? 24;
  const cycleLimit = options.cycleLimit ?? 12;

  const graph = await loadTradeGraph(userId);
  const viewerWantsTotal = graph.wants.get(userId)?.size ?? 0;

  const reciprocal = findReciprocalMatches(graph, userId);
  const scored = reciprocal
    .map((match) => ({
      match,
      score: computeMatchScore({
        viewerReceives: match.viewerReceives.length,
        otherReceives: match.otherReceives.length,
        viewerWantsTotal,
      }),
    }))
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, directLimit);

  const cycles = findThreePartyCycles(graph, userId, cycleLimit);

  // 一次性水合所有涉及的谷子与用户，避免逐条查询。
  const goodsIds = new Set<string>();
  const userIds = new Set<string>([userId]);
  for (const { match } of scored) {
    userIds.add(match.otherUserId);
    match.viewerReceives.forEach((id) => goodsIds.add(id));
    match.otherReceives.forEach((id) => goodsIds.add(id));
  }
  for (const cycle of cycles) {
    for (const leg of cycle.legs) {
      userIds.add(leg.from);
      userIds.add(leg.to);
      leg.goodsIds.forEach((id) => goodsIds.add(id));
    }
  }

  const [goodsCards, summaries] = await Promise.all([
    getPublishedGoodsCardsByIds(Array.from(goodsIds)),
    getProfileSummariesByUserIds(Array.from(userIds)),
  ]);
  const goodsById = new Map(goodsCards.map((card) => [card.id, card]));

  const direct: DirectMatchView[] = scored.map(({ match, score }) => ({
    otherUserId: match.otherUserId,
    otherLabel: labelFor(match.otherUserId, summaries),
    otherHandle: summaries.get(match.otherUserId)?.handle ?? null,
    score: score.total,
    facets: score.facets,
    viewerReceives: pickGoods(match.viewerReceives, goodsById),
    otherReceives: pickGoods(match.otherReceives, goodsById),
  }));

  const threeParty: ThreePartyCycleView[] = cycles.map((cycle) => ({
    legs: cycle.legs.map((leg) => ({
      fromUserId: leg.from,
      toUserId: leg.to,
      fromLabel: labelFor(leg.from, summaries),
      toLabel: labelFor(leg.to, summaries),
      goods: pickGoods(leg.goodsIds, goodsById),
    })),
  }));

  return { direct, threeParty };
}
