CREATE TYPE "public"."coordination_status" AS ENUM('proposed', 'accepted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('post', 'exchange_listing', 'exchange');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'watch_available';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'report_resolved';--> statement-breakpoint
CREATE TABLE "coordination_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_id" uuid NOT NULL,
	"participant_ids" uuid[] NOT NULL,
	"accepted_user_ids" uuid[] DEFAULT '{}' NOT NULL,
	"cycle_snapshot" jsonb NOT NULL,
	"status" "coordination_status" DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exchange_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_reviews_score_range_check" CHECK ("exchange_reviews"."score" between 1 and 5),
	CONSTRAINT "exchange_reviews_distinct_users_check" CHECK ("exchange_reviews"."reviewer_id" <> "exchange_reviews"."reviewee_id")
);
--> statement-breakpoint
CREATE TABLE "goods_watches" (
	"user_id" uuid NOT NULL,
	"goods_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goods_watches_pkey" PRIMARY KEY("user_id","goods_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" varchar(64) NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"resolution_note" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "initiator_shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "recipient_shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "initiator_received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "recipient_received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exchange_reviews" ADD CONSTRAINT "exchange_reviews_exchange_id_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."exchanges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_watches" ADD CONSTRAINT "goods_watches_goods_id_goods_id_fk" FOREIGN KEY ("goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coordination_proposals_initiator_idx" ON "coordination_proposals" USING btree ("initiator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_reviews_exchange_reviewer_unique" ON "exchange_reviews" USING btree ("exchange_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "exchange_reviews_reviewee_idx" ON "exchange_reviews" USING btree ("reviewee_id");--> statement-breakpoint
CREATE INDEX "goods_watches_goods_idx" ON "goods_watches" USING btree ("goods_id");--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");
--> statement-breakpoint
ALTER TABLE "exchange_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "goods_watches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "coordination_proposals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "exchange_reviews_public_read" ON "exchange_reviews" FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY "reports_self_read" ON "reports" FOR SELECT USING (reporter_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "goods_watches_self_read" ON "goods_watches" FOR SELECT
  USING (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "coordination_participant_read" ON "coordination_proposals" FOR SELECT
  USING (auth.uid() = ANY(participant_ids));
--> statement-breakpoint
-- Web 与 /api/v1 的领域服务是唯一写入口。撤销早期为直连 Supabase 客户端
-- 预留的写策略，避免绕过服务端数量、状态机、审核与匹配校验。
DROP POLICY IF EXISTS "profiles_self_update" ON "profiles";
--> statement-breakpoint
DROP POLICY IF EXISTS "user_goods_self_all" ON "user_goods";
--> statement-breakpoint
CREATE POLICY "user_goods_self_read" ON "user_goods" FOR SELECT
  USING (user_id = auth.uid());
--> statement-breakpoint
DROP POLICY IF EXISTS "posts_self_insert" ON "posts";
--> statement-breakpoint
DROP POLICY IF EXISTS "ratings_self_write" ON "ratings";
--> statement-breakpoint
DROP POLICY IF EXISTS "exchange_listings_self_write" ON "exchange_listings";
--> statement-breakpoint
DROP POLICY IF EXISTS "catalog_submissions_self_insert" ON "catalog_submissions";
--> statement-breakpoint
DROP POLICY IF EXISTS "user_achievements_self_insert" ON "user_achievements";
--> statement-breakpoint
DROP POLICY IF EXISTS "exchanges_initiator_insert" ON "exchanges";
--> statement-breakpoint
DROP POLICY IF EXISTS "notifications_recipient_update" ON "notifications";
--> statement-breakpoint
DROP POLICY IF EXISTS "follows_self_write" ON "follows";
--> statement-breakpoint
DROP POLICY IF EXISTS "profiles_public_read" ON "profiles";
--> statement-breakpoint
CREATE POLICY "profiles_browsable_read" ON "profiles" FOR SELECT USING (
  visibility = 'public' OR id = auth.uid() OR (
    visibility = 'followers' AND EXISTS (
      SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.following_id = profiles.id
    )
  )
);
