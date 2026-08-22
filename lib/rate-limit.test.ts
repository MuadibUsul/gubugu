import { describe, expect, it } from 'vitest';

import { createFixedWindowRateLimiter } from './rate-limit';

describe('fixed window rate limiter', () => {
  it('rejects excess writes and opens again in the next window', () => {
    const consume = createFixedWindowRateLimiter();
    expect(consume('user:post', { limit: 2, windowMs: 1000, now: 0 })).toBe(
      true,
    );
    expect(consume('user:post', { limit: 2, windowMs: 1000, now: 1 })).toBe(
      true,
    );
    expect(consume('user:post', { limit: 2, windowMs: 1000, now: 2 })).toBe(
      false,
    );
    expect(consume('user:post', { limit: 2, windowMs: 1000, now: 1000 })).toBe(
      true,
    );
  });

  it('isolates buckets by key', () => {
    const consume = createFixedWindowRateLimiter();
    expect(consume('a', { limit: 1, windowMs: 1000, now: 0 })).toBe(true);
    expect(consume('b', { limit: 1, windowMs: 1000, now: 0 })).toBe(true);
  });
});
