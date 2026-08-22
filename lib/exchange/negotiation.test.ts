import { describe, expect, it } from 'vitest';

import {
  MAX_OFFER_COUNTERS,
  canCounterOffer,
  canRespondToOffer,
  isFulfillmentAllowed,
  isInitialGoodsAllowed,
  negotiationStageLabel,
  nextCounterNumber,
  otherOfferParticipant,
} from './negotiation';

const pending = {
  status: 'pending' as const,
  proposerId: 'proposer',
  recipientId: 'recipient',
  awaitingUserId: 'recipient',
  counterCount: 0,
};

describe('exchange negotiation', () => {
  it('counts only counter offers and stops at the third one', () => {
    expect(nextCounterNumber(pending, 'recipient')).toBe(1);
    expect(
      canCounterOffer(
        { ...pending, counterCount: MAX_OFFER_COUNTERS },
        'recipient',
      ),
    ).toBe(false);
    expect(
      nextCounterNumber(
        { ...pending, counterCount: MAX_OFFER_COUNTERS },
        'recipient',
      ),
    ).toBeNull();
  });

  it('only lets the participant currently holding the turn respond', () => {
    expect(canRespondToOffer(pending, 'recipient')).toBe(true);
    expect(canRespondToOffer(pending, 'proposer')).toBe(false);
    expect(canRespondToOffer(pending, 'stranger')).toBe(false);
    expect(
      canRespondToOffer({ ...pending, status: 'declined' }, 'recipient'),
    ).toBe(false);
  });

  it('resolves the other participant without accepting a stranger', () => {
    expect(otherOfferParticipant(pending, 'proposer')).toBe('recipient');
    expect(otherOfferParticipant(pending, 'recipient')).toBe('proposer');
    expect(otherOfferParticipant(pending, 'stranger')).toBeNull();
  });

  it('enforces strict wishlist listings while allowing open listings', () => {
    expect(isInitialGoodsAllowed('wishlist_only', false)).toBe(false);
    expect(isInitialGoodsAllowed('wishlist_only', true)).toBe(true);
    expect(isInitialGoodsAllowed('open_to_offers', false)).toBe(true);
  });

  it('does not let an offer loosen a fixed fulfillment method', () => {
    expect(isFulfillmentAllowed('shipping', 'meetup')).toBe(false);
    expect(isFulfillmentAllowed('shipping', 'shipping')).toBe(true);
    expect(isFulfillmentAllowed('either', 'meetup')).toBe(true);
  });

  it('uses clear initial and bounded counter labels', () => {
    expect(negotiationStageLabel(0)).toBe('初次出价');
    expect(negotiationStageLabel(2)).toBe('第 2/3 次议价');
    expect(negotiationStageLabel(99)).toBe('第 3/3 次议价');
  });
});
