import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// pg.Pool does not connect until a query is issued, so pointing at a database
// that does not exist is enough to exercise the caching behaviour.
const TEST_DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';

let previousDatabaseUrl: string | undefined;

beforeAll(() => {
  previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = TEST_DATABASE_URL;
});

afterAll(async () => {
  const { getDbPool } = await import('./client');

  await getDbPool().end();

  if (previousDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

describe('getDb', () => {
  // getDb() is called once per query function across server/, so a per-call
  // pool would leak connections until the database refuses new ones. This is
  // only observable in production, where the bug previously lived.
  it('reuses one pool across calls', { timeout: 10_000 }, async () => {
    const { getDb, getDbPool } = await import('./client');

    expect(getDb()).toBe(getDb());
    expect(getDbPool()).toBe(getDbPool());
  });

  it('reuses the pool when NODE_ENV is production', async () => {
    const { getDbPool } = await import('./client');
    const before = getDbPool();

    const previousNodeEnv = process.env.NODE_ENV;

    // NODE_ENV is readonly in the Next type augmentation but writable at
    // runtime; the cast keeps the assignment without loosening the module.
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    try {
      expect(getDbPool()).toBe(before);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        previousNodeEnv;
    }
  });
});

describe('isDatabaseAccessConfigurationError', () => {
  it('recognises the missing DATABASE_URL error', async () => {
    const {
      isDatabaseAccessConfigurationError,
      DATABASE_URL_REQUIRED_ERROR_MESSAGE,
    } = await import('./client');

    expect(
      isDatabaseAccessConfigurationError(
        new Error(DATABASE_URL_REQUIRED_ERROR_MESSAGE),
      ),
    ).toBe(true);
    expect(isDatabaseAccessConfigurationError(new Error('other'))).toBe(false);
    expect(isDatabaseAccessConfigurationError('not an error')).toBe(false);
  });
});

describe('canUseDevelopmentDatabaseFallback', () => {
  it('only allows missing configuration outside production', async () => {
    const {
      canUseDevelopmentDatabaseFallback,
      DATABASE_URL_REQUIRED_ERROR_MESSAGE,
    } = await import('./client');
    const previousNodeEnv = process.env.NODE_ENV;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        'development';
      expect(
        canUseDevelopmentDatabaseFallback(
          new Error(DATABASE_URL_REQUIRED_ERROR_MESSAGE),
        ),
      ).toBe(true);
      expect(canUseDevelopmentDatabaseFallback(new Error('offline'))).toBe(
        false,
      );

      (process.env as Record<string, string | undefined>).NODE_ENV =
        'production';
      expect(
        canUseDevelopmentDatabaseFallback(
          new Error(DATABASE_URL_REQUIRED_ERROR_MESSAGE),
        ),
      ).toBe(false);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        previousNodeEnv;
    }
  });
});
