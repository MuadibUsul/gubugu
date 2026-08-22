CREATE TYPE "public"."crawler_draft_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."crawler_run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."crawler_run_trigger" AS ENUM('scheduled', 'manual');--> statement-breakpoint
CREATE TABLE "crawler_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"source_key" varchar(255) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "crawler_draft_status" DEFAULT 'pending' NOT NULL,
	"published_goods_id" uuid,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crawler_drafts_source_url_http_check" CHECK ("crawler_drafts"."source_url" ~* '^https?://'),
	CONSTRAINT "crawler_drafts_source_key_not_empty_check" CHECK (char_length(trim("crawler_drafts"."source_key")) > 0),
	CONSTRAINT "crawler_drafts_content_hash_check" CHECK ("crawler_drafts"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "crawler_drafts_title_not_empty_check" CHECK (char_length(trim("crawler_drafts"."title")) > 0),
	CONSTRAINT "crawler_drafts_payload_object_check" CHECK (jsonb_typeof("crawler_drafts"."payload") = 'object'),
	CONSTRAINT "crawler_drafts_review_state_check" CHECK (("crawler_drafts"."status" = 'pending' and "crawler_drafts"."published_goods_id" is null and "crawler_drafts"."reviewed_by" is null and "crawler_drafts"."reviewed_at" is null)
        or ("crawler_drafts"."status" = 'published' and "crawler_drafts"."published_goods_id" is not null and "crawler_drafts"."reviewed_by" is not null and "crawler_drafts"."reviewed_at" is not null)
        or ("crawler_drafts"."status" = 'rejected' and "crawler_drafts"."published_goods_id" is null and "crawler_drafts"."reviewed_by" is not null and "crawler_drafts"."reviewed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "crawler_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crawler_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"trigger" "crawler_run_trigger" NOT NULL,
	"scheduled_for" timestamp with time zone,
	"status" "crawler_run_status" DEFAULT 'running' NOT NULL,
	"discovered_count" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crawler_runs_trigger_schedule_check" CHECK (("crawler_runs"."trigger" = 'scheduled' and "crawler_runs"."scheduled_for" is not null)
        or ("crawler_runs"."trigger" = 'manual' and "crawler_runs"."scheduled_for" is null)),
	CONSTRAINT "crawler_runs_counts_non_negative_check" CHECK ("crawler_runs"."discovered_count" >= 0 and "crawler_runs"."created_count" >= 0
        and "crawler_runs"."updated_count" >= 0 and "crawler_runs"."skipped_count" >= 0
        and "crawler_runs"."failed_count" >= 0),
	CONSTRAINT "crawler_runs_status_finished_check" CHECK (("crawler_runs"."status" = 'running' and "crawler_runs"."finished_at" is null)
        or ("crawler_runs"."status" <> 'running' and "crawler_runs"."finished_at" is not null)),
	CONSTRAINT "crawler_runs_finished_after_started_check" CHECK ("crawler_runs"."finished_at" is null or "crawler_runs"."finished_at" >= "crawler_runs"."started_at")
);
--> statement-breakpoint
ALTER TABLE "crawler_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crawler_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"entry_url" text NOT NULL,
	"detail_path_pattern" varchar(255),
	"allowed_image_hosts" text[] DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"last_succeeded_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crawler_sources_name_not_empty_check" CHECK (char_length(trim("crawler_sources"."name")) > 0),
	CONSTRAINT "crawler_sources_entry_url_http_check" CHECK ("crawler_sources"."entry_url" ~* '^https?://'),
	CONSTRAINT "crawler_sources_detail_pattern_not_empty_check" CHECK ("crawler_sources"."detail_path_pattern" is null or char_length(trim("crawler_sources"."detail_path_pattern")) > 0)
);
--> statement-breakpoint
ALTER TABLE "crawler_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crawler_drafts" ADD CONSTRAINT "crawler_drafts_source_id_crawler_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."crawler_sources"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "crawler_drafts" ADD CONSTRAINT "crawler_drafts_published_goods_id_goods_id_fk" FOREIGN KEY ("published_goods_id") REFERENCES "public"."goods"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "crawler_runs" ADD CONSTRAINT "crawler_runs_source_id_crawler_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."crawler_sources"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "crawler_drafts_source_key_unique" ON "crawler_drafts" USING btree ("source_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "crawler_drafts_published_goods_unique" ON "crawler_drafts" USING btree ("published_goods_id") WHERE "crawler_drafts"."published_goods_id" is not null;--> statement-breakpoint
CREATE INDEX "crawler_drafts_status_created_at_idx" ON "crawler_drafts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "crawler_drafts_source_id_idx" ON "crawler_drafts" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crawler_runs_scheduled_slot_unique" ON "crawler_runs" USING btree ("source_id","scheduled_for") WHERE "crawler_runs"."scheduled_for" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "crawler_runs_source_running_unique" ON "crawler_runs" USING btree ("source_id") WHERE "crawler_runs"."status" = 'running';--> statement-breakpoint
CREATE INDEX "crawler_runs_source_started_at_idx" ON "crawler_runs" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE INDEX "crawler_runs_status_started_at_idx" ON "crawler_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crawler_sources_entry_url_unique" ON "crawler_sources" USING btree ("entry_url");--> statement-breakpoint
CREATE INDEX "crawler_sources_enabled_idx" ON "crawler_sources" USING btree ("enabled") WHERE "crawler_sources"."enabled" = true;--> statement-breakpoint
CREATE INDEX "crawler_sources_created_by_idx" ON "crawler_sources" USING btree ("created_by");
