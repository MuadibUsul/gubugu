CREATE TYPE "public"."condition_grade" AS ENUM('s', 'a', 'b', 'c', 'd');--> statement-breakpoint
CREATE TYPE "public"."goods_verification_status" AS ENUM('verified', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'active', 'reserved', 'sold', 'cancelled', 'removed', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."official_type" AS ENUM('official', 'official_bonus', 'official_limited', 'licensed', 'doujin', 'self_made', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('created', 'awaiting_payment', 'paid', 'awaiting_shipment', 'shipped', 'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded', 'disputed', 'closed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."seller_type" AS ENUM('individual', 'business');--> statement-breakpoint
CREATE TYPE "public"."want_order_status" AS ENUM('open', 'fulfilled', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"storage_path" text,
	"alt_text" varchar(255),
	"photo_angle" varchar(48),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'CNY' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"condition_grade" "condition_grade" NOT NULL,
	"condition_details" text,
	"shipping_method" varchar(64) DEFAULT 'shipping' NOT NULL,
	"shipping_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"moderation_status" "moderation_status" DEFAULT 'approved' NOT NULL,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_price_non_negative_check" CHECK ("listings"."price" >= 0),
	CONSTRAINT "listings_shipping_fee_non_negative_check" CHECK ("listings"."shipping_fee" >= 0),
	CONSTRAINT "listings_quantity_positive_check" CHECK ("listings"."quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "market_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_id" uuid NOT NULL,
	"order_id" uuid,
	"seller_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'CNY' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"condition_grade" "condition_grade" NOT NULL,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_transactions_price_non_negative_check" CHECK ("market_transactions"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" varchar(32) NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"listing_id" uuid,
	"goods_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"item_price" numeric(10, 2) NOT NULL,
	"shipping_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'CNY' NOT NULL,
	"condition_grade" "condition_grade" NOT NULL,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"listing_snapshot" jsonb NOT NULL,
	"goods_snapshot" jsonb NOT NULL,
	"address_snapshot" jsonb,
	"payment_provider" varchar(64),
	"payment_reference" varchar(128),
	"shipping_carrier" varchar(64),
	"tracking_no" varchar(128),
	"paid_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_price_non_negative_check" CHECK ("orders"."total_price" >= 0),
	CONSTRAINT "orders_quantity_positive_check" CHECK ("orders"."quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"provider_reference" varchar(128),
	"amount" numeric(10, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'CNY' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "want_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "want_order_status" DEFAULT 'open' NOT NULL,
	"max_price" numeric(10, 2),
	"currency_code" varchar(3) DEFAULT 'CNY' NOT NULL,
	"min_condition_grade" "condition_grade" DEFAULT 'd' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"region" varchar(64),
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "want_orders_max_price_non_negative_check" CHECK ("want_orders"."max_price" is null or "want_orders"."max_price" >= 0),
	CONSTRAINT "want_orders_quantity_positive_check" CHECK ("want_orders"."quantity" >= 1)
);
--> statement-breakpoint
ALTER TABLE "goods" ADD COLUMN "manufacturer" varchar(128);--> statement-breakpoint
ALTER TABLE "goods" ADD COLUMN "region" varchar(64);--> statement-breakpoint
ALTER TABLE "goods" ADD COLUMN "official_type" "official_type" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "goods" ADD COLUMN "verification_status" "goods_verification_status" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "seller_type" "seller_type" DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_transactions" ADD CONSTRAINT "market_transactions_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_transactions" ADD CONSTRAINT "market_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "want_orders" ADD CONSTRAINT "want_orders_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_photos_listing_id_sort_order_unique" ON "listing_photos" USING btree ("listing_id","sort_order");--> statement-breakpoint
CREATE INDEX "listing_photos_listing_id_idx" ON "listing_photos" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_goods_id_idx" ON "listings" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "listings_seller_id_idx" ON "listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_goods_status_price_idx" ON "listings" USING btree ("goods_id","status","price");--> statement-breakpoint
CREATE INDEX "market_transactions_goods_id_idx" ON "market_transactions" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "market_transactions_goods_sold_at_idx" ON "market_transactions" USING btree ("goods_id","sold_at");--> statement-breakpoint
CREATE INDEX "market_transactions_seller_id_idx" ON "market_transactions" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "market_transactions_buyer_id_idx" ON "market_transactions" USING btree ("buyer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_no_unique" ON "orders" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "orders_buyer_id_idx" ON "orders" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "orders_seller_id_idx" ON "orders" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "orders_goods_id_idx" ON "orders" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_provider_reference_idx" ON "payments" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "want_orders_goods_id_idx" ON "want_orders" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "want_orders_user_id_idx" ON "want_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "want_orders_status_idx" ON "want_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goods_official_type_idx" ON "goods" USING btree ("official_type");