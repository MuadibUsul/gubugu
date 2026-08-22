CREATE TYPE "public"."exchange_offer_policy" AS ENUM('wishlist_only', 'open_to_offers');--> statement-breakpoint
CREATE TYPE "public"."exchange_offer_status" AS ENUM('pending', 'accepted', 'declined', 'withdrawn', 'expired');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'offer_received' BEFORE 'watch_available';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'offer_countered' BEFORE 'watch_available';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'offer_accepted' BEFORE 'watch_available';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'offer_declined' BEFORE 'watch_available';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'message_received' BEFORE 'watch_available';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'message';--> statement-breakpoint
CREATE TABLE "direct_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_a_id" uuid NOT NULL,
	"member_b_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_conversations_member_order_check" CHECK ("direct_conversations"."member_a_id"::text < "direct_conversations"."member_b_id"::text)
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "post_status" DEFAULT 'visible' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_messages_body_length_check" CHECK (char_length(trim("direct_messages"."body")) between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "exchange_offer_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"revision_number" smallint NOT NULL,
	"actor_id" uuid NOT NULL,
	"offered_goods_id" uuid NOT NULL,
	"requested_goods_id" uuid NOT NULL,
	"offered_quantity" integer DEFAULT 1 NOT NULL,
	"requested_quantity" integer DEFAULT 1 NOT NULL,
	"fulfillment_method" "exchange_fulfillment_method" DEFAULT 'either' NOT NULL,
	"offered_condition_note" text,
	"requested_condition_note" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_offer_revisions_number_range_check" CHECK ("exchange_offer_revisions"."revision_number" between 0 and 3),
	CONSTRAINT "exchange_offer_revisions_distinct_goods_check" CHECK ("exchange_offer_revisions"."offered_goods_id" <> "exchange_offer_revisions"."requested_goods_id"),
	CONSTRAINT "exchange_offer_revisions_quantities_positive_check" CHECK ("exchange_offer_revisions"."offered_quantity" >= 1 and "exchange_offer_revisions"."requested_quantity" >= 1),
	CONSTRAINT "exchange_offer_revisions_message_not_blank_check" CHECK ("exchange_offer_revisions"."message" is null or char_length(trim("exchange_offer_revisions"."message")) > 0)
);
--> statement-breakpoint
CREATE TABLE "exchange_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"proposer_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" "exchange_offer_status" DEFAULT 'pending' NOT NULL,
	"awaiting_user_id" uuid NOT NULL,
	"counter_count" smallint DEFAULT 0 NOT NULL,
	"accepted_exchange_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_offers_distinct_users_check" CHECK ("exchange_offers"."proposer_id" <> "exchange_offers"."recipient_id"),
	CONSTRAINT "exchange_offers_awaiting_participant_check" CHECK ("exchange_offers"."awaiting_user_id" = "exchange_offers"."proposer_id" or "exchange_offers"."awaiting_user_id" = "exchange_offers"."recipient_id"),
	CONSTRAINT "exchange_offers_counter_count_range_check" CHECK ("exchange_offers"."counter_count" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_pkey" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "user_blocks_distinct_users_check" CHECK ("user_blocks"."blocker_id" <> "user_blocks"."blocked_id")
);
--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "offered_quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD COLUMN "offer_policy" "exchange_offer_policy" DEFAULT 'wishlist_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "offered_quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "requested_quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "inventory_reserved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "inventory_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_direct_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_conversations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exchange_offer_revisions" ADD CONSTRAINT "exchange_offer_revisions_offer_id_exchange_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."exchange_offers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exchange_offer_revisions" ADD CONSTRAINT "exchange_offer_revisions_offered_goods_id_goods_id_fk" FOREIGN KEY ("offered_goods_id") REFERENCES "public"."goods"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exchange_offer_revisions" ADD CONSTRAINT "exchange_offer_revisions_requested_goods_id_goods_id_fk" FOREIGN KEY ("requested_goods_id") REFERENCES "public"."goods"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exchange_offers" ADD CONSTRAINT "exchange_offers_listing_id_exchange_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."exchange_listings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exchange_offers" ADD CONSTRAINT "exchange_offers_accepted_exchange_id_exchanges_id_fk" FOREIGN KEY ("accepted_exchange_id") REFERENCES "public"."exchanges"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "direct_conversations_members_unique" ON "direct_conversations" USING btree ("member_a_id","member_b_id");--> statement-breakpoint
CREATE INDEX "direct_conversations_member_a_updated_idx" ON "direct_conversations" USING btree ("member_a_id","updated_at");--> statement-breakpoint
CREATE INDEX "direct_conversations_member_b_updated_idx" ON "direct_conversations" USING btree ("member_b_id","updated_at");--> statement-breakpoint
CREATE INDEX "direct_messages_conversation_created_idx" ON "direct_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "direct_messages_sender_id_idx" ON "direct_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "direct_messages_unread_idx" ON "direct_messages" USING btree ("conversation_id","created_at") WHERE "direct_messages"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_offer_revisions_offer_number_unique" ON "exchange_offer_revisions" USING btree ("offer_id","revision_number");--> statement-breakpoint
CREATE INDEX "exchange_offer_revisions_offer_created_idx" ON "exchange_offer_revisions" USING btree ("offer_id","created_at");--> statement-breakpoint
CREATE INDEX "exchange_offer_revisions_offered_goods_idx" ON "exchange_offer_revisions" USING btree ("offered_goods_id");--> statement-breakpoint
CREATE INDEX "exchange_offer_revisions_requested_goods_idx" ON "exchange_offer_revisions" USING btree ("requested_goods_id");--> statement-breakpoint
CREATE INDEX "exchange_offers_listing_id_idx" ON "exchange_offers" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "exchange_offers_proposer_id_idx" ON "exchange_offers" USING btree ("proposer_id");--> statement-breakpoint
CREATE INDEX "exchange_offers_recipient_id_idx" ON "exchange_offers" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "exchange_offers_awaiting_user_id_idx" ON "exchange_offers" USING btree ("awaiting_user_id");--> statement-breakpoint
CREATE INDEX "exchange_offers_status_updated_at_idx" ON "exchange_offers" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_offers_listing_proposer_unique" ON "exchange_offers" USING btree ("listing_id","proposer_id") WHERE "exchange_offers"."listing_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_offers_direct_active_unique" ON "exchange_offers" USING btree ("proposer_id","recipient_id") WHERE "exchange_offers"."listing_id" is null and "exchange_offers"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_conversation_id_direct_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_conversations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "exchange_listings_offer_policy_idx" ON "exchange_listings" USING btree ("offer_policy");--> statement-breakpoint
CREATE INDEX "notifications_conversation_id_idx" ON "notifications" USING btree ("conversation_id");--> statement-breakpoint
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY reporter_id, target_type, target_id
      ORDER BY created_at, id
    ) AS position
  FROM reports
  WHERE status = 'pending'
)
UPDATE reports
SET status = 'rejected',
  resolution_note = '迁移时合并重复待处理举报',
  resolved_at = now(),
  updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE position > 1);--> statement-breakpoint
CREATE UNIQUE INDEX "reports_pending_reporter_target_unique" ON "reports" USING btree ("reporter_id","target_type","target_id") WHERE "reports"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_offered_quantity_positive_check" CHECK ("exchange_listings"."offered_quantity" >= 1);--> statement-breakpoint
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_cash_disabled_check" CHECK ("exchange_listings"."allow_cash" = false);--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_quantities_positive_check" CHECK ("exchanges"."offered_quantity" >= 1 and "exchanges"."requested_quantity" >= 1);
--> statement-breakpoint
-- Paused posts remain visible to their owner only.
DROP POLICY IF EXISTS "exchange_listings_public_read" ON "exchange_listings";
--> statement-breakpoint
CREATE POLICY "exchange_listings_public_read" ON "exchange_listings" FOR SELECT USING (
  (moderation_status = 'approved' AND status = 'open') OR user_id = auth.uid()
);
--> statement-breakpoint
ALTER TABLE "exchange_offers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "exchange_offer_revisions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "direct_conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "direct_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_blocks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "exchange_offers_participant_read" ON "exchange_offers" FOR SELECT USING (
  proposer_id = auth.uid() OR recipient_id = auth.uid()
);
--> statement-breakpoint
CREATE POLICY "exchange_offer_revisions_participant_read" ON "exchange_offer_revisions" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM exchange_offers offer
    WHERE offer.id = exchange_offer_revisions.offer_id
      AND (offer.proposer_id = auth.uid() OR offer.recipient_id = auth.uid())
  )
);
--> statement-breakpoint
CREATE POLICY "direct_conversations_participant_read" ON "direct_conversations" FOR SELECT USING (
  member_a_id = auth.uid() OR member_b_id = auth.uid()
);
--> statement-breakpoint
CREATE POLICY "direct_messages_participant_read" ON "direct_messages" FOR SELECT USING (
  status = 'visible' AND EXISTS (
    SELECT 1 FROM direct_conversations conversation
    WHERE conversation.id = direct_messages.conversation_id
      AND (conversation.member_a_id = auth.uid() OR conversation.member_b_id = auth.uid())
  )
);
--> statement-breakpoint
CREATE POLICY "user_blocks_self_read" ON "user_blocks" FOR SELECT USING (
  blocker_id = auth.uid()
);
