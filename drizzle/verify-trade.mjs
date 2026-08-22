/**
 * Verifies the database half of the exchange anti-abuse and inventory rules.
 * The whole suite runs in one transaction and always rolls back.
 *
 * Run after migrate + seed with `pnpm db:verify-trade`.
 */
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

const { Client } = pg;

const SEEDED_OFFER = '51000000-0000-4000-8000-000000000001';
const STRICT_LISTING = '50000000-0000-4000-8000-000000000001';
const OPEN_LISTING = '50000000-0000-4000-8000-000000000002';

let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) pass += 1;
  else fail += 1;
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} got=${actual} want=${expected}`,
  );
}

async function expectRejected(client, label, query, params = []) {
  await client.query('savepoint expected_rejection');
  let rejected = false;
  try {
    await client.query(query, params);
  } catch {
    rejected = true;
  } finally {
    await client.query('rollback to savepoint expected_rejection');
    await client.query('release savepoint expected_rejection');
  }
  check(label, rejected, true);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to verify trade constraints.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('begin');

  try {
    check(
      'seeded negotiation is available',
      Number(
        (
          await client.query(
            'select count(*) n from exchange_offers where id = $1',
            [SEEDED_OFFER],
          )
        ).rows[0].n,
      ),
      1,
    );

    await expectRejected(
      client,
      'counter count cannot exceed three',
      'update exchange_offers set counter_count = 4 where id = $1',
      [SEEDED_OFFER],
    );
    await expectRejected(
      client,
      'a fourth immutable revision is rejected',
      `insert into exchange_offer_revisions
        (offer_id, revision_number, actor_id, offered_goods_id, requested_goods_id,
         offered_quantity, requested_quantity, fulfillment_method)
       select offer_id, 4, actor_id, offered_goods_id, requested_goods_id,
         offered_quantity, requested_quantity, fulfillment_method
       from exchange_offer_revisions
       where offer_id = $1 limit 1`,
      [SEEDED_OFFER],
    );
    await expectRejected(
      client,
      'cash can never be enabled on a barter listing',
      'update exchange_listings set allow_cash = true where id = $1',
      [STRICT_LISTING],
    );
    await expectRejected(
      client,
      'one user cannot open duplicate listings for one SKU',
      `update exchange_listings target
       set user_id = source.user_id, goods_id = source.goods_id
       from exchange_listings source
       where target.id = $1 and source.id = $2`,
      [OPEN_LISTING, STRICT_LISTING],
    );
    await expectRejected(
      client,
      'active exchange cannot exist without an inventory reservation',
      `update exchanges
          set status = 'accepted', inventory_reserved_at = null
        where id = '40000000-0000-4000-8000-000000000001'`,
    );

    await client.query(
      `insert into exchange_offers
        (id, proposer_id, recipient_id, awaiting_user_id, status, counter_count)
       values
        ('5f000000-0000-4000-8000-000000000001',
         '2f000000-0000-4000-8000-000000000001',
         '2f000000-0000-4000-8000-000000000002',
         '2f000000-0000-4000-8000-000000000002', 'pending', 0)`,
    );
    await expectRejected(
      client,
      'reverse direct offer cannot open a second negotiation',
      `insert into exchange_offers
        (id, proposer_id, recipient_id, awaiting_user_id, status, counter_count)
       values
        ('5f000000-0000-4000-8000-000000000002',
         '2f000000-0000-4000-8000-000000000002',
         '2f000000-0000-4000-8000-000000000001',
         '2f000000-0000-4000-8000-000000000001', 'pending', 0)`,
    );

    const inventory = (
      await client.query(
        `select id, tradable_quantity
         from user_goods
         where status = 'exchange' and tradable_quantity > 0
         order by id limit 1
         for update`,
      )
    ).rows[0];
    check('seed contains reservable inventory', Boolean(inventory), true);
    if (inventory) {
      const requested = Number(inventory.tradable_quantity);
      check(
        'first guarded reservation succeeds',
        (
          await client.query(
            `update user_goods
             set tradable_quantity = tradable_quantity - $2
             where id = $1 and tradable_quantity >= $2
             returning id`,
            [inventory.id, requested],
          )
        ).rowCount,
        1,
      );
      check(
        'second guarded reservation cannot overdraw',
        (
          await client.query(
            `update user_goods
             set tradable_quantity = tradable_quantity - $2
             where id = $1 and tradable_quantity >= $2
             returning id`,
            [inventory.id, requested],
          )
        ).rowCount,
        0,
      );
    }
  } finally {
    await client.query('rollback');
    await client.end();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
