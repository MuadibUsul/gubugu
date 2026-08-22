import { describe, expect, it } from 'vitest';

import {
  latestCrawlerScheduleAt,
  nextCrawlerScheduleAt,
} from '@/lib/catalog-crawler/schedule';

describe('nextCrawlerScheduleAt', () => {
  it('returns the same-day 10:00 Shanghai slot before it starts', () => {
    expect(
      nextCrawlerScheduleAt(new Date('2026-08-22T01:59:59.000Z')).toISOString(),
    ).toBe('2026-08-22T02:00:00.000Z');
  });

  it('returns 22:00 Shanghai after the morning slot', () => {
    expect(
      nextCrawlerScheduleAt(new Date('2026-08-22T02:00:00.000Z')).toISOString(),
    ).toBe('2026-08-22T14:00:00.000Z');
  });

  it('rolls over to the next morning after the evening slot', () => {
    expect(
      nextCrawlerScheduleAt(new Date('2026-08-22T14:00:00.000Z')).toISOString(),
    ).toBe('2026-08-23T02:00:00.000Z');
  });
});

describe('latestCrawlerScheduleAt', () => {
  it('uses the latest stable slot for external scheduler retries', () => {
    expect(
      latestCrawlerScheduleAt(
        new Date('2026-08-22T14:17:00.000Z'),
      ).toISOString(),
    ).toBe('2026-08-22T14:00:00.000Z');
  });

  it('uses the previous evening before the morning slot', () => {
    expect(
      latestCrawlerScheduleAt(
        new Date('2026-08-22T01:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-08-21T14:00:00.000Z');
  });
});
