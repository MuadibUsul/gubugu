type Bucket = { startedAt: number; count: number };

/**
 * 轻量单进程限流。它保护本地与单实例部署的写入口；多实例部署时可把同一接口
 * 换成 Redis 实现，不改变领域 action。
 */
export function createFixedWindowRateLimiter() {
  const buckets = new Map<string, Bucket>();

  return function consume(
    key: string,
    options: { limit: number; windowMs: number; now?: number },
  ) {
    const now = options.now ?? Date.now();
    const current = buckets.get(key);
    if (!current || now - current.startedAt >= options.windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= options.limit) return false;
    current.count += 1;
    return true;
  };
}

export const consumeServerWrite = createFixedWindowRateLimiter();
