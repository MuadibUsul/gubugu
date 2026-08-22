-- 0019 及更早版本允许未扫描库存参与换谷。启用严格点亮规则时，旧协商不能
-- 继续沿用；保留履约中的换谷单，但关闭尚未成交的帖子与出价，等待用户重新
-- 扫描并明确开放库存。
UPDATE "exchange_offers"
SET "status" = 'expired', "decided_at" = now(), "updated_at" = now()
WHERE "status" = 'pending';
--> statement-breakpoint
UPDATE "exchange_listings"
SET "status" = 'closed', "updated_at" = now()
WHERE "status" IN ('open', 'paused');
--> statement-breakpoint
UPDATE "user_goods"
SET "tradable_quantity" = 0, "updated_at" = now()
WHERE "status" = 'exchange';
--> statement-breakpoint
-- 历史成就是由可手动伪造的 owned 状态计算出来的，不能冒充扫描点亮记录。
DELETE FROM "user_achievements";
