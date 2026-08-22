-- Strict lighting cannot safely continue a legacy fulfillment row that never
-- reserved inventory through the server domain transaction. Stop those rows
-- instead of allowing shipping/receipt to complete without a lit SKU.
UPDATE "exchanges"
SET "status" = 'cancelled',
    "cancelled_at" = coalesce("cancelled_at", now()),
    "note" = concat_ws(E'\n', nullif("note", ''), '系统迁移：该换谷单缺少点亮库存预留，已停止履约。'),
    "updated_at" = now()
WHERE "status" IN ('accepted', 'shipping', 'received')
  AND ("inventory_reserved_at" IS NULL OR "inventory_released_at" IS NOT NULL);
--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_active_inventory_reserved_check" CHECK ("exchanges"."status" not in ('accepted', 'shipping', 'received') or ("exchanges"."inventory_reserved_at" is not null and "exchanges"."inventory_released_at" is null));
