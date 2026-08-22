import { describe, expect, it } from 'vitest';

import { canCancelBeforeShipping, deriveFulfillmentStatus } from './progress';

describe('bilateral exchange progress', () => {
  it('advances only after each party confirms its own checkpoint', () => {
    expect(
      deriveFulfillmentStatus({
        initiatorShipped: true,
        recipientShipped: false,
        initiatorReceived: false,
        recipientReceived: false,
      }),
    ).toBe('accepted');
    expect(
      deriveFulfillmentStatus({
        initiatorShipped: true,
        recipientShipped: true,
        initiatorReceived: false,
        recipientReceived: false,
      }),
    ).toBe('shipping');
    expect(
      deriveFulfillmentStatus({
        initiatorShipped: true,
        recipientShipped: true,
        initiatorReceived: true,
        recipientReceived: false,
      }),
    ).toBe('received');
    expect(
      deriveFulfillmentStatus({
        initiatorShipped: true,
        recipientShipped: true,
        initiatorReceived: true,
        recipientReceived: true,
      }),
    ).toBe('completed');
  });

  it('rejects receiving before both parties ship', () => {
    expect(() =>
      deriveFulfillmentStatus({
        initiatorShipped: true,
        recipientShipped: false,
        initiatorReceived: true,
        recipientReceived: false,
      }),
    ).toThrow('双方尚未都确认寄出');
  });

  it('closes cancellation as soon as either party ships', () => {
    expect(
      canCancelBeforeShipping('accepted', {
        initiatorShipped: false,
        recipientShipped: false,
      }),
    ).toBe(true);
    expect(
      canCancelBeforeShipping('accepted', {
        initiatorShipped: true,
        recipientShipped: false,
      }),
    ).toBe(false);
    expect(
      canCancelBeforeShipping('completed', {
        initiatorShipped: true,
        recipientShipped: true,
      }),
    ).toBe(false);
  });
});
