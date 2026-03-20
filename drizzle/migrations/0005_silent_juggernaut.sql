CREATE TYPE "public"."catalog_submission_target_type" AS ENUM('ip', 'character', 'series', 'goods');--> statement-breakpoint
CREATE TYPE "public"."catalog_submission_type" AS ENUM('create', 'update');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "catalog_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"submission_type" "catalog_submission_type" NOT NULL,
	"target_entity_type" "catalog_submission_target_type" NOT NULL,
	"target_entity_id" uuid,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_submissions_title_not_empty_check" CHECK (char_length(trim("catalog_submissions"."title")) > 0),
	CONSTRAINT "catalog_submissions_body_not_empty_check" CHECK (char_length(trim("catalog_submissions"."body")) > 0),
	CONSTRAINT "catalog_submissions_target_entity_requirement_check" CHECK (("catalog_submissions"."submission_type" = 'create' and "catalog_submissions"."target_entity_id" is null) or ("catalog_submissions"."submission_type" = 'update' and "catalog_submissions"."target_entity_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "post_images" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_images" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "post_images" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "post_images" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "catalog_submissions_user_id_idx" ON "catalog_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "catalog_submissions_moderation_status_idx" ON "catalog_submissions" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "catalog_submissions_target_entity_idx" ON "catalog_submissions" USING btree ("target_entity_type","target_entity_id");--> statement-breakpoint
CREATE INDEX "exchange_listings_moderation_status_idx" ON "exchange_listings" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "post_images_moderation_status_idx" ON "post_images" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "posts_moderation_status_idx" ON "posts" USING btree ("moderation_status");