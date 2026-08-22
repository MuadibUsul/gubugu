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
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'RECOGNITION_WARMUP',
  'CATALOG_CRAWLER_SCHEDULER',
  'CATALOG_ASSET_DIR',
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
const SUPABASE = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
};

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
    // SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_APP_NAME have no readers.
    const mod = await loadEnv({ NODE_ENV: 'development', DATABASE_URL: DB });

    expect(mod.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(mod.env.NEXT_PUBLIC_APP_NAME).toBeUndefined();
  });

  it('treats empty strings as unset rather than as invalid values', async () => {
    // .env files routinely carry KEY="" for unused options.
    await expect(
      loadEnv({
        NODE_ENV: 'development',
        DATABASE_URL: DB,
        SUPABASE_SERVICE_ROLE_KEY: '',
        NEXT_PUBLIC_APP_URL: '   ',
      }),
    ).resolves.toBeDefined();
  });

  it('rejects a half-configured Supabase pair in any environment', async () => {
    // Configuring only one half silently falls back to demo auth, which is
    // exactly the failure this check exists to make loud.
    await expect(
      loadEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: SUPABASE.NEXT_PUBLIC_SUPABASE_URL,
      }),
    ).rejects.toThrow(/anon key/);

    await expect(
      loadEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).rejects.toThrow(/anon key/);
  });

  it('rejects a malformed URL', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).rejects.toThrow();
  });
});

describe('production', () => {
  it('refuses to boot without DATABASE_URL', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL,
        ...SUPABASE,
      }),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it('refuses to boot without Supabase auth, which would open the admin panel', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL,
        DATABASE_URL: DB,
      }),
    ).rejects.toThrow(/SUPABASE_URL/);
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
    expect(message).toMatch(/SUPABASE_URL/);
  });

  it('refuses to boot without the public app URL used by share cards', async () => {
    await expect(
      loadEnv({ NODE_ENV: 'production', DATABASE_URL: DB, ...SUPABASE }),
    ).rejects.toThrow(/APP_URL/);
  });

  it('requires HTTPS for a public production app URL', async () => {
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL: 'http://gubugu.example',
        DATABASE_URL: DB,
        ...SUPABASE,
      }),
    ).rejects.toThrow(/HTTPS/);

    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL: 'http://127.0.0.1:3000',
        DATABASE_URL: DB,
        ...SUPABASE,
      }),
    ).rejects.toThrow(/HTTPS/);

    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL: 'http://127.0.0.1:3000',
        ALLOW_INSECURE_LOCAL_APP_URL: '1',
        DATABASE_URL: DB,
        ...SUPABASE,
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
        ...SUPABASE,
      }),
    ).rejects.toThrow(/纯站点源/);
  });

  it('boots when fully configured', async () => {
    const mod = await loadEnv({
      NODE_ENV: 'production',
      APP_URL,
      DATABASE_URL: DB,
      ...SUPABASE,
    });

    expect(mod.env.NODE_ENV).toBe('production');
    expect(mod.env.DATABASE_URL).toBe(DB);
  });

  it('accepts the server-only Supabase names as a fallback', async () => {
    // lib/supabase/config.ts reads NEXT_PUBLIC_* first and falls back to these,
    // so the boot check has to accept the same pair.
    await expect(
      loadEnv({
        NODE_ENV: 'production',
        APP_URL,
        DATABASE_URL: DB,
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).resolves.toBeDefined();
  });
});
