WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY user_id, goods_id
      ORDER BY updated_at DESC, id DESC
    ) AS position
  FROM exchange_listings
  WHERE status IN ('open', 'paused')
)
UPDATE exchange_offers
SET status = 'expired', decided_at = now(), updated_at = now()
WHERE status = 'pending'
  AND listing_id IN (SELECT id FROM ranked WHERE position > 1);--> statement-breakpoint
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY user_id, goods_id
      ORDER BY updated_at DESC, id DESC
    ) AS position
  FROM exchange_listings
  WHERE status IN ('open', 'paused')
)
UPDATE exchange_listings
SET status = 'closed', updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE position > 1);--> statement-breakpoint
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY least(proposer_id::text, recipient_id::text), greatest(proposer_id::text, recipient_id::text)
      ORDER BY updated_at DESC, id DESC
    ) AS position
  FROM exchange_offers
  WHERE listing_id IS NULL AND status = 'pending'
)
UPDATE exchange_offers
SET status = 'expired', decided_at = now(), updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE position > 1);--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_listings_user_goods_active_unique" ON "exchange_listings" USING btree ("user_id","goods_id") WHERE "exchange_listings"."status" in ('open', 'paused');--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_offers_direct_pair_active_unique" ON "exchange_offers" USING btree (least("proposer_id"::text, "recipient_id"::text),greatest("proposer_id"::text, "recipient_id"::text)) WHERE "exchange_offers"."listing_id" is null and "exchange_offers"."status" = 'pending';
