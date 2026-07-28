/**
 * Exercises the row level security policies from migration 0008 against a real
 * database seeded with `pnpm db:seed`.
 *
 * These policies are not on the current request path — the app connects as the
 * table owner, which bypasses RLS — so nothing else would notice if they broke.
 * That is exactly why they need a check of their own.
 *
 * Run with DATABASE_URL set, after migrate + seed.
 */
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

const { Client } = pg;

const MIKA = '20000000-0000-4000-8000-000000000001';
const REN = '20000000-0000-4000-8000-000000000002';

let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  const ok = actual === expected;

  if (ok) {
    pass += 1;
  } else {
    fail += 1;
  }

  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} got=${actual} want=${expected}`,
  );
}

async function asClient(client, uid, sql, params = []) {
  await client.query('begin');

  try {
    await client.query('set local role app_client');

    if (uid) {
      await client.query(`set local request.jwt.claim.sub = '${uid}'`);
    }

    return await client.query(sql, params);
  } finally {
    await client.query('rollback');
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to verify RLS policies.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  // Stands in for Supabase's anon / authenticated roles: owns nothing, so the
  // policies are enforced instead of bypassed.
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_client') THEN
      CREATE ROLE app_client NOLOGIN;
    END IF;
  END $$`);
  await client.query('grant usage on schema public, auth to app_client');
  await client.query(
    'grant select, insert, update, delete on all tables in schema public to app_client',
  );
  await client.query(
    'grant execute on all functions in schema auth to app_client',
  );

  console.log('owner role (the app connection) bypasses RLS');
  check(
    'owner sees goods',
    (await client.query('select count(*)::int n from goods')).rows[0].n > 0,
    true,
  );

  console.log('anonymous client');
  for (const [label, sql] of [
    [
      'no unpublished goods',
      "select count(*)::int n from goods where status <> 'published'",
    ],
    ['no collection rows', 'select count(*)::int n from user_goods'],
    [
      'no unapproved posts',
      "select count(*)::int n from posts where moderation_status <> 'approved'",
    ],
    [
      'no image embeddings',
      'select count(*)::int n from goods_image_embeddings',
    ],
    [
      'no catalog submissions',
      'select count(*)::int n from catalog_submissions',
    ],
  ]) {
    check(label, (await asClient(client, null, sql)).rows[0].n, 0);
  }

  console.log('authenticated client');
  const own = (
    await client.query(
      'select count(*)::int n from user_goods where user_id = $1',
      [MIKA],
    )
  ).rows[0].n;

  check(
    'sees own collection',
    (await asClient(client, MIKA, 'select count(*)::int n from user_goods'))
      .rows[0].n,
    own,
  );
  check(
    'sees no other collection',
    (
      await asClient(
        client,
        MIKA,
        'select count(*)::int n from user_goods where user_id <> $1',
        [MIKA],
      )
    ).rows[0].n,
    0,
  );

  let blocked = false;
  try {
    await asClient(
      client,
      MIKA,
      "insert into user_goods (user_id, goods_id, status) select $1, id, 'owned' from goods limit 1",
      [REN],
    );
  } catch {
    blocked = true;
  }
  check('cannot write as another user', blocked, true);

  console.log('profile visibility');
  await client.query(
    "update profiles set visibility = 'private' where id = $1",
    [REN],
  );
  check(
    'private profile hidden from anon',
    (
      await asClient(
        client,
        null,
        'select count(*)::int n from profiles where id = $1',
        [REN],
      )
    ).rows[0].n,
    0,
  );
  check(
    'private profile visible to its owner',
    (
      await asClient(
        client,
        REN,
        'select count(*)::int n from profiles where id = $1',
        [REN],
      )
    ).rows[0].n,
    1,
  );
  await client.query(
    "update profiles set visibility = 'public' where id = $1",
    [REN],
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  await client.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
