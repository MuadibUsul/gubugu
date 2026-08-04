import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@/drizzle/schema';

export const DATABASE_URL_REQUIRED_ERROR_MESSAGE =
  '使用服务端数据访问层前必须先配置 DATABASE_URL。';

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(DATABASE_URL_REQUIRED_ERROR_MESSAGE);
  }

  return databaseUrl;
}

function createDatabase() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return {
    pool,
    db: drizzle(pool, { schema }),
  };
}

type DatabaseContext = ReturnType<typeof createDatabase>;

const globalForDatabase = globalThis as typeof globalThis & {
  __gubuguDatabase?: DatabaseContext;
};

// The pool must be cached in every environment, not just development. getDb()
// is called once per query function (38 call sites), so without this each call
// would construct a fresh pg.Pool that is never ended — a single page render
// opens several pools and leaks their connections until the database refuses
// new ones. Caching in development additionally survives HMR module reloads.
function getDatabaseContext() {
  if (globalForDatabase.__gubuguDatabase) {
    return globalForDatabase.__gubuguDatabase;
  }

  const database = createDatabase();

  globalForDatabase.__gubuguDatabase = database;

  return database;
}

export function getDb() {
  return getDatabaseContext().db;
}

export function getDbPool() {
  return getDatabaseContext().pool;
}

export function isDatabaseAccessConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes(DATABASE_URL_REQUIRED_ERROR_MESSAGE)
  );
}

export type Database = ReturnType<typeof getDb>;
