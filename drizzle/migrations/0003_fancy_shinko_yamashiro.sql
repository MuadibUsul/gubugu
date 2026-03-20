CREATE TYPE "public"."exchange_fulfillment_method" AS ENUM('shipping', 'meetup', 'either');--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "wanted_goods_id" uuid;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "allow_multi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "allow_cash" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "fulfillment_method" "exchange_fulfillment_method" DEFAULT 'either' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_wanted_goods_id_goods_id_fk" FOREIGN KEY ("wanted_goods_id") REFERENCES "public"."goods"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "exchange_listings_wanted_goods_id_idx" ON "exchange_listings" USING btree ("wanted_goods_id");--> statement-breakpoint
CREATE INDEX "exchange_listings_fulfillment_method_idx" ON "exchange_listings" USING btree ("fulfillment_method");--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_goods_pair_check" CHECK ("exchange_listings"."wanted_goods_id" is null or "exchange_listings"."wanted_goods_id" <> "exchange_listings"."goods_id");