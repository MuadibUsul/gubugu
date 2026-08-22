import { z } from 'zod';

import type { ExchangeFulfillmentMethod } from './fulfillment';

export const MAX_OFFER_COUNTERS = 3;

export const exchangeOfferPolicyValues = [
  'wishlist_only',
  'open_to_offers',
] as const;
export type ExchangeOfferPolicy = (typeof exchangeOfferPolicyValues)[number];
export const exchangeOfferPolicySchema = z.enum(exchangeOfferPolicyValues);

export const exchangeOfferPolicyMeta: Record<
  ExchangeOfferPolicy,
  { label: string; description: string }
> = {
  wishlist_only: {
    label: '仅收愿望单',
    description: '只有你已经标记为「想要」的 SKU 才能提交初次出价。',
  },
  open_to_offers: {
    label: '也看其他谷',
    description: '愿望单只是偏好；看到合适的其他 SKU，你也可以接受。',
  },
};

export const exchangeOfferStatusValues = [
  'pending',
  'accepted',
  'declined',
  'withdrawn',
  'expired',
] as const;
export type ExchangeOfferStatus = (typeof exchangeOfferStatusValues)[number];

export const exchangeOfferStatusLabels: Record<ExchangeOfferStatus, string> = {
  pending: '协商中',
  accepted: '已成交',
  declined: '已拒绝',
  withdrawn: '已撤回',
  expired: '已结束',
};

type NegotiationState = {
  status: ExchangeOfferStatus;
  proposerId: string;
  recipientId: string;
  awaitingUserId: string;
  counterCount: number;
};

export function isOfferParticipant(state: NegotiationState, userId: string) {
  return userId === state.proposerId || userId === state.recipientId;
}

export function otherOfferParticipant(
  state: Pick<NegotiationState, 'proposerId' | 'recipientId'>,
  userId: string,
) {
  if (userId === state.proposerId) return state.recipientId;
  if (userId === state.recipientId) return state.proposerId;
  return null;
}

export function canRespondToOffer(state: NegotiationState, userId: string) {
  return state.status === 'pending' && state.awaitingUserId === userId;
}

export function canCounterOffer(state: NegotiationState, userId: string) {
  return (
    canRespondToOffer(state, userId) && state.counterCount < MAX_OFFER_COUNTERS
  );
}

export function nextCounterNumber(state: NegotiationState, userId: string) {
  if (!canCounterOffer(state, userId)) return null;
  return state.counterCount + 1;
}

export function isInitialGoodsAllowed(
  policy: ExchangeOfferPolicy,
  offeredGoodsIsWanted: boolean,
) {
  return policy === 'open_to_offers' || offeredGoodsIsWanted;
}

/** A fixed listing method cannot be loosened by a form-tampered proposal. */
export function isFulfillmentAllowed(
  listingMethod: ExchangeFulfillmentMethod,
  proposedMethod: ExchangeFulfillmentMethod,
) {
  return listingMethod === 'either' || listingMethod === proposedMethod;
}

export function negotiationStageLabel(counterCount: number) {
  return counterCount === 0
    ? '初次出价'
    : `第 ${Math.min(counterCount, MAX_OFFER_COUNTERS)}/${MAX_OFFER_COUNTERS} 次议价`;
}
