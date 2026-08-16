import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not read .env.local on its own, unlike drizzle/seed/index.ts
// and drizzle/verify-rls.mjs which load it explicitly. Without this, db:migrate
// and db:studio fall through to the default below and operate on a different
// database than the one the app is configured against — silently, because a
// connection to the default either succeeds against the wrong database or
// fails with an error that looks unrelated to configuration.
loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error(
      'DATABASE_URL 未配置。drizzle-kit 命令需要它，请先在 .env.local 中设置，' +
        '否则迁移可能作用在非预期的数据库上。',
    );
  }

  return url;
}

export default defineConfig({
  schema: './drizzle/schema/**/*.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  strict: true,
  verbose: true,
});
