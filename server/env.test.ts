import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// server/env.ts validates and throws at module scope, so each case needs a
// fresh module registry.
const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_NAME',
  'APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'ALLOW_INSECURE_LOCAL_APP_URL',
  'DATABASE_URL',
  'LOCAL_AUTH_SECRET',
  'RECOGNITION_WARMUP',
  'CATALOG_CRAWLER_SCHEDULER',
  'CATALOG_ASSET_DIR',
  'USER_SCAN_ASSET_DIR',
] as const;

let saved: Record<string, string | undefined>;

async function loadEnv(values: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }

  vi.resetModules();

  return import('./env');
}

const DB = 'postgresql://postgres:postgres@127.0.0.1:5432/gubugu';
const APP_URL = 'https://gubugu.example';
const SECRET = 'a'.repeat(48);

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
});

describe('development', () => {
  it('boots with nothing configured; local auth validates its secret on use', async () => {
    await expect(loadEnv({ NODE_ENV: 'development' })).resolves.toBeDefined();
  });

  it('does not require the variables the app never reads', async () => {
    const mod = await loadEnv({ NODE_ENV: 'development', DATABASE_URL: DB });

    expect(mod.env.NEXT_PUBLIC_APP_NAME).toBeUndefined();
  });

  it('treats empty strings as unset rather than as invalid values', async () => {
    // .env files routinely carry KEY="" for unused options.
    await expect(
      loadEnv({
        NODE_ENV: 'development',
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: '',
        NEXT_PUBLIC_APP_URL: '   ',
      }),
    ).resolves.toBeDefined();
  });

  it('rejects a malformed URL', async () => {
    await expect(
      loadEnv({ NODE_ENV: 'development', APP_URL: 'not-a-url' }),
    ).rejects.toThrow();
  });

  // 会话 cookie 的完整性全靠这个密钥；太短就能被爆破后伪造任意用户的会话。
  it('rejects a session secret too short to resist brute force', async () => {
    await expect(
      loadEnv({ NODE_ENV: 'development', LOCAL_AUTH_SECRET: 'too-short' }),
    ).rejects.toThrow(/LOCAL_AUTH_SECRET/);
  });
});

describe('production', () => {
  it('refuses to boot without DATABASE_URL', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL,
        LOCAL_AUTH_SECRET: SECRET,
      }),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it('refuses to boot with no authentication configured at all', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL,
        DATABASE_URL: DB,
      }),
    ).rejects.toThrow(/LOCAL_AUTH_SECRET/);
  });

  it('accepts self-hosted local auth when the session signing secret is set', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL,
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: 'a'.repeat(48),
      }),
    ).resolves.toBeDefined();
  });

  it('still refuses local auth when the session secret is too short to resist brute force', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL,
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: 'too-short',
      }),
    ).rejects.toThrow(/LOCAL_AUTH_SECRET/);
  });

  it('reports every problem at once instead of one per restart', async () => {
    let message = '';

    try {
      await loadEnv({ NODE_ENV: 'production' });
      expect.unreachable('expected loading env to throw');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toMatch(/DATABASE_URL/);
    expect(message).toMatch(/APP_URL/);
    expect(message).toMatch(/LOCAL_AUTH_SECRET/);
  });

  it('refuses to boot without the public app URL used by share cards', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: SECRET,
      }),
    ).rejects.toThrow(/APP_URL/);
  });

  it('requires HTTPS for a public production app URL', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL: 'http://gubugu.example',
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: SECRET,
      }),
    ).rejects.toThrow(/HTTPS/);

    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL: 'http://127.0.0.1:3000',
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: SECRET,
      }),
    ).rejects.toThrow(/HTTPS/);

    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL: 'http://127.0.0.1:3000',
        ALLOW_INSECURE_LOCAL_APP_URL: '1',
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: SECRET,
      }),
    ).resolves.toBeDefined();
  });

  it.each([
    'https://user:secret@gubugu.example',
    'https://gubugu.example/app',
    'https://gubugu.example?from=env',
    'https://gubugu.example#share',
  ])('requires the public app URL to be a pure origin: %s', async (appUrl) => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL: appUrl,
        DATABASE_URL: DB,
        LOCAL_AUTH_SECRET: SECRET,
      }),
    ).rejects.toThrow(/纯站点源/);
  });

  it('boots when fully configured', async () => {
    const mod = await loadEnv({
      NODE_ENV: 'production',
      APP_URL,
      DATABASE_URL: DB,
      LOCAL_AUTH_SECRET: SECRET,
    });

    expect(mod.env.NODE_ENV).toBe('production');
    expect(mod.env.DATABASE_URL).toBe(DB);
  });
});
