/**
 * Exercises the row level security policies from migration 0008 against a real
 * database seeded with `pnpm db:seed`.
 *
 * These policies are not on the current request path — the restricted Web role
 * still uses BYPASSRLS for the server-side session model — so request tests
 * would not notice if they broke. That is why they need a check of their own.
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
const ASTER = '20000000-0000-4000-8000-000000000003';

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

  // 模拟一个不拥有任何表的普通数据库角色：应用自身以属主连接会绕过 RLS，
  // 只有这样的角色才会真正触发策略判定。
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
      'no recognition proof rows',
      'select count(*)::int n from recognition_attempts',
    ],
    ['no private user scans', 'select count(*)::int n from user_scans'],
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
    ['no exchange fulfillment rows', 'select count(*)::int n from exchanges'],
    ['no notifications', 'select count(*)::int n from notifications'],
    ['no reports', 'select count(*)::int n from reports'],
    ['no exchange offers', 'select count(*)::int n from exchange_offers'],
    [
      'no exchange offer revisions',
      'select count(*)::int n from exchange_offer_revisions',
    ],
    [
      'no private conversations',
      'select count(*)::int n from direct_conversations',
    ],
    ['no private messages', 'select count(*)::int n from direct_messages'],
    ['no user blocks', 'select count(*)::int n from user_blocks'],
    ['no goods watches', 'select count(*)::int n from goods_watches'],
    [
      'no local auth accounts',
      'select count(*)::int n from local_auth_accounts',
    ],
    ['no crawler sources', 'select count(*)::int n from crawler_sources'],
    ['no crawler runs', 'select count(*)::int n from crawler_runs'],
    ['no crawler drafts', 'select count(*)::int n from crawler_drafts'],
    [
      'no crawler crawl progress',
      'select count(*)::int n from crawler_crawl_progress',
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
  check(
    'cannot read recognition proof rows',
    (
      await asClient(
        client,
        MIKA,
        'select count(*)::int n from recognition_attempts',
      )
    ).rows[0].n,
    0,
  );

  const rlsScanId = '66000000-0000-4000-8000-000000000001';
  await client.query(
    `insert into user_scans (id, user_id, image_url, top_score)
     values ($1, $2, $3, 42) on conflict (id) do nothing`,
    [rlsScanId, MIKA, `${'a'.repeat(64)}.webp`],
  );
  try {
    check(
      'owner can read own private scan',
      (
        await asClient(
          client,
          MIKA,
          'select count(*)::int n from user_scans where id = $1',
          [rlsScanId],
        )
      ).rows[0].n,
      1,
    );
    check(
      'another user cannot read a private scan',
      (
        await asClient(
          client,
          REN,
          'select count(*)::int n from user_scans where id = $1',
          [rlsScanId],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await client.query('delete from user_scans where id = $1', [rlsScanId]);
  }

  const forgedLighting = await asClient(
    client,
    MIKA,
    'update user_goods set lit_at = now() where user_id = $1 returning id',
    [MIKA],
  );
  check('cannot forge collection lighting', forgedLighting.rowCount, 0);

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

  blocked = false;
  try {
    await asClient(
      client,
      MIKA,
      'insert into follows (follower_id, following_id) values ($1, $2)',
      [REN, MIKA],
    );
  } catch {
    blocked = true;
  }
  check('cannot create follow as another user', blocked, true);

  blocked = false;
  try {
    await asClient(
      client,
      MIKA,
      'insert into follows (follower_id, following_id) values ($1, $2)',
      [MIKA, '20000000-0000-4000-8000-000000000099'],
    );
  } catch {
    blocked = true;
  }
  check('all writes must use the server domain layer', blocked, true);

  for (const [label, sql, params] of [
    [
      'cannot forge a report through the data API',
      "insert into reports (reporter_id, target_type, target_id, reason) values ($1, 'post', '42000000-0000-4000-8000-000000000001', 'forged')",
      [MIKA],
    ],
    [
      'cannot forge an exchange review through the data API',
      'insert into exchange_reviews (exchange_id, reviewer_id, reviewee_id, score) select id, $1, $2, 5 from exchanges limit 1',
      [MIKA, REN],
    ],
    [
      'cannot forge a coordination proposal through the data API',
      "insert into coordination_proposals (initiator_id, participant_ids, cycle_snapshot) values ($1, array[$1, $2]::uuid[], '{}'::jsonb)",
      [MIKA, REN],
    ],
    [
      'cannot forge a trade offer through the data API',
      'insert into exchange_offers (proposer_id, recipient_id, awaiting_user_id) values ($1, $2, $2)',
      [MIKA, REN],
    ],
    [
      'cannot forge a private message through the data API',
      "insert into direct_messages (conversation_id, sender_id, body) select id, $1, 'forged' from direct_conversations limit 1",
      [MIKA],
    ],
    [
      'cannot forge a user block through the data API',
      'insert into user_blocks (blocker_id, blocked_id) values ($1, $2)',
      [MIKA, REN],
    ],
    [
      'cannot forge a recognition proof through the data API',
      "insert into recognition_attempts (user_id, source, provider, expires_at) values ($1, 'camera', 'embedding-search', now() + interval '15 minutes')",
      [MIKA],
    ],
    [
      'cannot forge a private scan through the data API',
      'insert into user_scans (user_id, image_url) values ($1, $2)',
      [MIKA, `${'b'.repeat(64)}.webp`],
    ],
    [
      'cannot create a crawler source through the data API',
      "insert into crawler_sources (name, entry_url, created_by) values ('forged', 'https://example.com', $1)",
      [MIKA],
    ],
  ]) {
    blocked = false;
    try {
      await asClient(client, MIKA, sql, params);
    } catch {
      blocked = true;
    }
    check(label, blocked, true);
  }

  console.log('trade and private messaging isolation');
  const mikaConversationCount = (
    await client.query(
      'select count(*)::int n from direct_conversations where member_a_id = $1 or member_b_id = $1',
      [MIKA],
    )
  ).rows[0].n;
  const mikaMessageCount = (
    await client.query(
      `select count(*)::int n from direct_messages m
       join direct_conversations c on c.id = m.conversation_id
       where (c.member_a_id = $1 or c.member_b_id = $1) and m.status = 'visible'`,
      [MIKA],
    )
  ).rows[0].n;
  check(
    'participant sees own conversations',
    (
      await asClient(
        client,
        MIKA,
        'select count(*)::int n from direct_conversations',
      )
    ).rows[0].n,
    mikaConversationCount,
  );
  check(
    'participant cannot see another pair conversation',
    (
      await asClient(
        client,
        MIKA,
        'select count(*)::int n from direct_conversations where member_a_id = $1 and member_b_id = $2',
        [REN, ASTER],
      )
    ).rows[0].n,
    0,
  );
  check(
    'participant sees messages only from own conversation',
    (
      await asClient(
        client,
        MIKA,
        'select count(*)::int n from direct_messages',
      )
    ).rows[0].n,
    mikaMessageCount,
  );
  check(
    'client cannot update a private message',
    (
      await asClient(
        client,
        MIKA,
        "update direct_messages set body = 'forged' where id = '53000000-0000-4000-8000-000000000001'",
      )
    ).rowCount,
    0,
  );
  check(
    'client cannot update a private conversation',
    (
      await asClient(
        client,
        MIKA,
        "update direct_conversations set last_message_at = now() where id = '52000000-0000-4000-8000-000000000001'",
      )
    ).rowCount,
    0,
  );

  await client.query(
    "update direct_messages set status = 'hidden' where id = '53000000-0000-4000-8000-000000000001'",
  );
  try {
    check(
      'hidden message is invisible to its participants',
      (
        await asClient(
          client,
          MIKA,
          "select count(*)::int n from direct_messages where id = '53000000-0000-4000-8000-000000000001'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await client.query(
      "update direct_messages set status = 'visible' where id = '53000000-0000-4000-8000-000000000001'",
    );
  }

  const rlsBlockTarget = '20000000-0000-4000-8000-000000000099';
  const insertedBlock = await client.query(
    'insert into user_blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing',
    [MIKA, rlsBlockTarget],
  );
  try {
    check(
      'blocker can read own block record',
      (
        await asClient(
          client,
          MIKA,
          'select count(*)::int n from user_blocks where blocker_id = $1 and blocked_id = $2',
          [MIKA, rlsBlockTarget],
        )
      ).rows[0].n,
      1,
    );
    check(
      'another user cannot read a block record',
      (
        await asClient(
          client,
          REN,
          'select count(*)::int n from user_blocks where blocker_id = $1 and blocked_id = $2',
          [MIKA, rlsBlockTarget],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    if (insertedBlock.rowCount === 1) {
      await client.query(
        'delete from user_blocks where blocker_id = $1 and blocked_id = $2',
        [MIKA, rlsBlockTarget],
      );
    }
  }
  check(
    'offer participant can read the negotiation',
    (
      await asClient(
        client,
        REN,
        'select count(*)::int n from exchange_offers where proposer_id = $1 and recipient_id = $2',
        [ASTER, REN],
      )
    ).rows[0].n > 0,
    true,
  );
  check(
    'non-participant cannot read the negotiation',
    (
      await asClient(
        client,
        MIKA,
        'select count(*)::int n from exchange_offers where proposer_id = $1 and recipient_id = $2',
        [ASTER, REN],
      )
    ).rows[0].n,
    0,
  );

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
    "update profiles set visibility = 'followers' where id = $1",
    [REN],
  );
  check(
    'followers profile hidden from anonymous clients',
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
    'followers profile visible to an actual follower',
    (
      await asClient(
        client,
        MIKA,
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
