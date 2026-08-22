CREATE TYPE "public"."wishlist_priority" AS ENUM('normal', 'super_want');--> statement-breakpoint
ALTER TABLE "user_goods" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_goods" ADD COLUMN "tradable_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_goods" ADD COLUMN "wishlist_priority" "wishlist_priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
-- 旧有 exchange 状态原本即表示“可换”，迁移后保留这一语义。
UPDATE "user_goods" SET "tradable_quantity" = "quantity" WHERE "status" = 'exchange';--> statement-breakpoint
CREATE INDEX "user_goods_wishlist_priority_idx" ON "user_goods" USING btree ("wishlist_priority");--> statement-breakpoint
ALTER TABLE "user_goods" ADD CONSTRAINT "user_goods_quantity_positive_check" CHECK ("user_goods"."quantity" >= 1);--> statement-breakpoint
ALTER TABLE "user_goods" ADD CONSTRAINT "user_goods_tradable_quantity_range_check" CHECK ("user_goods"."tradable_quantity" >= 0 and "user_goods"."tradable_quantity" <= "user_goods"."quantity");
