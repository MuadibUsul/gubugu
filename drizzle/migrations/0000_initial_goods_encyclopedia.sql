CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."entity_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."exchange_listing_status" AS ENUM('open', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('visible', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."user_goods_status" AS ENUM('owned', 'wanted', 'exchange');--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_id" uuid NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_localized" varchar(255),
	"description" text,
	"avatar_image_url" text,
	"status" "entity_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "exchange_listing_status" DEFAULT 'open' NOT NULL,
	"description" text NOT NULL,
	"condition_note" text,
	"location_hint" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_listings_description_not_empty_check" CHECK (char_length(trim("exchange_listings"."description")) > 0)
);
--> statement-breakpoint
CREATE TABLE "goods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"sku_code" varchar(128) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"goods_type" varchar(64) NOT NULL,
	"material" varchar(128),
	"size_label" varchar(128),
	"edition" varchar(128),
	"release_date" date,
	"msrp_amount" numeric(10, 2),
	"currency_code" varchar(3),
	"metadata" jsonb,
	"status" "entity_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goods_msrp_amount_non_negative_check" CHECK ("goods"."msrp_amount" is null or "goods"."msrp_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "goods_characters" (
	"goods_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goods_characters_pkey" PRIMARY KEY("goods_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "goods_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_tags" (
	"goods_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goods_tags_pkey" PRIMARY KEY("goods_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "ips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_localized" varchar(255),
	"description" text,
	"cover_image_url" text,
	"status" "entity_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "post_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_body_not_empty_check" CHECK (char_length(trim("posts"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_score_range_check" CHECK ("ratings"."score" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_id" uuid NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cover_image_url" text,
	"series_type" varchar(64) DEFAULT 'standard' NOT NULL,
	"release_date" date,
	"status" "entity_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_goods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goods_id" uuid NOT NULL,
	"status" "user_goods_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_ip_id_ips_id_fk" FOREIGN KEY ("ip_id") REFERENCES "public"."ips"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods" ADD CONSTRAINT "goods_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_characters" ADD CONSTRAINT "goods_characters_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_characters" ADD CONSTRAINT "goods_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_images" ADD CONSTRAINT "goods_images_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_tags" ADD CONSTRAINT "goods_tags_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_tags" ADD CONSTRAINT "goods_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_ip_id_ips_id_fk" FOREIGN KEY ("ip_id") REFERENCES "public"."ips"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_goods" ADD CONSTRAINT "user_goods_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "characters_ip_id_slug_unique" ON "characters" USING btree ("ip_id","slug");--> statement-breakpoint
CREATE INDEX "characters_ip_id_idx" ON "characters" USING btree ("ip_id");--> statement-breakpoint
CREATE INDEX "characters_status_idx" ON "characters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exchange_listings_goods_id_idx" ON "exchange_listings" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "exchange_listings_user_id_idx" ON "exchange_listings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exchange_listings_status_idx" ON "exchange_listings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "goods_sku_code_unique" ON "goods" USING btree ("sku_code");--> statement-breakpoint
CREATE UNIQUE INDEX "goods_slug_unique" ON "goods" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "goods_series_id_idx" ON "goods" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "goods_goods_type_idx" ON "goods" USING btree ("goods_type");--> statement-breakpoint
CREATE INDEX "goods_status_idx" ON "goods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goods_characters_character_id_idx" ON "goods_characters" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goods_images_goods_id_sort_order_unique" ON "goods_images" USING btree ("goods_id","sort_order");--> statement-breakpoint
CREATE INDEX "goods_images_goods_id_idx" ON "goods_images" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "goods_tags_tag_id_idx" ON "goods_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ips_slug_unique" ON "ips" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ips_status_idx" ON "ips" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "post_images_post_id_sort_order_unique" ON "post_images" USING btree ("post_id","sort_order");--> statement-breakpoint
CREATE INDEX "post_images_post_id_idx" ON "post_images" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "posts_goods_id_idx" ON "posts" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "posts_user_id_idx" ON "posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_user_id_goods_id_unique" ON "ratings" USING btree ("user_id","goods_id");--> statement-breakpoint
CREATE INDEX "ratings_goods_id_idx" ON "ratings" USING btree ("goods_id");--> statement-breakpoint
CREATE UNIQUE INDEX "series_ip_id_slug_unique" ON "series" USING btree ("ip_id","slug");--> statement-breakpoint
CREATE INDEX "series_ip_id_idx" ON "series" USING btree ("ip_id");--> statement-breakpoint
CREATE INDEX "series_status_idx" ON "series" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_unique" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_goods_user_id_goods_id_status_unique" ON "user_goods" USING btree ("user_id","goods_id","status");--> statement-breakpoint
CREATE INDEX "user_goods_user_id_idx" ON "user_goods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_goods_goods_id_idx" ON "user_goods" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "user_goods_status_idx" ON "user_goods" USING btree ("status");
