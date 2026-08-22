-- Runtime support for these legacy entry points has been removed. Preserve the
-- historical tables while ensuring no old row remains publicly actionable.
UPDATE "exchange_listings"
SET "status" = 'closed', "allow_cash" = false, "updated_at" = now()
WHERE "status" <> 'closed' OR "allow_cash" = true;

UPDATE "listings"
SET "status" = 'removed', "updated_at" = now()
WHERE "status" IN ('active', 'reserved');

UPDATE "want_orders"
SET "status" = 'cancelled', "updated_at" = now()
WHERE "status" = 'open';

UPDATE "orders"
SET "status" = 'cancelled', "updated_at" = now()
WHERE "status" IN ('created', 'awaiting_payment');
