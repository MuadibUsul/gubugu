import { describe, expect, it } from 'vitest';

import {
  ExchangeTransitionError,
  assertExchangeTransition,
  canTransitionExchange,
  isTerminalExchangeStatus,
} from './status';

describe('exchange status machine', () => {
  it('允许无资金换谷的正常履约链', () => {
    expect(canTransitionExchange('draft', 'proposed')).toBe(true);
    expect(canTransitionExchange('proposed', 'accepted')).toBe(true);
    expect(canTransitionExchange('accepted', 'shipping')).toBe(true);
    expect(canTransitionExchange('shipping', 'received')).toBe(true);
    expect(canTransitionExchange('received', 'completed')).toBe(true);
  });

  it('拒绝跳步和终态后的迁移', () => {
    expect(canTransitionExchange('proposed', 'shipping')).toBe(false);
    expect(canTransitionExchange('shipping', 'completed')).toBe(false);
    expect(isTerminalExchangeStatus('completed')).toBe(true);
    expect(isTerminalExchangeStatus('cancelled')).toBe(true);
    expect(canTransitionExchange('cancelled', 'proposed')).toBe(false);
  });

  it('提案被接受前可取消，发货后不可取消', () => {
    expect(canTransitionExchange('draft', 'cancelled')).toBe(true);
    expect(canTransitionExchange('proposed', 'cancelled')).toBe(true);
    expect(canTransitionExchange('accepted', 'cancelled')).toBe(true);
    expect(canTransitionExchange('shipping', 'cancelled')).toBe(false);
  });

  it('非法迁移抛出领域错误', () => {
    expect(() =>
      assertExchangeTransition('proposed', 'accepted'),
    ).not.toThrow();
    expect(() => assertExchangeTransition('draft', 'completed')).toThrow(
      ExchangeTransitionError,
    );
  });
});
