/**
 * Database acceptance checks for the cabinet -> scan -> light boundary.
 * Run after migrate + seed.
 */
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to verify collection lighting.');
}

const client = new pg.Client({ connectionString });
await client.connect();

let passed = 0;
let failed = 0;

async function check(label, sql, predicate) {
  const result = await client.query(sql);
  const value = Number(result.rows[0]?.total ?? 0);
  const ok = predicate(value);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${value}`);
  if (ok) passed += 1;
  else failed += 1;
}

try {
  await check(
    'seed has lit cabinet entries',
    "select count(*)::int total from user_goods where status = 'owned' and lit_at is not null",
    (value) => value > 0,
  );
  await check(
    'seed has saved-but-unlit cabinet entries',
    "select count(*)::int total from user_goods where status = 'owned' and lit_at is null",
    (value) => value > 0,
  );
  await check(
    'non-owned states can never be lit',
    "select count(*)::int total from user_goods where status <> 'owned' and lit_at is not null",
    (value) => value === 0,
  );
  await check(
    'tradable inventory always has a lit owned row',
    `select count(*)::int total
       from user_goods exchange_row
      where exchange_row.status = 'exchange'
        and exchange_row.tradable_quantity > 0
        and not exists (
          select 1 from user_goods owned_row
           where owned_row.user_id = exchange_row.user_id
             and owned_row.goods_id = exchange_row.goods_id
             and owned_row.status = 'owned'
             and owned_row.lit_at is not null
             and owned_row.quantity >= exchange_row.tradable_quantity
        )`,
    (value) => value === 0,
  );
  await check(
    'active exchanges always have an unreleased inventory reservation',
    `select count(*)::int total
       from exchanges
      where status in ('accepted', 'shipping', 'received')
        and (inventory_reserved_at is null or inventory_released_at is not null)`,
    (value) => value === 0,
  );
  await check(
    'recognition proof table has no client policies',
    "select count(*)::int total from pg_policies where schemaname = 'public' and tablename = 'recognition_attempts'",
    (value) => value === 0,
  );
} finally {
  await client.end();
}

console.log(`lighting verification: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
