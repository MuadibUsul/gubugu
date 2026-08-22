CREATE TYPE "public"."exchange_status" AS ENUM('draft', 'proposed', 'accepted', 'shipping', 'received', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "exchanges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"offered_goods_id" uuid NOT NULL,
	"requested_goods_id" uuid NOT NULL,
	"status" "exchange_status" DEFAULT 'draft' NOT NULL,
	"fulfillment_method" "exchange_fulfillment_method" DEFAULT 'either' NOT NULL,
	"offered_goods_snapshot" jsonb NOT NULL,
	"requested_goods_snapshot" jsonb NOT NULL,
	"initiator_condition_snapshot" jsonb NOT NULL,
	"recipient_condition_snapshot" jsonb,
	"note" text,
	"proposed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchanges_distinct_users_check" CHECK ("exchanges"."initiator_id" <> "exchanges"."recipient_id"),
	CONSTRAINT "exchanges_distinct_goods_check" CHECK ("exchanges"."offered_goods_id" <> "exchanges"."requested_goods_id")
);
--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_offered_goods_id_goods_id_fk" FOREIGN KEY ("offered_goods_id") REFERENCES "public"."goods"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_requested_goods_id_goods_id_fk" FOREIGN KEY ("requested_goods_id") REFERENCES "public"."goods"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "exchanges_initiator_id_idx" ON "exchanges" USING btree ("initiator_id");--> statement-breakpoint
CREATE INDEX "exchanges_recipient_id_idx" ON "exchanges" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "exchanges_status_idx" ON "exchanges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exchanges_offered_goods_id_idx" ON "exchanges" USING btree ("offered_goods_id");--> statement-breakpoint
CREATE INDEX "exchanges_requested_goods_id_idx" ON "exchanges" USING btree ("requested_goods_id");
--> statement-breakpoint
ALTER TABLE "exchanges" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "exchanges_participant_read" ON "exchanges" FOR SELECT
  USING (initiator_id = auth.uid() OR recipient_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "exchanges_initiator_insert" ON "exchanges" FOR INSERT
  WITH CHECK (initiator_id = auth.uid());
